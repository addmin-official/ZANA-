process.env.NODE_ENV = "test";
import assert from "assert";
import { validateImageSignature } from "./src/server/security/imageSignature.ts";
import { Request } from "express";

const { classifyError, getClientSafeErrorMessage, fileFilter, isRateLimited, rateLimitDb } = await import("./server.ts");

console.log("=================================================");
console.log("         ZANA - VISION SECURE GATE TESTS         ");
console.log("=================================================");

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Valid JPEGs
runTest("Valid JPEG Magic Byte Signature Validation", () => {
  const validJpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x11]);
  assert.ok(validateImageSignature(validJpgBuffer, "image/jpeg"));
  assert.ok(validateImageSignature(validJpgBuffer, "image/jpg"));
});

// 2. Valid PNGs
runTest("Valid PNG Magic Byte Signature Validation", () => {
  const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.ok(validateImageSignature(validPngBuffer, "image/png"));
});

// 3. Valid WebPs
runTest("Valid WebP Magic Byte Signature Validation", () => {
  const validWebpBuffer = Buffer.from("RIFFxxxxWEBPxxxx");
  assert.ok(validateImageSignature(validWebpBuffer, "image/webp"));
});

// 4. Fake JPEG
runTest("Fake JPEG (Declaring image/jpeg but invalid signature) Rejection", () => {
  const fakeJpgBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  assert.strictEqual(validateImageSignature(fakeJpgBuffer, "image/jpeg"), false);
});

// 5. SVG Rejection
runTest("SVG Format Magic-Byte and Mime Rejection", () => {
  const mockSvgBuffer = Buffer.from("<svg>...</svg>");
  assert.strictEqual(validateImageSignature(mockSvgBuffer, "image/svg+xml"), false);
  
  const mockReq = {} as Request;
  const mockFile = { mimetype: "image/svg+xml" } as Express.Multer.File;
  let filterError: Error | null = null;
  
  fileFilter(mockReq, mockFile, (err) => {
    filterError = err;
  });
  
  assert.ok(filterError instanceof Error);
  assert.strictEqual((filterError as Record<string, any>).code, "UNSUPPORTED_MIME_TYPE");
});

// 6. PDF Rejection
runTest("PDF Format Magic-Byte and Mime Rejection", () => {
  const mockPdfBuffer = Buffer.from("%PDF-1.5...");
  assert.strictEqual(validateImageSignature(mockPdfBuffer, "application/pdf"), false);
  
  const mockReq = {} as Request;
  const mockFile = { mimetype: "application/pdf" } as Express.Multer.File;
  let filterError: Error | null = null;
  
  fileFilter(mockReq, mockFile, (err) => {
    filterError = err;
  });
  
  assert.ok(filterError instanceof Error);
  assert.strictEqual((filterError as Record<string, any>).code, "UNSUPPORTED_MIME_TYPE");
});

// 7. Oversized Upload Error Classification
runTest("Oversized Upload (LIMIT_FILE_SIZE) Classification", () => {
  const mockMulterError = { code: "LIMIT_FILE_SIZE" };
  const category = classifyError(mockMulterError);
  assert.strictEqual(category, "upload_too_large");
  
  const safeMsg = getClientSafeErrorMessage(category);
  assert.strictEqual(safeMsg, "قەبارەی وێنەکە زۆر گەورەیە؛ تکایە وێنەیەک کەمتر لە ٥ مێگابایت هەڵبژێرە.");
});

// 8. Safe Error Kurdish Localization and Secret Masking
runTest("Safe Localization with Kurdish Sorani Encoding & Secret Masking", () => {
  assert.strictEqual(getClientSafeErrorMessage("validation"), "داواکارییەکە ناڕوونە یان نادروستە.");
  assert.strictEqual(getClientSafeErrorMessage("unsupported_file"), "جۆری ئەم فایلە پشتگیری ناکرێت. تەنها JPG، PNG و WebP بەکاربهێنە.");
  assert.strictEqual(getClientSafeErrorMessage("timeout"), "کاتەکە تەواو بوو. تکایە دووبارە هەوڵبدەرەوە.");
  
  const rawProviderError = new Error("API_KEY_EXPIRED: The requested model 'gemini-2.5-flash' is invalid for bill_to_user");
  const classified = classifyError(rawProviderError);
  const userSafe = getClientSafeErrorMessage(classified);
  
  // Verify that model name, api key, or sensitive error messages are NOT leaked to the user
  assert.ok(!userSafe.includes("API_KEY_EXPIRED"));
  assert.ok(!userSafe.includes("gemini-2.5-flash"));
  assert.strictEqual(userSafe, "خزمەتگوزارییەکە لە ئێستادا بەردەست نییە. تکایە دواتر هەوڵ بدەرەوە.");

  // Test purely internal error masking
  const internalErr = new Error("Out of memory on disk cluster write failure");
  const internalClassified = classifyError(internalErr);
  const internalUserSafe = getClientSafeErrorMessage(internalClassified);
  assert.strictEqual(internalUserSafe, "کێشەیەکی ناوخۆیی لە ڕاژەکاردا ڕوویدا.");
});

// 9. Rate Limiting Integrity
runTest("Rate Limiting Integrity Verification", () => {
  const testIp = "127.0.0.5";
  rateLimitDb.delete(testIp);
  
  // Allow 5 requests in window
  for (let i = 0; i < 5; i++) {
    const isLimited = isRateLimited(testIp, 5, 5000);
    assert.strictEqual(isLimited, false);
  }
  
  // 6th request should trigger rate limiting
  const isLimitedOn6th = isRateLimited(testIp, 5, 5000);
  assert.strictEqual(isLimitedOn6th, true);
});

console.log("\n=================================================");
console.log("   🎉 ALL SECURE VISION TESTS PASSED SUCCESSFULLY 🎉   ");
console.log("=================================================");
