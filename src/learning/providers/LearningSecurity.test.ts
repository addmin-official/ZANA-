process.env.NODE_ENV = "test";
process.env.ZANA_ENV = "test";
import { test } from "node:test";
import assert from "node:assert";
import { AuthService } from "../../services/authService.ts";
import { PersistentLearningRecordProvider } from "./LearningRecordProvider.ts";

test("Security - PersistentLearningRecordProvider Production Hardening", () => {
  // 1. Fails closed when in production mode and Cloudflare KV binding is missing
  assert.throws(() => {
    new PersistentLearningRecordProvider(null, "production");
  }, /missing in production/i);

  // 2. Succeeds when in production mode and Cloudflare KV binding is supplied
  const mockKv = {
    get: async () => null,
    put: async () => {},
  };
  const provider = new PersistentLearningRecordProvider(mockKv, "production");
  assert.ok(provider);
});

test("Security - PersistentLearningRecordProvider Isolated Testing Failover", () => {
  // Uses in-memory provider when in test mode (safely bypassed)
  const provider = new PersistentLearningRecordProvider(null, "test");
  assert.ok(provider);
});

test("Security - AuthService Firebase ID Token Verification", async () => {
  // Mock Firebase ID token components in 'test' environment
  const header = { alg: "RS256", kid: "mock-kid" };
  const payload = {
    iss: "https://securetoken.google.com/gen-lang-client-0009572581",
    aud: "gen-lang-client-0009572581",
    sub: "firebase_student_123",
    iat: Math.floor(Date.now() / 1000) - 60,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const toBase64Url = (str: string) => {
    return Buffer.from(str).toString("base64url");
  };

  const mockToken = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(payload))}.mock-signature`;

  const verifiedClaims = await AuthService.verifyFirebaseIdToken(mockToken);
  assert.strictEqual(verifiedClaims.uid, "firebase_student_123");

  // Reject expired token
  const expiredPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) - 1000,
  };
  const mockExpiredToken = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(expiredPayload))}.mock-signature`;

  await assert.rejects(async () => {
    await AuthService.verifyFirebaseIdToken(mockExpiredToken);
  }, /expired/i);

  // Reject audience mismatch
  const badAudPayload = {
    ...payload,
    aud: "wrong-project-id",
  };
  const mockBadAudToken = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(badAudPayload))}.mock-signature`;

  await assert.rejects(async () => {
    await AuthService.verifyFirebaseIdToken(mockBadAudToken, "expected-proj-id");
  }, /audience mismatch/i);
});
