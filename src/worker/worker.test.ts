process.env.NODE_ENV = "test";
process.env.ZANA_ENV = "test";
import { test } from "node:test";
import assert from "node:assert";
import worker, { classifyError, getClientSafeErrorMessage } from "./index.ts";

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

test("Worker - missing GEMINI_API_KEY on AI endpoint returns safe Kurdish error and 500", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/chat", {
    method: "POST",
    headers: {
      Origin: "https://zana-app.web.app",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "پرسیارم هەیە",
      profile: { name: "Amed", grade: "9", activeSubject: "math", level: "سەرەتا" }
    })
  });

  const envWithoutKey: any = {
    ALLOWED_ORIGINS: "https://zana-app.web.app",
    GEMINI_API_KEY: ""
  };

  const res = await worker.fetch(req, envWithoutKey);
  assert.strictEqual(res.status, 500);
  const body = await res.json() as any;
  assert.strictEqual(body.error, "خزمەتگوزارییەکە لە ئێستادا بەردەست نییە. تکایە دواتر هەوڵ بدەرەوە.");
  // Ensure no secret text or stack trace is exposed
  assert.strictEqual(body.stack, undefined);
  assert.strictEqual(body.apiKey, undefined);
});

test("Worker - missing payload on /api/chat returns 400 with correct Kurdish spelling (کەموکوڕی)", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/chat", {
    method: "POST",
    headers: {
      Origin: "https://zana-app.web.app",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message: "Hello" }) // Missing profile
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 400);
  const body = await res.json() as any;
  assert.strictEqual(body.error, "داواکارییەکە کەموکوڕی تێدایە.");
});

test("Worker - missing payload on /api/study/ask returns 400 with correct Kurdish spelling (کەموکوڕی)", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/study/ask", {
    method: "POST",
    headers: {
      Origin: "https://zana-app.web.app",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message: "Hello" }) // Missing context
  });

  const env = createMockEnv();
  const res = await worker.fetch(req, env);

  assert.strictEqual(res.status, 400);
  const body = await res.json() as any;
  assert.strictEqual(body.error, "داواکارییەکە کەموکوڕی تێدایە.");
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

test("Centralized model resolution & AI_CONFIG schema", async () => {
  const { getPrimaryModel, getVisionModel, AI_CONFIG } = await import("../server/config/aiModels.ts");

  // AI_CONFIG schema compliance
  assert.strictEqual(AI_CONFIG.primaryModel, "gemini-3.6-flash");
  assert.strictEqual(AI_CONFIG.visionModel, "gemini-3.6-flash");
  assert.strictEqual(AI_CONFIG.apiBaseUrl, "https://generativelanguage.googleapis.com");
  assert.strictEqual(AI_CONFIG.timeoutMs, 30000);
  assert.strictEqual(AI_CONFIG.maxRetries, 2);
  assert.deepStrictEqual(AI_CONFIG.retryableStatusCodes, [429, 500, 502, 503, 504]);

  // Default fallback
  assert.strictEqual(getPrimaryModel(), "gemini-3.6-flash");
  assert.strictEqual(getVisionModel(), "gemini-3.6-flash");

  // Worker Env override
  assert.strictEqual(getPrimaryModel({ GEMINI_PRIMARY_MODEL: "custom-worker-primary" }), "custom-worker-primary");
  assert.strictEqual(getVisionModel({ GEMINI_VISION_MODEL: "custom-worker-vision" }), "custom-worker-vision");

  // Node process.env override
  process.env.GEMINI_PRIMARY_MODEL = "custom-node-primary";
  process.env.GEMINI_VISION_MODEL = "custom-node-vision";
  assert.strictEqual(getPrimaryModel(), "custom-node-primary");
  assert.strictEqual(getVisionModel(), "custom-node-vision");

  delete process.env.GEMINI_PRIMARY_MODEL;
  delete process.env.GEMINI_VISION_MODEL;
});

test("Worker - No API key or prompt leakage on error responses", async () => {
  const req = new Request("https://zana-api-worker.zana-platform.workers.dev/api/chat", {
    method: "POST",
    headers: {
      Origin: "https://zana-app.web.app",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "SECRET_USER_PROMPT_STRING_FOR_TEST",
      profile: { name: "Amed", grade: "9", activeSubject: "math", level: "سەرەتا" }
    })
  });

  const envWithSecretKey: any = {
    ALLOWED_ORIGINS: "https://zana-app.web.app",
    GEMINI_API_KEY: "secret_api_key_123456789_do_not_leak"
  };

  const res = await worker.fetch(req, envWithSecretKey);
  const bodyText = await res.text();

  assert.doesNotMatch(bodyText, /secret_api_key_123456789_do_not_leak/);
  assert.doesNotMatch(bodyText, /SECRET_USER_PROMPT_STRING_FOR_TEST/);
  assert.doesNotMatch(bodyText, /You are ZANA/);
});

