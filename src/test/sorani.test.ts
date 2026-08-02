import { test } from "node:test";
import assert from "node:assert";
import { parseChatRequest, parseAssessmentRequest, parseReportRequest, parseAskRequest } from "../server/ai/AiContracts.ts";
import { getClientSafeErrorMessage } from "../server/ai/AiErrors.ts";

test("Sorani UX: missing chat message", () => {
  assert.throws(() => {
    parseChatRequest({});
  }, /پەیام \(message\) دیاری نەکراوە یان خاڵییە\./);
});

test("Sorani UX: missing assessment state", () => {
  assert.throws(() => {
    parseAssessmentRequest({ action: "generate" });
  }, /دۆخی تاقیکردنەوە \(state\) دیاری نەکراوە\./);
});

test("Sorani UX: missing report profile", () => {
  assert.throws(() => {
    parseReportRequest({});
  }, /پڕۆفایلی قوتابی \(profile\) دیاری نەکراوە یان کەموکوڕی تێدایە\./);
});

test("Sorani UX: missing study question", () => {
  assert.throws(() => {
    parseAskRequest({});
  }, /پەیام \(message\) دیاری نەکراوە یان خاڵییە\./);
});

test("Sorani UX: oversized image", () => {
  assert.strictEqual(
    getClientSafeErrorMessage("upload_too_large"),
    "قەبارەی وێنەکە زۆر گەورەیە؛ تکایە وێنەیەک کەمتر لە ٥ مێگابایت هەڵبژێرە."
  );
});

test("Sorani UX: unsupported image type", () => {
  assert.strictEqual(
    getClientSafeErrorMessage("unsupported_file"),
    "جۆری ئەم فایلە پشتگیری ناکرێت. تەنها JPG، PNG و WebP بەکاربهێنە."
  );
});

test("Sorani UX: provider unavailable", () => {
  assert.strictEqual(
    getClientSafeErrorMessage("provider_unavailable"),
    "خزمەتگوزارییەکە لە ئێستادا بەردەست نییە. تکایە دواتر هەوڵ بدەرەوە."
  );
});

test("Sorani UX: timeout", () => {
  assert.strictEqual(
    getClientSafeErrorMessage("timeout"),
    "کاتەکە تەواو بوو. تکایە دووبارە هەوڵبدەرەوە."
  );
});
