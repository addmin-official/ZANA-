export const AI_CONFIG = {
  apiBaseUrl: "https://generativelanguage.googleapis.com",
  primaryModel: "gemini-3.5-flash",
  visionModel: "gemini-3.5-flash",
  timeoutMs: 30000,
  retryPolicy: {
    maxRetries: 2,
    baseBackoffMs: 300,
    maxBackoffMs: 1000,
    retryableStatusCodes: [429, 500, 502, 503, 504],
  },
} as const;

export interface ModelNormalizationDiagnostic {
  overridePresent: boolean;
  invalidFormat: boolean;
  fallbackUsed: boolean;
  selectedModel: string;
}

export function normalizeModel(
  model?: string | null,
  fallbackModel: string = AI_CONFIG.primaryModel,
  outDiagnostic?: (diag: ModelNormalizationDiagnostic) => void
): string {
  if (!model || typeof model !== "string" || !model.trim()) {
    if (outDiagnostic) {
      outDiagnostic({
        overridePresent: false,
        invalidFormat: false,
        fallbackUsed: true,
        selectedModel: fallbackModel,
      });
    }
    return fallbackModel;
  }

  let cleaned = model.trim();

  // Strip surrounding quotes
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Strip repeated prefixes
  while (cleaned.startsWith("models/")) {
    cleaned = cleaned.substring(7).trim();
  }
  while (cleaned.startsWith("gemini/")) {
    cleaned = cleaned.substring(7).trim();
  }

  // Check for invalid format (URL, slashes, spaces, path traversal, control chars)
  const isInvalid =
    !cleaned ||
    cleaned.includes("://") ||
    cleaned.includes("/") ||
    cleaned.includes("..") ||
    /\s/.test(cleaned) ||
    /[\x00-\x1F\x7F]/.test(cleaned) ||
    !/^[a-zA-Z0-9_.-]+$/.test(cleaned);

  if (isInvalid) {
    if (outDiagnostic) {
      outDiagnostic({
        overridePresent: true,
        invalidFormat: true,
        fallbackUsed: true,
        selectedModel: fallbackModel,
      });
    }
    throw new Error("Invalid model name override format");
  }

  if (outDiagnostic) {
    outDiagnostic({
      overridePresent: true,
      invalidFormat: false,
      fallbackUsed: false,
      selectedModel: cleaned,
    });
  }

  return cleaned;
}

export function resolvePrimaryModel(env?: { GEMINI_PRIMARY_MODEL?: string; AI_MODEL_PRIMARY?: string }): string {
  const envVal =
    env?.GEMINI_PRIMARY_MODEL ||
    env?.AI_MODEL_PRIMARY ||
    (typeof process !== "undefined" ? process.env?.GEMINI_PRIMARY_MODEL || process.env?.AI_MODEL_PRIMARY : undefined);
  return normalizeModel(envVal, AI_CONFIG.primaryModel);
}

export function resolveVisionModel(env?: { GEMINI_VISION_MODEL?: string; AI_MODEL_VISION?: string }): string {
  const envVal =
    env?.GEMINI_VISION_MODEL ||
    env?.AI_MODEL_VISION ||
    (typeof process !== "undefined" ? process.env?.GEMINI_VISION_MODEL || process.env?.AI_MODEL_VISION : undefined);
  return normalizeModel(envVal, AI_CONFIG.visionModel);
}

export function getPrimaryModel(env?: { GEMINI_PRIMARY_MODEL?: string; AI_MODEL_PRIMARY?: string }): string {
  return resolvePrimaryModel(env);
}

export function getVisionModel(env?: { GEMINI_VISION_MODEL?: string; AI_MODEL_VISION?: string }): string {
  return resolveVisionModel(env);
}
