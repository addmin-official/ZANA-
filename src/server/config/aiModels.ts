export const AI_CONFIG = {
  apiBaseUrl: "https://generativelanguage.googleapis.com",
  defaultModel: "gemini-3.6-flash",
  timeoutMs: 30000,
  maxRetries: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

export function getPrimaryModel(env?: { GEMINI_PRIMARY_MODEL?: string }): string {
  if (env?.GEMINI_PRIMARY_MODEL) {
    return env.GEMINI_PRIMARY_MODEL;
  }
  if (typeof process !== "undefined" && process.env?.GEMINI_PRIMARY_MODEL) {
    return process.env.GEMINI_PRIMARY_MODEL;
  }
  return AI_CONFIG.defaultModel;
}

export function getVisionModel(env?: { GEMINI_VISION_MODEL?: string }): string {
  if (env?.GEMINI_VISION_MODEL) {
    return env.GEMINI_VISION_MODEL;
  }
  if (typeof process !== "undefined" && process.env?.GEMINI_VISION_MODEL) {
    return process.env.GEMINI_VISION_MODEL;
  }
  return AI_CONFIG.defaultModel;
}

