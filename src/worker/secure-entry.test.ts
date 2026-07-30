import test from "node:test";
import assert from "node:assert/strict";
import secureWorker, { type Env } from "./secure-entry.ts";

function createEnv(): Env {
  return {
    GEMINI_API_KEY: "test-key",
    PROVIDER_PREFLIGHT_TOKEN: "strong-ci-token",
    ALLOWED_ORIGINS: "https://zana.krd",
    FIREBASE_PROJECT_ID: "zana-official",
    GEMINI_PRIMARY_MODEL: "gemini-2.5-flash",
    GEMINI_VISION_MODEL: "gemini-2.5-flash",
  };
}

test("secure preflight hides route when authorization is missing", async () => {
  const response = await secureWorker.fetch(
    new Request("https://zana-api-worker.zana-platform.workers.dev/api/provider/preflight"),
    createEnv()
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Not Found" });
});

test("secure preflight rejects an invalid bearer token", async () => {
  const response = await secureWorker.fetch(
    new Request("https://zana-api-worker.zana-platform.workers.dev/api/provider/preflight", {
      headers: { Authorization: "Bearer invalid-token" },
    }),
    createEnv()
  );

  assert.equal(response.status, 404);
});

test("secure preflight accepts GET only", async () => {
  const response = await secureWorker.fetch(
    new Request("https://zana-api-worker.zana-platform.workers.dev/api/provider/preflight", {
      method: "POST",
      headers: { Authorization: "Bearer strong-ci-token" },
    }),
    createEnv()
  );

  assert.equal(response.status, 404);
});
