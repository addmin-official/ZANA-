process.env.NODE_ENV = "test";
process.env.ZANA_ENV = "test";
import { test } from "node:test";
import assert from "node:assert";
import worker, { classifyError, getClientSafeErrorMessage, Env } from "./index.ts";

interface ApiJsonResponse {
  ok?: boolean;
  status?: string;
  service?: string;
  error?: string;
  stack?: string;
  apiKey?: string;
}

interface HealthResponse {
  ok: boolean;
  status: string;
  service: string;
  revision: string;
}

// Helper to create a mock Env
const createMockEnv = (assetsMock?: { fetch: (req: Request) => Promise<Response> }): Env => ({
  GEMINI_API_KEY: "test-api-key",
  ALLOWED_ORIGINS: "https://zana.krd",
  FIREBASE_PROJECT_ID: "gen-lang-client-0009572581",
  ASSETS: assetsMock,
});

test("Worker - GET /api/health with approved Origin returns 200 and exact CORS origin", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/health", {
    method: "GET",
    headers: {
      Origin: "https://zana.krd",
    },
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get("content-type"), "application/json");
  assert.strictEqual(res.headers.get("location"), null); // zero redirects
  assert.strictEqual(res.headers.get("access-control-allow-origin"), "https://zana.krd");

  const body = (await res.json()) as ApiJsonResponse;
  assert.strictEqual(body.ok, true);
  assert.strictEqual(body.status, "ok");
  assert.strictEqual(body.service, "zana-api-worker");
});

test("Worker - GET /api/health meets strict health contract", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/health", {
    method: "GET",
  });

  const env = createMockEnv();
  env.ZANA_REVISION = "a1b2c3d";
  const res = await worker.fetch(req, env);
  
  assert.strictEqual(res.status, 200);
  const body = (await res.json()) as HealthResponse & Record<string, unknown>;
  
  assert.strictEqual(body.ok, true);
  assert.strictEqual(body.status, "ok");
  assert.strictEqual(body.service, "zana-api-worker");
  assert.strictEqual(/^[0-9a-f]{7}$/.test(body.revision), true);
  
  // Verify no sensitive fields leak
  assert.strictEqual(body.apiKey, undefined);
  assert.strictEqual(body.token, undefined);
  assert.strictEqual(body.model, undefined);
  assert.strictEqual(body.pathname, undefined);
  assert.strictEqual(body.upstreamDiagnostic, undefined);
});

test("Worker - GET /api/provider/preflight with POST returns 405", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/provider/preflight", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-token",
    }
  });

  const env = createMockEnv();
  env.PROVIDER_PREFLIGHT_TOKEN = "test-token";
  const res = await worker.fetch(req, env);
  assert.strictEqual(res.status, 405);
});

test("Worker - GET /api/provider/preflight without token returns 401", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/provider/preflight", {
    method: "GET",
  });

  const env = createMockEnv();
  env.PROVIDER_PREFLIGHT_TOKEN = "test-token";
  const res = await worker.fetch(req, env);
  assert.strictEqual(res.status, 401);
  const body = (await res.json()) as Record<string, unknown>;
  assert.strictEqual(body.ok, false);
  assert.strictEqual(body.error, "Unauthorized");
});

test("Worker - GET /api/provider/preflight with malformed Bearer header returns 401", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/provider/preflight", {
    method: "GET",
    headers: {
      Authorization: "Basic invalid-token",
    }
  });

  const env = createMockEnv();
  env.PROVIDER_PREFLIGHT_TOKEN = "test-token";
  const res = await worker.fetch(req, env);
  assert.strictEqual(res.status, 401);
  const body = (await res.json()) as Record<string, unknown>;
  assert.strictEqual(body.ok, false);
  assert.strictEqual(body.error, "Unauthorized");
});

test("Worker - GET /api/provider/preflight with wrong token returns 401", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/provider/preflight", {
    method: "GET",
    headers: {
      Authorization: "Bearer invalid-token",
    }
  });

  const env = createMockEnv();
  env.PROVIDER_PREFLIGHT_TOKEN = "test-token";
  const res = await worker.fetch(req, env);
  assert.strictEqual(res.status, 401);
  const body = (await res.json()) as Record<string, unknown>;
  assert.strictEqual(body.ok, false);
  assert.strictEqual(body.error, "Unauthorized");
});

test("Worker - GET /api/provider/preflight with valid token but no API KEY returns 503", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/provider/preflight", {
    method: "GET",
    headers: {
      Authorization: "Bearer test-token",
    }
  });

  const env = createMockEnv();
  env.PROVIDER_PREFLIGHT_TOKEN = "test-token";
  env.GEMINI_API_KEY = "";
  const res = await worker.fetch(req, env);
  assert.strictEqual(res.status, 503);
  const body = (await res.json()) as Record<string, unknown>;
  assert.strictEqual(body.ok, false);
  assert.strictEqual(body.error, "GEMINI_API_KEY missing");
});

// Since we cannot easily mock ProviderAdapter.generate in this test environment natively without setup, we will just ensure it reaches the provider by testing the error response when API_KEY is invalid/dummy.
test("Worker - GET /api/provider/preflight with valid token returns sanitized 503 on provider error", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/provider/preflight", {
    method: "GET",
    headers: {
      Authorization: "Bearer test-token",
    }
  });

  const env = createMockEnv();
  env.PROVIDER_PREFLIGHT_TOKEN = "test-token";
  env.GEMINI_API_KEY = "dummy";
  const res = await worker.fetch(req, env);
  assert.strictEqual(res.status, 503);
  const body = (await res.json()) as Record<string, unknown>;
  assert.strictEqual(body.ok, false);
  assert.strictEqual(body.error, "Provider preflight check failed");
  assert.strictEqual(body.category, undefined); // Should not expose internal details
  // Ensure no secret leakage in response
  assert.strictEqual(body.apiKey, undefined);
  assert.strictEqual(body.token, undefined);
});
test("Worker - GET /api/health without Origin header returns 200 without CORS header", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/health", {
    method: "GET",
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get("access-control-allow-origin"), null);
  const body = (await res.json()) as ApiJsonResponse;
  assert.strictEqual(body.ok, true);
});

test("Worker - GET /api/health with unapproved Origin returns 200 health without CORS header", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/health", {
    method: "GET",
    headers: {
      Origin: "https://unauthorized.example",
    },
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get("access-control-allow-origin"), null);
  const body = (await res.json()) as ApiJsonResponse;
  assert.strictEqual(body.ok, true);
});

test("Worker - GET /api/health rejects denied Firebase Hosting and localhost origins without CORS header", async () => {
  const env = createMockEnv();
  const deniedOrigins = [
    "https://zana-app.web.app",
    "https://zana-official.web.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];

  for (const origin of deniedOrigins) {
    const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/health", {
      method: "GET",
      headers: { Origin: origin },
    });
    const res = await worker.fetch(req, env);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get("access-control-allow-origin"), null);
    assert.notStrictEqual(res.headers.get("access-control-allow-origin"), "*");
  }
});

test("Worker - GET /api/health is unaffected by missing GEMINI_API_KEY, JWT_SECRET, or KV", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/health", {
    method: "GET",
  });

  // Empty env without GEMINI_API_KEY, JWT_SECRET, or KV bindings
  const emptyEnv: Env = {
    GEMINI_API_KEY: "",
    ALLOWED_ORIGINS: "https://zana.krd",
    FIREBASE_PROJECT_ID: "gen-lang-client-0009572581",
  };

  const res = await worker.fetch(req, emptyEnv);

  assert.strictEqual(res.status, 200);
  const body = (await res.json()) as ApiJsonResponse;
  assert.strictEqual(body.ok, true);
});

test("Worker - GET /api/health/ with trailing slash normalizes to /api/health and returns 200", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/health/", {
    method: "GET",
    headers: {
      Origin: "https://zana.krd",
    },
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get("location"), null);
  const body = (await res.json()) as ApiJsonResponse;
  assert.strictEqual(body.ok, true);
});

test("Worker - Protected API route rejects unapproved Origin with 403", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/chat", {
    method: "POST",
    headers: {
      Origin: "https://unauthorized.example",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: "hello" }),
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 403);
  const body = (await res.json()) as ApiJsonResponse;
  assert.strictEqual(body.error, "Disallowed Origin");
});

test("Worker - Protected API route rejects denied Firebase Hosting and localhost origins with 403", async () => {
  const env = createMockEnv();
  const deniedOrigins = [
    "https://zana-app.web.app",
    "https://zana-official.web.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];

  for (const origin of deniedOrigins) {
    const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/chat", {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "hello" }),
    });

    const res = await worker.fetch(req, env);
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.headers.get("access-control-allow-origin"), null);
    assert.notStrictEqual(res.headers.get("access-control-allow-origin"), "*");
    const body = (await res.json()) as ApiJsonResponse;
    assert.strictEqual(body.error, "Disallowed Origin");
  }
});

test("Worker - Protected API route allows approved Origin", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/chat", {
    method: "POST",
    headers: {
      Origin: "https://zana.krd",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}), // Invalid payload triggers 400 validation error, confirming origin check passed
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.headers.get("access-control-allow-origin"), "https://zana.krd");
  assert.notStrictEqual(res.status, 403);
});

test("Worker - GET /api/health is not captured by SPA fallback", async () => {
  // Even if ASSETS are defined and would normally serve pages, /api/health returns direct JSON
  const mockAssets = {
    fetch: async () => new Response("index html file content", { status: 200 }),
  };

  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/health", {
    method: "GET",
    headers: {
      Origin: "https://zana.krd",
    },
  });

  const env = createMockEnv(mockAssets);
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 200);
  const body = (await res.json()) as ApiJsonResponse;
  assert.strictEqual(body.ok, true);
  assert.notStrictEqual(body, "index html file content");
});

test("Worker - unknown /api route returns JSON 404", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/unknown-route-xyz", {
    method: "GET",
    headers: {
      Origin: "https://zana.krd",
    },
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.headers.get("content-type"), "application/json");
  const body = (await res.json()) as ApiJsonResponse;
  assert.ok(body.error);
});

test("Worker - missing static asset returns real 404", async () => {
  const mockAssets = {
    fetch: async () => new Response("Not Found", { status: 404 }),
  };

  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/assets/nonexistent-file.css", {
    method: "GET",
    headers: {
      Origin: "https://zana.krd",
    },
  });

  const env = createMockEnv(mockAssets);
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 404);
  const body = (await res.json()) as ApiJsonResponse;
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
    },
  };

  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/some-app-route", {
    method: "GET",
    headers: {
      Origin: "https://zana.krd",
    },
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
      Origin: "https://zana.krd",
    },
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 200);
  const body = (await res.json()) as ApiJsonResponse;
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

test("Worker - missing GEMINI_API_KEY on AI endpoint returns safe Kurdish error and 500", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/chat", {
    method: "POST",
    headers: {
      Origin: "https://zana.krd",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "پرسیارم هەیە",
      profile: { name: "Amed", grade: "9", activeSubject: "math", level: "سەرەتا" },
    }),
  });

  const envWithoutKey: Env = {
    ALLOWED_ORIGINS: "https://zana.krd",
    FIREBASE_PROJECT_ID: "gen-lang-client-0009572581",
    GEMINI_API_KEY: "",
  };

  const res = await worker.fetch(req, envWithoutKey);
  assert.strictEqual(res.status, 500);
  const body = (await res.json()) as ApiJsonResponse;
  assert.strictEqual(body.error, "خزمەتگوزارییەکە لە ئێستادا بەردەست نییە. تکایە دواتر هەوڵ بدەرەوە.");
  // Ensure no secret text or stack trace is exposed
  assert.strictEqual(body.stack, undefined);
  assert.strictEqual(body.apiKey, undefined);
});

test("Worker - missing payload on /api/chat returns 400 with correct Kurdish spelling (کەموکوڕی)", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/chat", {
    method: "POST",
    headers: {
      Origin: "https://zana.krd",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: "Hello" }), // Missing profile
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 400);
  const body = (await res.json()) as ApiJsonResponse;
  assert.strictEqual(body.error, "داواکارییەکە کەموکوڕی تێدایە.");
});

test("Worker - missing payload on /api/study/ask returns 400 with correct Kurdish spelling (کەموکوڕی)", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/study/ask", {
    method: "POST",
    headers: {
      Origin: "https://zana.krd",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: "Hello" }), // Missing context
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 400);
  const body = (await res.json()) as ApiJsonResponse;
  assert.strictEqual(body.error, "داواکارییەکە کەموکوڕی تێدایە.");
});

test("Worker - missing payload on /api/report returns 400 without calling AI service", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/report", {
    method: "POST",
    headers: {
      Origin: "https://zana.krd",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}), // Missing profile
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 400);
  const body = (await res.json()) as ApiJsonResponse;
  assert.ok(body.error && (body.error.includes("پڕۆفایلی قوتابی") || body.error.includes("زانیارییەکان تەواو نین")));
});

test("Worker - validateImageSignature handles Uint8Array correctly for JPEG, PNG, WebP", async () => {
  const { validateImageSignature } = await import("../server/security/imageSignature.ts");

  const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  assert.strictEqual(validateImageSignature(jpegBytes, "image/jpeg"), true);
  assert.strictEqual(validateImageSignature(jpegBytes, "image/jpg"), true);

  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.strictEqual(validateImageSignature(pngBytes, "image/png"), true);

  const webpBytes = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x00, 0x00, 0x00, 0x00,
    0x57, 0x45, 0x42, 0x50, // WEBP
  ]);
  assert.strictEqual(validateImageSignature(webpBytes, "image/webp"), true);

  const invalidBytes = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
  assert.strictEqual(validateImageSignature(invalidBytes, "image/png"), false);
});

test("Worker - error classification mapping for 401, 403, 404, 429, 500, timeout, unsupported parameter", () => {
  assert.strictEqual(classifyError(new Error("GEMINI_API_KEY missing")), "missing_credentials");
  assert.strictEqual(classifyError(new Error("HTTP 401 Unauthorized")), "invalid_credentials");
  assert.strictEqual(classifyError(new Error("HTTP 403 Forbidden")), "permission_denied");
  assert.strictEqual(classifyError(new Error("HTTP 404 Model Not Found")), "model_not_found");
  assert.strictEqual(classifyError(new Error("HTTP 429 Quota Exceeded")), "quota_exceeded");
  assert.strictEqual(classifyError(new Error("HTTP 429 Rate Limit")), "rate_limited");
  assert.strictEqual(classifyError(new Error("HTTP 400 Invalid Request")), "invalid_provider_request");
  assert.strictEqual(classifyError(new Error("HTTP 400 Unsupported parameter temperature")), "invalid_provider_request");
  assert.strictEqual(classifyError(new Error("Invalid JSON response")), "invalid_provider_response");
  assert.strictEqual(classifyError(new Error("HTTP 500 Internal Server Error")), "provider_unavailable");
  assert.strictEqual(classifyError(new Error("Connection timeout ETIMEDOUT")), "timeout");

  assert.strictEqual(getClientSafeErrorMessage("missing_credentials"), "خزمەتگوزارییەکە لە ئێستادا بەردەست نییە. تکایە دواتر هەوڵ بدەرەوە.");
  assert.strictEqual(getClientSafeErrorMessage("invalid_credentials"), "خزمەتگوزارییەکە لە ئێستادا بەردەست نییە. تکایە دواتر هەوڵ بدەرەوە.");
  assert.strictEqual(getClientSafeErrorMessage("permission_denied"), "خزمەتگوزارییەکە لە ئێستادا بەردەست نییە. تکایە دواتر هەوڵ بدەرەوە.");
  assert.strictEqual(getClientSafeErrorMessage("model_not_found"), "خزمەتگوزارییەکە لە ئێستادا بەردەست نییە. تکایە دواتر هەوڵ بدەرەوە.");
  assert.strictEqual(getClientSafeErrorMessage("quota_exceeded"), "خزمەتگوزارییەکە لە ئێستادا بەردەست نییە. تکایە دواتر هەوڵ بدەرەوە.");
  assert.strictEqual(getClientSafeErrorMessage("provider_unavailable"), "خزمەتگوزارییەکە لە ئێستادا بەردەست نییە. تکایە دواتر هەوڵ بدەرەوە.");
  assert.strictEqual(getClientSafeErrorMessage("timeout"), "کاتەکە تەواو بوو. تکایە دووبارە هەوڵبدەرەوە.");
  assert.strictEqual(getClientSafeErrorMessage("upload_too_large"), "قەبارەی وێنەکە زۆر گەورەیە؛ تکایە وێنەیەک کەمتر لە ٥ مێگابایت هەڵبژێرە.");
  assert.strictEqual(getClientSafeErrorMessage("unsupported_file"), "جۆری ئەم فایلە پشتگیری ناکرێت. تەنها JPG، PNG و WebP بەکاربهێنە.");
});

test("Centralized model normalization & prefix stripping", async () => {
  const { normalizeModel, getPrimaryModel, getVisionModel, AI_CONFIG } = await import("../server/config/aiModels.ts");

  // AI_CONFIG schema compliance
  assert.strictEqual(AI_CONFIG.primaryModel, "gemini-2.5-flash");
  assert.strictEqual(AI_CONFIG.visionModel, "gemini-2.5-flash");
  assert.strictEqual(AI_CONFIG.apiBaseUrl, "https://generativelanguage.googleapis.com");
  assert.strictEqual(AI_CONFIG.timeoutMs, 30000);
  assert.strictEqual(AI_CONFIG.retryPolicy.maxRetries, 2);
  assert.deepStrictEqual(AI_CONFIG.retryPolicy.retryableStatusCodes, [429, 500, 502, 503, 504]);

  // Model normalization
  const canonicalModel = AI_CONFIG.primaryModel;
  assert.strictEqual(normalizeModel(canonicalModel), canonicalModel);
  assert.strictEqual(normalizeModel(`models/${canonicalModel}`), canonicalModel);
  assert.strictEqual(normalizeModel(`models/models/${canonicalModel}`), canonicalModel);
  assert.strictEqual(normalizeModel(`gemini/${canonicalModel}`), canonicalModel);
  assert.strictEqual(normalizeModel(""), canonicalModel);
  assert.strictEqual(normalizeModel(null), canonicalModel);
  assert.strictEqual(normalizeModel(undefined), canonicalModel);

  // Default fallback
  assert.strictEqual(getPrimaryModel(), canonicalModel);
  assert.strictEqual(getVisionModel(), AI_CONFIG.visionModel);

  // Worker Env override with models/ prefix
  assert.strictEqual(getPrimaryModel({ GEMINI_PRIMARY_MODEL: "models/custom-worker-primary" }), "custom-worker-primary");
  assert.strictEqual(getVisionModel({ GEMINI_VISION_MODEL: "models/custom-worker-vision" }), "custom-worker-vision");

  // Node process.env override
  process.env.GEMINI_PRIMARY_MODEL = "models/custom-node-primary";
  process.env.GEMINI_VISION_MODEL = "models/custom-node-vision";
  assert.strictEqual(getPrimaryModel(), "custom-node-primary");
  assert.strictEqual(getVisionModel(), "custom-node-vision");

  // Invalid model override rejection
  assert.throws(() => normalizeModel("invalid model name!"), /Invalid model name override format/);

  delete process.env.GEMINI_PRIMARY_MODEL;
  delete process.env.GEMINI_VISION_MODEL;
});

test("Worker - Provider error classification for 401, 404, 429, 400, 500, missing key", () => {
  assert.strictEqual(classifyError(new Error("GEMINI_API_KEY missing")), "missing_credentials");
  assert.strictEqual(classifyError(new Error("API key not valid. Please pass a valid API key.")), "invalid_credentials");
  assert.strictEqual(classifyError(new Error("HTTP 401 Unauthorized")), "invalid_credentials");
  assert.strictEqual(classifyError(new Error("HTTP 404 Model Not Found")), "model_not_found");
  assert.strictEqual(classifyError(new Error("RESOURCE_EXHAUSTED: 429 Quota Exceeded")), "quota_exceeded");
  assert.strictEqual(classifyError(new Error("HTTP 429 Rate Limit")), "rate_limited");
  assert.strictEqual(classifyError(new Error("INVALID_ARGUMENT: 400 Invalid Request")), "invalid_provider_request");
  assert.strictEqual(classifyError(new Error("HTTP 500 Internal Server Error")), "provider_unavailable");
});

test("Worker - No API key or prompt leakage on error responses", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/chat", {
    method: "POST",
    headers: {
      Origin: "https://zana.krd",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "SECRET_USER_PROMPT_STRING_FOR_TEST",
      profile: { name: "Amed", grade: "9", activeSubject: "math", level: "سەرەتا" },
    }),
  });

  const envWithSecretKey: Env = {
    ALLOWED_ORIGINS: "https://zana.krd",
    FIREBASE_PROJECT_ID: "gen-lang-client-0009572581",
    GEMINI_API_KEY: "secret_api_key_123456789_do_not_leak",
  };

  const res = await worker.fetch(req, envWithSecretKey);
  const bodyText = await res.text();

  assert.doesNotMatch(bodyText, /secret_api_key_123456789_do_not_leak/);
  assert.doesNotMatch(bodyText, /SECRET_USER_PROMPT_STRING_FOR_TEST/);
  assert.doesNotMatch(bodyText, /You are ZANA/);
});
