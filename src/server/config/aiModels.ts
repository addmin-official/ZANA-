const DEFAULT_PRIMARY_MODEL = "gemini-3.6-flash";
const DEFAULT_VISION_MODEL = "gemini-3.6-flash";
const DEFAULT_MAX_RETRIES = 2;

export const AI_CONFIG = Object.freeze({
  apiBaseUrl: "https://generativelanguage.googleapis.com",
  apiVersion: "v1beta",
  primaryModel: DEFAULT_PRIMARY_MODEL,
  visionModel: DEFAULT_VISION_MODEL,
  timeoutMs: 30000,
  // Keep the legacy top-level field while runtime callers migrate to retryPolicy.
  maxRetries: DEFAULT_MAX_RETRIES,
  retryPolicy: Object.freeze({
    maxRetries: DEFAULT_MAX_RETRIES,
    backoffMs: 1000,
  }),
  retryableStatusCodes: Object.freeze([429, 500, 502, 503, 504] as const),
});

/**
 * Canonicalize model overrides coming from Cloudflare Worker vars, Node env,
 * Google model-list responses, or copied dashboard values.
 *
 * Accepted examples:
 *   gemini-3.6-flash
 *   models/gemini-3.6-flash
 *   "gemini-3.6-flash"
 *
 * Safe provider model identifiers are accepted so controlled Worker/Node
 * overrides and future model names work without a code release. Empty,
 * malformed, URL-like, or path-like values fall back to the production model.
 */
export function normalizeGeminiModelId(
  value: string | undefined,
  fallback: string,
): string {
  if (!value) return fallback;

  const normalized = value
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/^models\//i, "")
    .trim();

  if (!/^[a-z0-9][a-z0-9.-]*$/i.test(normalized)) {
    return fallback;
  }

  return normalized;
}

function readNodeEnv(name: "GEMINI_PRIMARY_MODEL" | "GEMINI_VISION_MODEL"): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  return process.env[name];
}

export function getPrimaryModel(env?: { GEMINI_PRIMARY_MODEL?: string }): string {
  return normalizeGeminiModelId(
    env?.GEMINI_PRIMARY_MODEL ?? readNodeEnv("GEMINI_PRIMARY_MODEL"),
    AI_CONFIG.primaryModel,
  );
}

export function getVisionModel(env?: { GEMINI_VISION_MODEL?: string }): string {
  return normalizeGeminiModelId(
    env?.GEMINI_VISION_MODEL ?? readNodeEnv("GEMINI_VISION_MODEL"),
    AI_CONFIG.visionModel,
  );
}
