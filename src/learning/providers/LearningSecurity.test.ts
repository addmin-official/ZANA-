import { test } from "node:test";
import assert from "node:assert";
import { AuthService } from "../../services/authService.ts";
import { PersistentLearningRecordProvider } from "./LearningRecordProvider.ts";

test("Security - AuthService JWT Generation and Validation", () => {
  // 1. Sign a token
  const studentId = "student_test_123";
  const token = AuthService.signToken(studentId);
  assert.ok(token);
  assert.strictEqual(typeof token, "string");

  // 2. Verify correct token
  const payload = AuthService.verifyToken(token);
  assert.strictEqual(payload.uid, studentId);
  assert.ok(payload.exp > Date.now());

  // 3. Reject invalid signature
  const tamperedToken = token + "modified";
  assert.throws(() => {
    AuthService.verifyToken(tamperedToken);
  }, /signature/i);

  // 4. Reject malformed token
  assert.throws(() => {
    AuthService.verifyToken("invalidtokenstring");
  }, /structure|malformed/i);

  // 5. Reject expired token
  const expiredToken = AuthService.signToken(studentId, -1000); // expired 1 second ago
  assert.throws(() => {
    AuthService.verifyToken(expiredToken);
  }, /expired/i);
});

test("Security - PersistentLearningRecordProvider Production Hardening", () => {
  // 1. Fails closed when in production mode and Cloudflare KV binding is missing
  assert.throws(() => {
    new PersistentLearningRecordProvider(null, "production");
  }, /missing in production/i);

  // 2. Succeeds when in production mode and Cloudflare KV binding is supplied
  const mockKv = {
    get: async (key: string) => null,
    put: async (key: string, val: string) => {}
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
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  const toBase64Url = (str: string) => {
    return Buffer.from(str).toString("base64url");
  };

  const mockToken = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(payload))}.mock-signature`;

  const verifiedUid = await AuthService.verifyFirebaseIdToken(mockToken);
  assert.strictEqual(verifiedUid, "firebase_student_123");

  // Reject expired token
  const expiredPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) - 1000
  };
  const mockExpiredToken = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(expiredPayload))}.mock-signature`;

  await assert.rejects(async () => {
    await AuthService.verifyFirebaseIdToken(mockExpiredToken);
  }, /expired/i);

  // Reject audience mismatch
  const badAudPayload = {
    ...payload,
    aud: "wrong-project-id"
  };
  const mockBadAudToken = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(badAudPayload))}.mock-signature`;

  await assert.rejects(async () => {
    await AuthService.verifyFirebaseIdToken(mockBadAudToken);
  }, /audience mismatch/i);
});
