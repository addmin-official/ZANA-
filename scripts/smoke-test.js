const baseUrl = (process.env.API_BASE_URL || "").replace(/\/$/, "");
const corsOrigin = (process.env.CORS_TEST_ORIGIN || baseUrl).replace(/\/$/, "");
const attempts = Number.parseInt(process.env.SMOKE_TEST_ATTEMPTS || "6", 10);
const retryDelayMs = Number.parseInt(process.env.SMOKE_TEST_RETRY_DELAY_MS || "5000", 10);

if (!baseUrl) {
  console.error("::error::API_BASE_URL is required for production smoke tests.");
  process.exit(1);
}

const sleep = (durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs));

async function fetchWithRetry(path, init = {}) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
        ...init,
      });

      if (response.status < 500) {
        return response;
      }

      lastError = new Error(`${path} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < attempts) {
      console.log(`Attempt ${attempt}/${attempts} for ${path} was not ready; retrying.`);
      await sleep(retryDelayMs);
    }
  }

  throw lastError || new Error(`${path} did not respond`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectFrontend(path) {
  const response = await fetchWithRetry(path);
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();

  assert(response.status === 200, `${path} returned ${response.status}; expected 200`);
  assert(contentType.includes("text/html"), `${path} did not return HTML`);
  assert(/<div[^>]+id=["']root["']/.test(body), `${path} did not return the ZANA application shell`);
  assert(!body.toLowerCase().includes("internal server error"), `${path} contains a server error response`);
  console.log(`PASS frontend ${path}`);
}

async function expectHealth() {
  const response = await fetchWithRetry("/api/health", {
    headers: { Origin: corsOrigin },
  });
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();

  assert(response.status === 200, `/api/health returned ${response.status}; expected 200`);
  assert(contentType.includes("application/json"), "/api/health did not return JSON");
  const payload = JSON.parse(body);
  assert(payload.status === "ok", "/api/health status is not ok");
  assert(payload.service === "zana-api-worker", "/api/health returned an unexpected service name");
  assert(
    response.headers.get("access-control-allow-origin") === corsOrigin,
    "/api/health returned an invalid CORS origin",
  );
  console.log("PASS API health and CORS");
}

async function expectApiFallbackIsJson() {
  const response = await fetchWithRetry("/api/__zana_smoke_not_found__", {
    headers: { Origin: corsOrigin },
  });
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();

  assert(response.status === 404, `unknown API route returned ${response.status}; expected 404`);
  assert(contentType.includes("application/json"), "unknown API route did not return JSON");
  assert(!body.toLowerCase().includes("<!doctype html"), "unknown API route returned the frontend index");
  JSON.parse(body);
  console.log("PASS API fallback isolation");
}

async function main() {
  console.log(`Verifying ZANA production at ${baseUrl}`);
  await expectFrontend("/");
  await expectFrontend("/study");
  await expectHealth();
  await expectApiFallbackIsJson();
  console.log("All production smoke tests passed.");
}

main().catch((error) => {
  console.error(`::error::Production smoke tests failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
