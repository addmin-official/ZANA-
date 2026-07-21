import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  parseJsonc,
  maskId,
  validateCloudflareInputs,
  cfFetch,
  fetchKvNamespaces,
  fetchWorkerBindings,
  createKvNamespace,
  resolveKvNamespace,
  generateProductionConfig,
} from "../../scripts/resolve-kv.js";

const VALID_ACCOUNT_ID = "12345678901234567890123456789012";
const VALID_TOKEN = "test-cloudflare-bearer-api-token-value";
const VALID_KV_ID_1 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const VALID_KV_ID_2 = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const VALID_KV_ID_3 = "cccccccccccccccccccccccccccccccc";

test("1. parseJsonc correctly parses comments, trailing commas, and strings with slashes", () => {
  const jsoncString = `{
    // Single line comment
    "name": "zana-api-worker",
    /* Multi line 
       comment */
    "url": "https://example.com/api//v1",
    "assets": {
      "directory": "./dist/client",
    },
    "list": [1, 2, 3,]
  }`;

  const parsed = parseJsonc(jsoncString);
  assert.equal(parsed.name, "zana-api-worker");
  assert.equal(parsed.url, "https://example.com/api//v1");
  assert.equal(parsed.assets.directory, "./dist/client");
  assert.deepEqual(parsed.list, [1, 2, 3]);
});

test("2. maskId masks all except final 6 characters", () => {
  assert.equal(maskId(VALID_KV_ID_1), "**************************aaaaaa");
  assert.equal(maskId("12345"), "*****");
  assert.equal(maskId(""), "******");
});

test("3. validateCloudflareInputs validates required inputs and format", () => {
  // Valid env
  const valid = validateCloudflareInputs({
    CLOUDFLARE_ACCOUNT_ID: VALID_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: VALID_TOKEN,
    CLOUDFLARE_KV_NAMESPACE_ID: VALID_KV_ID_1,
  });
  assert.equal(valid.accountId, VALID_ACCOUNT_ID);
  assert.equal(valid.token, VALID_TOKEN);
  assert.equal(valid.configuredKvId, VALID_KV_ID_1);

  // Missing Account ID
  assert.throws(
    () => validateCloudflareInputs({ CLOUDFLARE_API_TOKEN: VALID_TOKEN }),
    /CLOUDFLARE_ACCOUNT_ID environment variable is missing/
  );

  // Invalid Account ID length/hex
  assert.throws(
    () => validateCloudflareInputs({ CLOUDFLARE_ACCOUNT_ID: "invalid-id", CLOUDFLARE_API_TOKEN: VALID_TOKEN }),
    /CLOUDFLARE_ACCOUNT_ID must be exactly 32 hexadecimal characters/
  );

  // Missing Token
  assert.throws(
    () => validateCloudflareInputs({ CLOUDFLARE_ACCOUNT_ID: VALID_ACCOUNT_ID }),
    /CLOUDFLARE_API_TOKEN environment variable is missing/
  );

  // Invalid Configured KV ID
  assert.throws(
    () =>
      validateCloudflareInputs({
        CLOUDFLARE_ACCOUNT_ID: VALID_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: VALID_TOKEN,
        CLOUDFLARE_KV_NAMESPACE_ID: "invalid-kv-id",
      }),
    /CLOUDFLARE_KV_NAMESPACE_ID must be exactly 32 hexadecimal characters/
  );
});

test("4. Strategy A: Resolves configured KV namespace ID when present and exists in account", async () => {
  const env = {
    CLOUDFLARE_ACCOUNT_ID: VALID_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: VALID_TOKEN,
    CLOUDFLARE_KV_NAMESPACE_ID: VALID_KV_ID_1,
  };

  const mockFetch = async (url: string) => {
    if (url.includes("/storage/kv/namespaces")) {
      return new Response(
        JSON.stringify({
          success: true,
          errors: [],
          result: [{ id: VALID_KV_ID_1, title: "some-configured-title" }],
        })
      );
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const result = await resolveKvNamespace({
    env,
    fetchImpl: mockFetch as unknown as typeof fetch,
  });

  assert.equal(result.strategy, "configured_id");
  assert.equal(result.resolvedId, VALID_KV_ID_1);
  assert.equal(result.configuredIdPresent, true);
});

test("5. Strategy A Failure: Fails when configured KV namespace ID does not exist in account", async () => {
  const env = {
    CLOUDFLARE_ACCOUNT_ID: VALID_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: VALID_TOKEN,
    CLOUDFLARE_KV_NAMESPACE_ID: VALID_KV_ID_1,
  };

  const mockFetch = async (url: string) => {
    if (url.includes("/storage/kv/namespaces")) {
      return new Response(
        JSON.stringify({
          success: true,
          errors: [],
          result: [], // empty
        })
      );
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  await assert.rejects(
    () => resolveKvNamespace({ env, fetchImpl: mockFetch as unknown as typeof fetch }),
    /Configured KV namespace ID 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' does not exist in Cloudflare account/
  );
});

test("6. Strategy B: Resolves existing Worker script binding when configured ID is absent", async () => {
  const env = {
    CLOUDFLARE_ACCOUNT_ID: VALID_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: VALID_TOKEN,
  };

  const mockFetch = async (url: string) => {
    if (url.includes("/workers/scripts/zana-api-worker/bindings")) {
      return new Response(
        JSON.stringify({
          success: true,
          errors: [],
          result: [
            {
              type: "kv_namespace",
              name: "LEARNING_RECORDS_KV",
              namespace_id: VALID_KV_ID_2,
            },
          ],
        })
      );
    }
    if (url.includes("/storage/kv/namespaces")) {
      return new Response(
        JSON.stringify({
          success: true,
          errors: [],
          result: [{ id: VALID_KV_ID_2, title: "zana-api-worker-LEARNING_RECORDS_KV" }],
        })
      );
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const result = await resolveKvNamespace({
    env,
    fetchImpl: mockFetch as unknown as typeof fetch,
  });

  assert.equal(result.strategy, "existing_worker_binding");
  assert.equal(result.resolvedId, VALID_KV_ID_2);
  assert.equal(result.configuredIdPresent, false);
});

test("7. Strategy C: Resolves single exact title match when no binding or configured ID", async () => {
  const env = {
    CLOUDFLARE_ACCOUNT_ID: VALID_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: VALID_TOKEN,
  };

  const mockFetch = async (url: string) => {
    if (url.includes("/workers/scripts/zana-api-worker/bindings")) {
      return new Response(JSON.stringify({ success: true, errors: [], result: [] }));
    }
    if (url.includes("/storage/kv/namespaces")) {
      return new Response(
        JSON.stringify({
          success: true,
          errors: [],
          result: [{ id: VALID_KV_ID_3, title: "zana-api-worker-LEARNING_RECORDS_KV" }],
        })
      );
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const result = await resolveKvNamespace({
    env,
    fetchImpl: mockFetch as unknown as typeof fetch,
  });

  assert.equal(result.strategy, "exact_title_match");
  assert.equal(result.resolvedId, VALID_KV_ID_3);
});

test("8. Strategy C Failure: Fails on duplicate title matches (ambiguity)", async () => {
  const env = {
    CLOUDFLARE_ACCOUNT_ID: VALID_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: VALID_TOKEN,
  };

  const mockFetch = async (url: string) => {
    if (url.includes("/workers/scripts/zana-api-worker/bindings")) {
      return new Response(JSON.stringify({ success: true, errors: [], result: [] }));
    }
    if (url.includes("/storage/kv/namespaces")) {
      return new Response(
        JSON.stringify({
          success: true,
          errors: [],
          result: [
            { id: VALID_KV_ID_1, title: "zana-api-worker-LEARNING_RECORDS_KV" },
            { id: VALID_KV_ID_2, title: "zana-api-worker-LEARNING_RECORDS_KV" },
          ],
        })
      );
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  await assert.rejects(
    () => resolveKvNamespace({ env, fetchImpl: mockFetch as unknown as typeof fetch }),
    /Ambiguity error: Multiple KV namespaces \(2\) match title 'zana-api-worker-LEARNING_RECORDS_KV'/
  );
});

test("9. Strategy D: Explicit creation when 0 matches exist and verifies re-list", async () => {
  const env = {
    CLOUDFLARE_ACCOUNT_ID: VALID_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: VALID_TOKEN,
  };

  let created = false;

  const mockFetch = async (url: string, opts: { method?: string; body?: string }) => {
    if (url.includes("/workers/scripts/zana-api-worker/bindings")) {
      return new Response(JSON.stringify({ success: true, errors: [], result: [] }));
    }
    if (url.includes("/storage/kv/namespaces")) {
      if (opts?.method === "POST") {
        created = true;
        return new Response(
          JSON.stringify({
            success: true,
            errors: [],
            result: { id: VALID_KV_ID_1, title: "zana-api-worker-LEARNING_RECORDS_KV" },
          })
        );
      }
      // GET list
      return new Response(
        JSON.stringify({
          success: true,
          errors: [],
          result: created ? [{ id: VALID_KV_ID_1, title: "zana-api-worker-LEARNING_RECORDS_KV" }] : [],
        })
      );
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const result = await resolveKvNamespace({
    env,
    fetchImpl: mockFetch as unknown as typeof fetch,
  });

  assert.equal(result.strategy, "created_namespace");
  assert.equal(result.resolvedId, VALID_KV_ID_1);
});

test("10. API Error Handling: Handles permission denied HTTP 403 cleanly and sanitizes tokens", async () => {
  const mockFetch = async () => {
    return new Response(
      JSON.stringify({
        success: false,
        errors: [{ code: 10000, message: `Authentication error for token ${VALID_TOKEN}` }],
      }),
      { status: 403 }
    );
  };

  await assert.rejects(async () => {
    await cfFetch(
      `https://api.cloudflare.com/client/v4/accounts/${VALID_ACCOUNT_ID}/storage/kv/namespaces`,
      { token: VALID_TOKEN },
      mockFetch as unknown as typeof fetch
    );
  }, (err: Error) => {
    assert.match(err.message, /Cloudflare API error \(HTTP 403\)/);
    assert.doesNotMatch(err.message, new RegExp(VALID_TOKEN));
    assert.match(err.message, /\[MASKED_TOKEN\]/);
    return true;
  });
});

test("11. API Error Handling: Handles malformed Cloudflare JSON response", async () => {
  const mockFetch = async () => {
    return new Response("HTML Error Page or Bad JSON", { status: 502 });
  };

  await assert.rejects(async () => {
    await cfFetch(
      `https://api.cloudflare.com/client/v4/accounts/${VALID_ACCOUNT_ID}/storage/kv/namespaces`,
      { token: VALID_TOKEN },
      mockFetch as unknown as typeof fetch
    );
  }, /Malformed Cloudflare JSON response/);
});

test("12. Pagination: Fetches all pages when multiple pages exist", async () => {
  const mockFetch = async (url: string) => {
    if (url.includes("page=1&")) {
      return new Response(
        JSON.stringify({
          success: true,
          errors: [],
          result: [{ id: VALID_KV_ID_1, title: "other-namespace-1" }],
          result_info: { page: 1, per_page: 1, total_count: 2 },
        })
      );
    }
    if (url.includes("page=2&")) {
      return new Response(
        JSON.stringify({
          success: true,
          errors: [],
          result: [{ id: VALID_KV_ID_2, title: "zana-api-worker-LEARNING_RECORDS_KV" }],
          result_info: { page: 2, per_page: 1, total_count: 2 },
        })
      );
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const list = await fetchKvNamespaces(VALID_ACCOUNT_ID, VALID_TOKEN, mockFetch as unknown as typeof fetch);
  assert.equal(list.length, 2);
  assert.equal(list[1].title, "zana-api-worker-LEARNING_RECORDS_KV");
});

test("13. Creation Response Validation: Throws if creation response lacks valid ID", async () => {
  const mockFetch = async () => {
    return new Response(
      JSON.stringify({
        success: true,
        errors: [],
        result: { id: "invalid-short-id", title: "zana-api-worker-LEARNING_RECORDS_KV" },
      })
    );
  };

  await assert.rejects(
    () => createKvNamespace(VALID_ACCOUNT_ID, "zana-api-worker-LEARNING_RECORDS_KV", VALID_TOKEN, mockFetch as unknown as typeof fetch),
    /invalid namespace ID/
  );
});

test("14. Production Config Generation: Preserves assets, name, vars, and does not mutate wrangler.jsonc", () => {
  const wranglerPath = path.resolve("wrangler.jsonc");
  const initialWranglerContent = fs.readFileSync(wranglerPath, "utf8");

  const baseConfig = parseJsonc(initialWranglerContent);
  const tempProdPath = path.resolve("wrangler.production.test.json");

  try {
    generateProductionConfig(baseConfig, VALID_KV_ID_1, tempProdPath);

    assert.equal(fs.existsSync(tempProdPath), true);
    const generatedContent = fs.readFileSync(tempProdPath, "utf8");
    const parsedGenerated = JSON.parse(generatedContent);

    // Verify preservation
    assert.equal(parsedGenerated.name, baseConfig.name);
    assert.equal(parsedGenerated.main, baseConfig.main);
    assert.equal(parsedGenerated.compatibility_date, baseConfig.compatibility_date);
    assert.deepEqual(parsedGenerated.assets, baseConfig.assets);
    assert.deepEqual(parsedGenerated.vars, baseConfig.vars);
    assert.deepEqual(parsedGenerated.kv_namespaces, [
      {
        binding: "LEARNING_RECORDS_KV",
        id: VALID_KV_ID_1,
      },
    ]);

    // Verify wrangler.jsonc was not mutated
    const postWranglerContent = fs.readFileSync(wranglerPath, "utf8");
    assert.equal(initialWranglerContent, postWranglerContent);
  } finally {
    if (fs.existsSync(tempProdPath)) {
      fs.unlinkSync(tempProdPath);
    }
  }
});
