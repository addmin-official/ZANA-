export type SafeErrorCategory =
  | "validation"
  | "timeout"
  | "upload_too_large"
  | "unsupported_file"
  | "missing_credentials"
  | "invalid_credentials"
  | "permission_denied"
  | "model_not_found"
  | "invalid_provider_request"
  | "quota_exceeded"
  | "rate_limited"
  | "provider_unavailable"
  | "invalid_provider_response"
  | "internal";

export function classifyError(error: unknown): SafeErrorCategory {
  if (!error) return "internal";

  const msg = error instanceof Error ? error.message : String(error);
  const lowerMsg = msg.toLowerCase();

  if (lowerMsg.includes("file too large") || lowerMsg.includes("limit_file_size") || lowerMsg.includes("oversized")) {
    return "upload_too_large";
  }

  if (lowerMsg.includes("timeout") || lowerMsg.includes("etimedout") || lowerMsg.includes("aborted")) {
    return "timeout";
  }

  if (lowerMsg.includes("gemini_api_key") || lowerMsg.includes("missing key") || lowerMsg.includes("api key missing") || lowerMsg.includes("key is required")) {
    return "missing_credentials";
  }

  if (
    lowerMsg.includes("401") ||
    lowerMsg.includes("unauthorized") ||
    lowerMsg.includes("invalid key") ||
    lowerMsg.includes("invalid_api_key") ||
    lowerMsg.includes("api_key_invalid") ||
    lowerMsg.includes("api key not valid")
  ) {
    return "invalid_credentials";
  }

  if (lowerMsg.includes("403") || lowerMsg.includes("forbidden") || lowerMsg.includes("permission_denied")) {
    return "permission_denied";
  }

  if (lowerMsg.includes("404") || lowerMsg.includes("model not found") || lowerMsg.includes("not_found") || lowerMsg.includes("model_not_found")) {
    return "model_not_found";
  }

  if (lowerMsg.includes("429") || lowerMsg.includes("quota") || lowerMsg.includes("rate limit") || lowerMsg.includes("resource_exhausted")) {
    return lowerMsg.includes("rate") ? "rate_limited" : "quota_exceeded";
  }

  if (lowerMsg.includes("400") || lowerMsg.includes("invalid request") || lowerMsg.includes("invalid_argument") || lowerMsg.includes("unsupported parameter") || lowerMsg.includes("invalid parameter")) {
    return "invalid_provider_request";
  }

  if (lowerMsg.includes("unsupported mime") || lowerMsg.includes("unsupported file") || lowerMsg.includes("unsupported image") || lowerMsg.includes("unsupported format") || lowerMsg.includes("mime")) {
    return "unsupported_file";
  }

  if (lowerMsg.includes("invalid provider response") || lowerMsg.includes("invalid json") || lowerMsg.includes("parse error") || lowerMsg.includes("response validation")) {
    return "invalid_provider_response";
  }

  if (
    lowerMsg.includes("500") ||
    lowerMsg.includes("502") ||
    lowerMsg.includes("503") ||
    lowerMsg.includes("504") ||
    lowerMsg.includes("googlegenai") ||
    lowerMsg.includes("provider") ||
    lowerMsg.includes("unavailable") ||
    lowerMsg.includes("fetcherror") ||
    lowerMsg.includes("connect")
  ) {
    return "provider_unavailable";
  }

  if (
    lowerMsg.includes("validation") ||
    lowerMsg.includes("invalid") ||
    lowerMsg.includes("bad request") ||
    lowerMsg.includes("missing") ||
    lowerMsg.includes("json") ||
    lowerMsg.includes("syntaxerror")
  ) {
    return "validation";
  }

  return "internal";
}

export function getClientSafeErrorMessage(category: SafeErrorCategory): string {
  switch (category) {
    case "validation":
      return "داواکارییەکە ناڕوونە یان نادروستە.";
    case "timeout":
      return "کاتەکە تەواو بوو. تکایە دووبارە هەوڵبدەرەوە.";
    case "upload_too_large":
      return "قەبارەی وێنەکە زۆر گەورەیە؛ تکایە وێنەیەک کەمتر لە ٥ مێگابایت هەڵبژێرە.";
    case "unsupported_file":
      return "جۆری ئەم فایلە پشتگیری ناکرێت. تەنها JPG، PNG و WebP بەکاربهێنە.";
    case "missing_credentials":
    case "invalid_credentials":
    case "permission_denied":
    case "model_not_found":
    case "invalid_provider_request":
    case "quota_exceeded":
    case "rate_limited":
    case "provider_unavailable":
    case "invalid_provider_response":
      return "خزمەتگوزارییەکە لە ئێستادا بەردەست نییە. تکایە دواتر هەوڵ بدەرەوە.";
    case "internal":
    default:
      return "کێشەیەکی ناوخۆیی لە ڕاژەکاردا ڕوویدا.";
  }
}
