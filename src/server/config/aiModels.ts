export const AI_CONFIG = {
  apiBaseUrl: "https://generativelanguage.googleapis.com",
  primaryModel: "gemini-3.6-flash",
  visionModel: "gemini-3.6-flash",
  defaultModel: "gemini-3.6-flash",
  timeoutMs: 30000,
  maxRetries: 2,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 1000,
  },
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

export function normalizeModel(model?: string | null): string {
  if (!model || typeof model !== "string" || !model.trim()) {
    return AI_CONFIG.primaryModel;
  }
  let cleaned = model.trim();
  while (cleaned.startsWith("models/")) {
    cleaned = cleaned.substring(7).trim();
  }
  while (cleaned.startsWith("gemini/")) {
    cleaned = cleaned.substring(7).trim();
  }
  return cleaned || AI_CONFIG.primaryModel;
}

export function getPrimaryModel(env?: { GEMINI_PRIMARY_MODEL?: string }): string {
  if (env?.GEMINI_PRIMARY_MODEL) {
    return normalizeModel(env.GEMINI_PRIMARY_MODEL);
  }
  if (typeof process !== "undefined" && process.env?.GEMINI_PRIMARY_MODEL) {
    return normalizeModel(process.env.GEMINI_PRIMARY_MODEL);
  }
  return normalizeModel(AI_CONFIG.primaryModel);
}

export function getVisionModel(env?: { GEMINI_VISION_MODEL?: string }): string {
  if (env?.GEMINI_VISION_MODEL) {
    return normalizeModel(env.GEMINI_VISION_MODEL);
  }
  if (typeof process !== "undefined" && process.env?.GEMINI_VISION_MODEL) {
    return normalizeModel(process.env.GEMINI_VISION_MODEL);
  }
  return normalizeModel(AI_CONFIG.visionModel);
}