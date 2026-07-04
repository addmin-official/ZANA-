export function getPrimaryModel(): string {
  return process.env.GEMINI_PRIMARY_MODEL || "gemini-2.5-flash";
}

export function getVisionModel(): string {
  return process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash";
}
