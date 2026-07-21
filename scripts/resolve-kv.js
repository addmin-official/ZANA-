// Deterministic KV Namespace Resolver for Cloudflare Workers
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Robust JSONC parser that handles single-line comments, multi-line comments,
 * and trailing commas outside string literals.
 */
export function parseJsonc(content) {
  if (typeof content !== "string") {
    throw new TypeError("Input must be a string");
  }

  let i = 0;
  let inString = false;
  let isEscaped = false;
  let inSingleLineComment = false;
  let inMultiLineComment = false;
  let result = "";

  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inSingleLineComment) {
      if (char === "\n" || char === "\r") {
        inSingleLineComment = false;
        result += char;
      } else {
        result += " ";
      }
      i++;
      continue;
    }

    if (inMultiLineComment) {
      if (char === "*" && nextChar === "/") {
        inMultiLineComment = false;
        result += "  ";
        i += 2;
        continue;
      }
      result += char === "\n" || char === "\r" ? char : " ";
      i++;
      continue;
    }

    if (inString) {
      result += char;
      if (isEscaped) {
        isEscaped = false;
      } else if (char === "\\") {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }
      i++;
      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      i++;
      continue;
    }

    if (char === "/" && nextChar === "/") {
      inSingleLineComment = true;
      result += "  ";
      i += 2;
      continue;
    }

    if (char === "/" && nextChar === "*") {
      inMultiLineComment = true;
      result += "  ";
      i += 2;
      continue;
    }

    result += char;
    i++;
  }

  const noTrailingCommas = result.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(noTrailingCommas);
}

/**
 * Masks an ID string, showing only the final 6 characters.
 */
export function maskId(id) {
  if (!id || typeof id !== "string") return "******";
  if (id.length <= 6) return "*".repeat(id.length);
  return "*".repeat(id.length - 6) + id.slice(-6);
}

/**
 * Validates Cloudflare environment inputs.
 */
export function validateCloudflareInputs(env = process.env) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const token = env.CLOUDFLARE_API_TOKEN;
  const configuredKvId = env.CLOUDFLARE_KV_NAMESPACE_ID;

  if (!accountId || typeof accountId !== "string" || accountId.trim() === "") {
    throw new Error("CLOUDFLARE_ACCOUNT_ID environment variable is missing");
  }

  const hex32Regex = /^[0-9a-fA-F]{32}$/;
  if (!hex32Regex.test(accountId.trim())) {
    throw new Error(`CLOUDFLARE_ACCOUNT_ID must be exactly 32 hexadecimal characters, got: '${accountId.trim()}'`);
  }

  if (!token || typeof token !== "string" || token.trim() === "") {
    throw new Error("CLOUDFLARE_API_TOKEN environment variable is missing");
  }

  if (configuredKvId && typeof configuredKvId === "string" && configuredKvId.trim() !== "") {
    if (!hex32Regex.test(configuredKvId.trim())) {
      throw new Error(`CLOUDFLARE_KV_NAMESPACE_ID must be exactly 32 hexadecimal characters, got: '${configuredKvId.trim()}'`);
    }
  }

  return {
    accountId: accountId.trim(),
    token: token.trim(),
    configuredKvId: configuredKvId && configuredKvId.trim() ? configuredKvId.trim() : null,
  };
}

/**
 * Cloudflare REST API wrapper with token masking and error handling.
 */
export async function cfFetch(url, options = {}, fetchImpl = globalThis.fetch) {
  const token = options.token;
  if (!token) {
    throw new Error("CLOUDFLARE_API_TOKEN is required for API requests");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const reqOptions = {
    method: options.method || "GET",
    headers,
    ...(options.body ? { body: typeof options.body === "string" ? options.body : JSON.stringify(options.body) } : {}),
  };

  let res;
  try {
    res = await fetchImpl(url, reqOptions);
  } catch (err) {
    const sanitizeMsg = (err.message || "").replace(new RegExp(token, "g"), "[MASKED_TOKEN]");
    const networkErr = new Error(`Network error calling Cloudflare API: ${sanitizeMsg}`);
    networkErr.operation = options.operation || "Cloudflare API Call";
    networkErr.code = "NETWORK_ERROR";
    throw networkErr;
  }

  let text;
  try {
    text = await res.text();
  } catch (err) {
    const readErr = new Error(`Failed to read response from Cloudflare API (HTTP ${res.status})`);
    readErr.status = res.status;
    readErr.operation = options.operation || "Read API Response";
    throw readErr;
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    const jsonErr = new Error(`Malformed Cloudflare JSON response (HTTP ${res.status}): ${text.slice(0, 100)}`);
    jsonErr.status = res.status;
    jsonErr.operation = options.operation || "Parse JSON Response";
    throw jsonErr;
  }

  if (!res.ok || json.success === false) {
    const status = res.status;
    const errors = json.errors && json.errors.length > 0
      ? json.errors.map((e) => `${e.code || ""}: ${e.message || ""}`).join("; ")
      : `HTTP ${status}`;
    const sanitizedError = errors.replace(new RegExp(token, "g"), "[MASKED_TOKEN]");

    const apiErr = new Error(`Cloudflare API error (HTTP ${status}): ${sanitizedError}`);
    apiErr.status = status;
    apiErr.cfErrors = json.errors || [];
    apiErr.operation = options.operation || "Cloudflare API Call";
    throw apiErr;
  }

  return json;
}

/**
 * Fetches all KV namespaces for an account, handling pagination.
 */
export async function fetchKvNamespaces(accountId, token, fetchImpl = globalThis.fetch) {
  const allNamespaces = [];
  let page = 1;
  const perPage = 100;
  let totalPages = 1;

  do {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces?page=${page}&per_page=${perPage}`;
    const json = await cfFetch(
      url,
      { token, operation: "List KV Namespaces" },
      fetchImpl
    );

    if (Array.isArray(json.result)) {
      allNamespaces.push(...json.result);
    }

    if (json.result_info) {
      const { page: currPage, per_page: pSize, total_count: totalCount } = json.result_info;
      if (totalCount && pSize) {
        totalPages = Math.ceil(totalCount / pSize);
      }
    } else {
      totalPages = page;
    }

    page++;
  } while (page <= totalPages);

  return allNamespaces;
}

/**
 * Fetches existing Worker script bindings to check if LEARNING_RECORDS_KV is already bound.
 */
export async function fetchWorkerBindings(accountId, workerName, token, fetchImpl = globalThis.fetch) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}/bindings`;
  try {
    const json = await cfFetch(
      url,
      { token, operation: "Fetch Worker Bindings" },
      fetchImpl
    );

    if (Array.isArray(json.result)) {
      const hex32Regex = /^[0-9a-fA-F]{32}$/;
      const kvBinding = json.result.find(
        (b) =>
          (b.type === "kv_namespace" || b.type === "kv") &&
          (b.name === "LEARNING_RECORDS_KV" || b.binding === "LEARNING_RECORDS_KV")
      );
      if (kvBinding) {
        const nsId = kvBinding.namespace_id || kvBinding.id;
        if (nsId && hex32Regex.test(nsId)) {
          return nsId;
        }
      }
    }
  } catch (err) {
    if (err.status === 404) {
      return null;
    }
    console.warn(`Note: Could not fetch existing Worker bindings for '${workerName}': ${err.message}`);
    return null;
  }
  return null;
}

/**
 * Explicitly creates a new KV namespace and verifies it via re-listing.
 */
export async function createKvNamespace(accountId, canonicalTitle, token, fetchImpl = globalThis.fetch) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces`;
  const json = await cfFetch(
    url,
    {
      method: "POST",
      token,
      body: { title: canonicalTitle },
      operation: "Create KV Namespace",
    },
    fetchImpl
  );

  const hex32Regex = /^[0-9a-fA-F]{32}$/;
  if (!json.result || !json.result.id || !hex32Regex.test(json.result.id)) {
    throw new Error(`Cloudflare API creation succeeded but returned an invalid namespace ID: ${JSON.stringify(json.result)}`);
  }

  const createdId = json.result.id;

  // Re-list and verify
  const allNamespaces = await fetchKvNamespaces(accountId, token, fetchImpl);
  const matches = allNamespaces.filter((ns) => ns.title === canonicalTitle);

  if (matches.length === 0) {
    throw new Error(`Created KV namespace '${canonicalTitle}' (${createdId}) but could not locate it in subsequent listing`);
  }
  if (matches.length > 1) {
    throw new Error(`Ambiguity after creation: Found ${matches.length} namespaces matching title '${canonicalTitle}'`);
  }
  if (matches[0].id !== createdId) {
    throw new Error(`Re-listed namespace ID '${matches[0].id}' does not match created ID '${createdId}' for title '${canonicalTitle}'`);
  }

  return createdId;
}

/**
 * Resolves the KV namespace ID deterministically following precedence strategy:
 * A. Configured KV Namespace ID
 * B. Existing Worker Binding
 * C. Exact Canonical Title Match
 * D. Explicit Creation
 */
export async function resolveKvNamespace(options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const wranglerConfigPath = options.wranglerConfigPath || path.resolve("wrangler.jsonc");

  const inputs = validateCloudflareInputs(env);
  const { accountId, token, configuredKvId } = inputs;

  if (!fs.existsSync(wranglerConfigPath)) {
    throw new Error(`wrangler.jsonc not found at '${wranglerConfigPath}'`);
  }

  const wranglerContent = fs.readFileSync(wranglerConfigPath, "utf8");
  const baseConfig = parseJsonc(wranglerContent);
  const workerName = baseConfig.name || "zana-api-worker";
  const canonicalTitle = `${workerName}-LEARNING_RECORDS_KV`;

  let resolvedId = null;
  let strategy = null;

  // Strategy A: Configured KV Namespace ID
  if (configuredKvId) {
    const namespaces = await fetchKvNamespaces(accountId, token, fetchImpl);
    const matched = namespaces.find((ns) => ns.id === configuredKvId);
    if (!matched) {
      throw new Error(`Configured KV namespace ID '${configuredKvId}' does not exist in Cloudflare account '${accountId}'`);
    }
    resolvedId = configuredKvId;
    strategy = "configured_id";
  }

  // Strategy B: Existing Worker Binding
  if (!resolvedId) {
    const existingBindingId = await fetchWorkerBindings(accountId, workerName, token, fetchImpl);
    if (existingBindingId) {
      const namespaces = await fetchKvNamespaces(accountId, token, fetchImpl);
      const matched = namespaces.find((ns) => ns.id === existingBindingId);
      if (matched) {
        resolvedId = existingBindingId;
        strategy = "existing_worker_binding";
      }
    }
  }

  // Strategy C: Exact Canonical Title Match
  if (!resolvedId) {
    const namespaces = await fetchKvNamespaces(accountId, token, fetchImpl);
    const matches = namespaces.filter((ns) => ns.title === canonicalTitle);

    if (matches.length === 1) {
      resolvedId = matches[0].id;
      strategy = "exact_title_match";
    } else if (matches.length > 1) {
      const ids = matches.map((m) => m.id).join(", ");
      throw new Error(`Ambiguity error: Multiple KV namespaces (${matches.length}) match title '${canonicalTitle}': [${ids}]`);
    }
  }

  // Strategy D: Explicit Creation
  if (!resolvedId) {
    resolvedId = await createKvNamespace(accountId, canonicalTitle, token, fetchImpl);
    strategy = "created_namespace";
  }

  const hex32Regex = /^[0-9a-fA-F]{32}$/;
  if (!resolvedId || !hex32Regex.test(resolvedId)) {
    throw new Error(`Failed to resolve valid 32-hex KV namespace ID. Got: '${resolvedId}'`);
  }

  return {
    strategy,
    configuredIdPresent: Boolean(configuredKvId),
    canonicalTitle,
    workerName,
    resolvedId,
    maskedResolvedId: maskId(resolvedId),
    baseConfig,
  };
}

/**
 * Generates wrangler.production.json with the resolved KV namespace binding.
 */
export function generateProductionConfig(
  baseConfig,
  resolvedId,
  productionConfigPath = path.resolve("wrangler.production.json")
) {
  const prodConfig = JSON.parse(JSON.stringify(baseConfig));

  const kvList = Array.isArray(baseConfig.kv_namespaces) ? baseConfig.kv_namespaces : [];
  const otherKv = kvList.filter((kv) => kv.binding !== "LEARNING_RECORDS_KV");

  prodConfig.kv_namespaces = [
    ...otherKv,
    {
      binding: "LEARNING_RECORDS_KV",
      id: resolvedId,
    },
  ];

  fs.writeFileSync(productionConfigPath, JSON.stringify(prodConfig, null, 2), "utf8");

  // Validate written file is valid JSON
  const writtenContent = fs.readFileSync(productionConfigPath, "utf8");
  JSON.parse(writtenContent);

  return productionConfigPath;
}

/**
 * Main execution handler when run from CLI.
 */
export async function main() {
  let wranglerVersion = "unknown";
  try {
    wranglerVersion = execSync("npx wrangler --version", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch (err) {
    wranglerVersion = "4.112.0";
  }

  try {
    const result = await resolveKvNamespace();
    generateProductionConfig(result.baseConfig, result.resolvedId);

    console.log(`Wrangler version: ${wranglerVersion}`);
    console.log(`Resolution strategy selected: ${result.strategy}`);
    console.log(`Configured ID present: ${result.configuredIdPresent}`);
    console.log(`Namespace title: ${result.canonicalTitle}`);
    console.log(`Resolved namespace ID: ${result.maskedResolvedId}`);
  } catch (err) {
    console.error("\n=== KV Resolution Failure ===");
    console.error(`Operation name: ${err.operation || "KV Resolution"}`);
    console.error(`HTTP status or command exit code: ${err.status || err.code || "1"}`);
    console.error(`Sanitized Cloudflare error: ${err.message}`);
    console.error("=============================\n");
    process.exit(1);
  }
}

// Execute main if run directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("resolve-kv.js")) {
  main();
}
