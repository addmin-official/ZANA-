import worker, { type Env as BaseEnv } from "./index.ts";

export interface Env extends BaseEnv {
  PROVIDER_PREFLIGHT_TOKEN: string;
}

const preflightAttempts = new Map<string, number[]>();
const PREFLIGHT_LIMIT = 5;
const PREFLIGHT_WINDOW_MS = 60_000;

function clientKey(request: Request): string {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

function isPreflightRateLimited(request: Request): boolean {
  const key = clientKey(request);
  const now = Date.now();
  const recent = (preflightAttempts.get(key) || []).filter((timestamp) => now - timestamp < PREFLIGHT_WINDOW_MS);
  if (recent.length >= PREFLIGHT_LIMIT) {
    preflightAttempts.set(key, recent);
    return true;
  }
  recent.push(now);
  preflightAttempts.set(key, recent);
  return false;
}

async function digest(value: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(value);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
}

async function timingSafeEqual(left: string, right: string): Promise<boolean> {
  const [leftDigest, rightDigest] = await Promise.all([digest(left), digest(right)]);
  if (leftDigest.length !== rightDigest.length) return false;

  let difference = 0;
  for (let index = 0; index < leftDigest.length; index += 1) {
    difference |= leftDigest[index] ^ rightDigest[index];
  }
  return difference === 0;
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

async function handleProviderPreflight(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Not Found" }, 404);
  }

  if (isPreflightRateLimited(request)) {
    return jsonResponse({ error: "Too Many Requests" }, 429);
  }

  const expectedToken = env.PROVIDER_PREFLIGHT_TOKEN?.trim();
  const authorization = request.headers.get("Authorization") || "";
  const providedToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

  if (!expectedToken || !providedToken || !(await timingSafeEqual(providedToken, expectedToken))) {
    return jsonResponse({ error: "Not Found" }, 404);
  }

  const upstreamResponse = await worker.fetch(request, env);
  if (upstreamResponse.status === 200) {
    return jsonResponse({ ok: true, status: "healthy" }, 200);
  }

  return jsonResponse({ ok: false, status: "unavailable" }, 503);
}

export default {
  async fetch(request: Request, env: Env, ctx?: unknown): Promise<Response> {
    const pathname = new URL(request.url).pathname.replace(/\/+$/g, "") || "/";
    if (pathname === "/api/provider/preflight") {
      return handleProviderPreflight(request, env);
    }
    return worker.fetch(request, env, ctx);
  },
};
