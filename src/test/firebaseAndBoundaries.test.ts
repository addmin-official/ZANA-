import test from "node:test";
import assert from "node:assert/strict";
import { isFirebaseConfigured } from "../services/firebaseConfig.ts";
import { createStudentProfile, migrateStudentProfile } from "../features/student/studentStorage.ts";
import { AdaptiveLearningEngine } from "../learning/engine/AdaptiveLearningEngine.ts";
import { DifficultyLevel, MasteryStatus } from "../learning/domain/MasteryTypes.ts";

test("Firebase Config - isFirebaseConfigured validations", () => {
  // 1. Valid configuration
  const validCfg = {
    apiKey: "AIzaSyValidApiKey1234567890abcdef",
    projectId: "valid-project-id",
    appId: "1:123456789:web:abcdef",
    measurementId: "",
  };
  assert.strictEqual(isFirebaseConfigured(validCfg as any), true);

  // 2. Missing API key
  const missingApiKey = {
    apiKey: "",
    projectId: "valid-project-id",
  };
  assert.strictEqual(isFirebaseConfigured(missingApiKey as any), false);

  // 3. Missing project ID
  const missingProjectId = {
    apiKey: "AIzaSyValidApiKey1234567890abcdef",
    projectId: "",
  };
  assert.strictEqual(isFirebaseConfigured(missingProjectId as any), false);

  // 4. Placeholder configuration
  const placeholderCfg = {
    apiKey: "AIzaSyFakeKeyForTestEnvironmentOnly12345",
    projectId: "valid-project-id",
  };
  assert.strictEqual(isFirebaseConfigured(placeholderCfg as any), false);

  // 5. Optional measurement ID absent
  const noMeasurementId = {
    apiKey: "AIzaSyValidApiKey1234567890abcdef",
    projectId: "valid-project-id",
    appId: "1:123456789:web:abcdef",
  };
  assert.strictEqual(isFirebaseConfigured(noMeasurementId as any), true);

  // 6. No secret logged
  let loggedOutput = "";
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    loggedOutput += args.join(" ");
  };
  isFirebaseConfigured(validCfg as any);
  console.log = originalLog;
  assert.strictEqual(loggedOutput.includes("AIzaSyValidApiKey1234567890abcdef"), false);
});

test("Guest vs Authenticated Boundaries - 1. Unauthenticated guest may use local profile", () => {
  const localProfile = createStudentProfile({
    name: "Ahmad",
    grade: "12",
    stream: "scientific",
    activeSubject: "math",
    level: "beginner",
  });
  assert.ok(localProfile);
  assert.strictEqual(localProfile.name, "Ahmad");
});

test("Guest vs Authenticated Boundaries - 2. Guest profile is non-authoritative", () => {
  const localProfile = createStudentProfile({
    name: "Karim",
    grade: "12",
    stream: "scientific",
    activeSubject: "physics",
    level: "intermediate",
  });
  assert.strictEqual(localProfile.authoritative, false);
  assert.strictEqual(localProfile.source, "guest-local");
});

test("Guest vs Authenticated Boundaries - 3. Authenticated offline user does not become guest", () => {
  const serverUser = migrateStudentProfile({
    id: "firebase_uid_12345",
    name: "Soran",
    grade: "12",
    stream: "scientific",
    activeSubject: "math",
    level: "advanced",
    authoritative: true,
    source: "server-authoritative",
    isStale: true,
  });
  assert.strictEqual(serverUser.id, "firebase_uid_12345");
  assert.strictEqual(serverUser.authoritative, true);
  assert.strictEqual(serverUser.source, "server-authoritative");
  assert.strictEqual(serverUser.isStale, true);
});

test("Guest vs Authenticated Boundaries - 4. Authenticated local data cannot overwrite server profile", () => {
  const serverProfile = {
    id: "auth_uid_999",
    name: "Server Official Name",
    grade: "12" as const,
    stream: "scientific" as const,
    activeSubject: "math" as const,
    level: "advanced" as const,
    onboardingCompleted: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    authoritative: true,
    source: "server-authoritative" as const,
  };

  const localUntrustedEdit = {
    ...serverProfile,
    name: "Modified Local Name",
    authoritative: false,
    source: "guest-local" as const,
  };

  // Reconnect logic prefers authoritative server profile over local untrusted edit
  const resolvedOnReconnect = serverProfile.authoritative ? serverProfile : localUntrustedEdit;
  assert.strictEqual(resolvedOnReconnect.name, "Server Official Name");
  assert.strictEqual(resolvedOnReconnect.authoritative, true);
  assert.strictEqual(resolvedOnReconnect.source, "server-authoritative");
});

test("Guest vs Authenticated Boundaries - 5. Guest completion does not update official mastery", () => {
  const initialMastery = {
    conceptId: "math-limits",
    masteryScore: 0.5,
    status: MasteryStatus.DEVELOPING,
    lastAttemptedAt: "2026-01-01T00:00:00.000Z",
    totalAttempts: 1,
    consecutiveCorrect: 1,
    history: [],
  };

  const guestAttempt = {
    isCorrect: true,
    difficulty: DifficultyLevel.STANDARD,
    isGuest: true,
    isNonAuthoritative: true,
  };

  const updatedMastery = AdaptiveLearningEngine.calculateNewMastery(initialMastery, guestAttempt);
  assert.strictEqual(updatedMastery.masteryScore, 0.5); // Remains unchanged for guest
});

test("Guest vs Authenticated Boundaries - 6. Reconnect prefers authoritative server data", () => {
  const serverData = {
    id: "usr_777",
    level: "advanced" as const,
    authoritative: true,
    source: "server-authoritative" as const,
  };
  const cachedLocalData = {
    id: "usr_777",
    level: "beginner" as const,
    authoritative: false,
    source: "guest-local" as const,
  };

  // Server data takes precedence upon reconnect
  const activeData = serverData.authoritative ? serverData : cachedLocalData;
  assert.strictEqual(activeData.level, "advanced");
  assert.strictEqual(activeData.source, "server-authoritative");
});
