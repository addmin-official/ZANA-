process.env.NODE_ENV = "test";
process.env.ZANA_ENV = "test";
import { test } from "node:test";
import assert from "node:assert";
import worker from "./index.ts";

// Helper to create a mock Env
const createMockEnv = (assetsMock?: any) => ({
  GEMINI_API_KEY: "test-api-key",
  ALLOWED_ORIGINS: "https://zana-app.web.app",
  ASSETS: assetsMock,
});

test("Worker - GET /api/health with approved Origin returns 200 and exact CORS origin", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/health", {
    method: "GET",
    headers: {
      Origin: "https://zana-app.web.app"
    }
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get("content-type"), "application/json");
  assert.strictEqual(res.headers.get("location"), null); // zero redirects
  assert.strictEqual(res.headers.get("access-control-allow-origin"), "https://zana-app.web.app");

  const body = await res.json() as any;
  assert.strictEqual(body.ok, true);
  assert.strictEqual(body.status, "ok");
  assert.strictEqual(body.service, "zana-api-worker");
});

test("Worker - GET /api/health without Origin header returns 200 without CORS header", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/health", {
    method: "GET"
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get("access-control-allow-origin"), null);
  const body = await res.json() as any;
  assert.strictEqual(body.ok, true);
});

test("Worker - GET /api/health with unapproved Origin returns 200 health without CORS header", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/health", {
    method: "GET",
    headers: {
      Origin: "https://unauthorized.example"
    }
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get("access-control-allow-origin"), null);
  const body = await res.json() as any;
  assert.strictEqual(body.ok, true);
});

test("Worker - GET /api/health is unaffected by missing GEMINI_API_KEY, JWT_SECRET, or KV", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/health", {
    method: "GET"
  });

  // Empty env without GEMINI_API_KEY, JWT_SECRET, or KV bindings
  const emptyEnv: any = {
    ALLOWED_ORIGINS: "https://zana-app.web.app"
  };

  const res = await worker.fetch(req, emptyEnv);

  assert.strictEqual(res.status, 200);
  const body = await res.json() as any;
  assert.strictEqual(body.ok, true);
});

test("Worker - GET /api/health/ with trailing slash normalizes to /api/health and returns 200", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/health/", {
    method: "GET",
    headers: {
      Origin: "https://zana-app.web.app"
    }
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get("location"), null);
  const body = await res.json() as any;
  assert.strictEqual(body.ok, true);
});

test("Worker - Protected API route rejects unapproved Origin with 403", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/chat", {
    method: "POST",
    headers: {
      Origin: "https://unauthorized.example",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message: "hello" })
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 403);
  const body = await res.json() as any;
  assert.strictEqual(body.error, "Disallowed Origin");
});

test("Worker - Protected API route allows approved Origin", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/chat", {
    method: "POST",
    headers: {
      Origin: "https://zana-app.web.app",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({}) // Invalid payload triggers 400 validation error, confirming origin check passed
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.headers.get("access-control-allow-origin"), "https://zana-app.web.app");
  assert.notStrictEqual(res.status, 403);
});

test("Worker - GET /api/health is not captured by SPA fallback", async () => {
  // Even if ASSETS are defined and would normally serve pages, /api/health returns direct JSON
  const mockAssets = {
    fetch: async () => new Response("index html file content", { status: 200 })
  };

  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/health", {
    method: "GET",
    headers: {
      Origin: "https://zana-app.web.app"
    }
  });

  const env = createMockEnv(mockAssets);
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 200);
  const body = await res.json() as any;
  assert.strictEqual(body.ok, true);
  assert.notStrictEqual(body, "index html file content");
});

test("Worker - unknown /api route returns JSON 404", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/unknown-route-xyz", {
    method: "GET",
    headers: {
      Origin: "https://zana-app.web.app"
    }
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.headers.get("content-type"), "application/json");
  const body = await res.json() as any;
  assert.ok(body.error);
});

test("Worker - missing static asset returns real 404", async () => {
  const mockAssets = {
    fetch: async () => new Response("Not Found", { status: 404 })
  };

  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/assets/nonexistent-file.css", {
    method: "GET",
    headers: {
      Origin: "https://zana-app.web.app"
    }
  });

  const env = createMockEnv(mockAssets);
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 404);
  const body = await res.json() as any;
  assert.ok(body.error); // returns JSON 404 instead of SPA html
});

test("Worker - SPA fallback works for paths without extensions", async () => {
  const mockAssets = {
    fetch: async (r: Request) => {
      const u = new URL(r.url);
      if (u.pathname === "/index.html") {
        return new Response("SPA Entrypoint HTML", { status: 200 });
      }
      return new Response("Not Found", { status: 404 });
    }
  };

  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/some-app-route", {
    method: "GET",
    headers: {
      Origin: "https://zana-app.web.app"
    }
  });

  const env = createMockEnv(mockAssets);
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 200);
  const body = await res.text();
  assert.strictEqual(body, "SPA Entrypoint HTML");
});

test("Worker - Canonical URL / slash normalization is correct", async () => {
  // Test double slashes are normalized inside worker
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev//api//health", {
    method: "GET",
    headers: {
      Origin: "https://zana-app.web.app"
    }
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 200);
  const body = await res.json() as any;
  assert.strictEqual(body.ok, true);
});

test("CI Utility - HTTP production URL is rejected", () => {
  // Verify that HTTP production URLs are rejected
  const validateUrl = (url: string) => {
    if (!url) throw new Error("API Base URL is empty");
    if (!url.startsWith("https://")) throw new Error("API Base URL must use HTTPS");
    if (url.endsWith("/")) throw new Error("API Base URL must not have a trailing slash");
    if (url.includes("/api")) throw new Error("API Base URL must be the domain origin");
    return true;
  };

  assert.strictEqual(validateUrl("https://zana-api-worker.zana-platform.workers.dev"), true);
  assert.throws(() => validateUrl("http://zana-api-worker.zana-platform.workers.dev"), /must use HTTPS/);
  assert.throws(() => validateUrl("https://zana-api-worker.zana-platform.workers.dev/"), /must not have a trailing slash/);
  assert.throws(() => validateUrl("https://zana-api-worker.zana-platform.workers.dev/api/health"), /must be the domain origin/);
  assert.throws(() => validateUrl(""), /URL is empty/);
});
