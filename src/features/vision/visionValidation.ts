import { VisionImageInput } from "./visionTypes.ts";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  mimeType?: "image/jpeg" | "image/png" | "image/webp";
}

export function validateImageFile(file: File): ValidationResult {
  if (!file) {
    return { isValid: false, error: "تکایە فایلێک هەڵبژێرە." };
  }

  // Check empty files
  if (file.size === 0) {
    return { isValid: false, error: "ئەم فایلە بەتاڵە و ناتوانرێت چارەسەر بکرێت." };
  }

  // Maximum size 5 MB
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      isValid: false,
      error: "قەبارەی وێنەکە زۆر گەورەیە؛ تکایە وێنەیەک کەمتر لە ٥ مێگابایت هەڵبژێرە."
    };
  }

  // Allowed MIME types
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: "جۆری ئەم فایلە پشتگیری ناکرێت. تەنها JPG، PNG و WebP بەکاربهێنە."
    };
  }

  // Map to strictly allowed mimeTypes in VisionImageInput
  let normalizedMime: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg";
  if (file.type === "image/png") {
    normalizedMime = "image/png";
  } else if (file.type === "image/webp") {
    normalizedMime = "image/webp";
  }

  return {
    isValid: true,
    mimeType: normalizedMime
  };
}
