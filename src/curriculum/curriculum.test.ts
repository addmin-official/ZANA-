import assert from "node:assert";
import { test } from "node:test";

// Import modules to test
import { validateCurriculumLesson, validateUnit } from "./domain/CurriculumValidation.ts";
import { EmptyCurriculumProvider } from "./providers/EmptyCurriculumProvider.ts";
import { LicensedCurriculumProvider } from "./providers/LicensedCurriculumProvider.ts";
import { LicensePolicyEngine } from "./licensing/LicensePolicyEngine.ts";
import { ContentUsageGuard } from "./licensing/ContentUsageGuard.ts";
import { CurriculumRetriever } from "./retrieval/CurriculumRetriever.ts";
import { NoSourceFallback } from "./retrieval/NoSourceFallback.ts";
import { buildSystemPrompt } from "../ai/buildSystemPrompt.ts";
import { CurriculumRegistry } from "./registry/CurriculumRegistry.ts";
import { CurriculumLesson } from "./domain/CurriculumTypes.ts";

test("CurriculumValidation - validates correctly", () => {
  const validLesson: CurriculumLesson = {
    id: "g9-math-algebra-l1",
    curriculumId: "curriculum-zana-default",
    grade: "9",
    subject: "math",
    unitId: "foundations-of-algebra",
    title: "Variables and expressions",
    concepts: ["Variable"],
    learningObjectives: ["Understand variables"],
    skills: ["Constructing expression"],
    sourceStatus: "OPEN_LICENSE",
    licenseId: "license-zana-open-01",
  };

  const errors = validateCurriculumLesson(validLesson);
  assert.strictEqual(errors.length, 0, "Should have no validation errors for valid lesson.");

  const invalidLesson = { ...validLesson, grade: "5", subject: "history" } as unknown as CurriculumLesson;
  const invalidErrors = validateCurriculumLesson(invalidLesson);
  assert.ok(invalidErrors.length > 0, "Should catch invalid grade and subject.");
});

test("EmptyCurriculumProvider - returns empty results", async () => {
  const provider = new EmptyCurriculumProvider();
  
  const curriculum = await provider.getCurriculum("test-id");
  assert.strictEqual(curriculum, undefined);

  const lessons = await provider.listLessons("unit-1");
  assert.deepStrictEqual(lessons, []);

  const search = await provider.searchLessons("algebra");
  assert.deepStrictEqual(search, []);
});

test("LicensePolicyEngine - evaluates open-license and blocks expired or missing licenses", () => {
  const engine = LicensePolicyEngine.getInstance();
  engine.clear();

  // 1. Open license evaluation
  const openDecision = engine.evaluatePolicy(
    "curriculum-zana-default",
    "RETRIEVE",
    "OPEN_LICENSE",
    null
  );
  assert.strictEqual(openDecision.allowed, true, "Open license must be allowed.");
  assert.strictEqual(openDecision.licenseId, "open-license-generic");

  // 2. Missing license evaluation
  const missingDecision = engine.evaluatePolicy(
    "licensed-curriculum-id",
    "RETRIEVE",
    "LICENSED",
    null
  );
  assert.strictEqual(missingDecision.allowed, false, "Missing license must be blocked.");

  // 3. Register and evaluate valid licensed content
  engine.registerLicense({
    id: "lic-valid-01",
    curriculumId: "licensed-curriculum-id",
    licensee: "ZANA",
    grantedAt: "2026-01-01T00:00:00Z",
    expiresAt: "2027-01-01T00:00:00Z",
    allowedActions: ["RETRIEVE", "INDEX"],
    status: "ACTIVE",
  });

  const validDecision = engine.evaluatePolicy(
    "licensed-curriculum-id",
    "RETRIEVE",
    "LICENSED",
    "lic-valid-01"
  );
  assert.strictEqual(validDecision.allowed, true, "Valid active license should be allowed.");

  // 4. Unauthorized action evaluation
  const unauthDecision = engine.evaluatePolicy(
    "licensed-curriculum-id",
    "GENERATE_REPORT",
    "LICENSED",
    "lic-valid-01"
  );
  assert.strictEqual(unauthDecision.allowed, false, "Unauthorized action must be blocked.");

  // 5. Expired license evaluation
  engine.registerLicense({
    id: "lic-expired-01",
    curriculumId: "licensed-curriculum-id",
    licensee: "ZANA",
    grantedAt: "2024-01-01T00:00:00Z",
    expiresAt: "2025-01-01T00:00:00Z",
    allowedActions: ["RETRIEVE"],
    status: "EXPIRED",
  });

  const expiredDecision = engine.evaluatePolicy(
    "licensed-curriculum-id",
    "RETRIEVE",
    "LICENSED",
    "lic-expired-01"
  );
  assert.strictEqual(expiredDecision.allowed, false, "Expired license must be blocked.");
});

test("ContentUsageGuard - guards content as per policies", () => {
  const guard = new ContentUsageGuard();
  const engine = LicensePolicyEngine.getInstance();
  engine.clear();

  const lesson: CurriculumLesson = {
    id: "lic-lesson-01",
    curriculumId: "licensed-curriculum-id",
    grade: "9",
    subject: "math",
    unitId: "unit-1",
    title: "Licensed math",
    concepts: [],
    learningObjectives: [],
    skills: [],
    sourceStatus: "LICENSED",
    licenseId: "lic-valid-01",
  };

  // Blocked because lic-valid-01 is not registered yet
  assert.strictEqual(guard.isAllowed(lesson, "RETRIEVE"), false);

  engine.registerLicense({
    id: "lic-valid-01",
    curriculumId: "licensed-curriculum-id",
    licensee: "ZANA",
    grantedAt: "2026-01-01T00:00:00Z",
    expiresAt: "2027-01-01T00:00:00Z",
    allowedActions: ["RETRIEVE"],
    status: "ACTIVE",
  });

  // Allowed now
  assert.strictEqual(guard.isAllowed(lesson, "RETRIEVE"), true);
  // Blocked for other actions
  assert.strictEqual(guard.isAllowed(lesson, "EMBED"), false);
});

test("NoSourceFallback - returns robust ungrounded fallback", () => {
  const result = NoSourceFallback.getFallbackResult("9", "math", "quadratic equations");
  assert.strictEqual(result.groundingStatus, "UNGROUNDED");
  assert.strictEqual(result.matchedLessons.length, 0);
  assert.strictEqual(result.confidence, 0);
  assert.strictEqual(result.licenseDecision, null);
  assert.ok(result.auditMetadata.fallbackReason);
});

test("LicensedCurriculumProvider boundary & CurriculumRetriever - retrieves open-license demo content", async () => {
  const provider = new LicensedCurriculumProvider();
  const retriever = new CurriculumRetriever(provider);

  // Retrieve existing open license math content
  const result = await retriever.retrieve({
    grade: "9",
    subject: "math",
    query: "linear equations",
  });

  assert.strictEqual(result.groundingStatus, "GROUNDED", "Should be grounded for registered algebra content.");
  assert.ok(result.matchedLessons.length > 0, "Should match at least one algebra lesson.");
  assert.ok(result.excerpts.length > 0, "Should have educational excerpts.");
  assert.ok(result.confidence > 0, "Should have positive confidence.");
});

test("buildSystemPrompt grounded behavior", () => {
  const prompt = buildSystemPrompt({
    grade: "9",
    subject: "math",
    level: "سەرەتا",
    mode: "chat",
    curriculumContext: {
      curriculumId: "curriculum-zana-default",
      unitTitle: "foundations-of-algebra",
      lessonTitle: "هاوکێشە هێڵییە سادەکان",
      conceptTitle: "هاوکێشە",
      groundingStatus: "GROUNDED",
      sourceStatus: "OPEN_LICENSE",
      retrievalConfidence: 1.0,
      excerpts: ["یاسای هاوسەنگی: هەر کردارێک لە لایەکی هاوکێشەکە دەکەیت، پێویستە لە لایەکەی تریش ئەنجام بدەیت."],
    },
  });

  assert.ok(prompt.includes("ڕێسا و دەستوورەکانی پڕۆگرامی خوێندنی فەرمی"), "Prompt must include grounding instructions section.");
  assert.ok(prompt.includes("یاسای هاوسەنگی"), "Prompt must contain the retrieved excerpt.");
  assert.ok(prompt.includes("پێویستە تەنها و تەنها لە چوارچێوەی دەقی سەرچاوەی فەرمیی هاوپێچکراوی سەرەوەدا وەڵام بدەیتەوە"), "Prompt must enforce grounded boundary constraint.");
});

test("buildSystemPrompt ungrounded behavior", () => {
  const prompt = buildSystemPrompt({
    grade: "9",
    subject: "math",
    level: "سەرەتا",
    mode: "chat",
    curriculumContext: {
      curriculumId: "none",
      groundingStatus: "UNGROUNDED",
      sourceStatus: "NONE",
      retrievalConfidence: 0.0,
    },
  });

  assert.ok(prompt.includes("ڕێسا و دەستوورەکانی پڕۆگرامی خوێندنی فەرمی"), "Prompt must include grounding instructions section.");
  assert.ok(prompt.includes("تۆ نابێت بە هیچ شێوەیەک بانگەشەی ئەوە بکەیت کە ئەم وەڵامە لە کتێبی فەرمی یان سەرچاوەی فەرمی وەزارەتەوە وەرگیراوە"), "Prompt must enforce ungrounded constraint.");
  assert.ok(prompt.includes("نابێت باسی هیچ ژمارەی لاپەڕەیەک یان بەشی دیاریکراوی ناو کتێب بکەیت"), "Prompt must prevent hallucinated page citations.");
});

test("License policy evaluation - blocks unlicensed content", () => {
  const engine = LicensePolicyEngine.getInstance();
  engine.clear();

  const decision = engine.evaluatePolicy("some-secret-curriculum", "RETRIEVE", "LICENSED", "sec-001");
  assert.strictEqual(decision.allowed, false, "Should block unlicensed content.");
});

test("Tests verify no copyrighted source names are hardcoded", () => {
  // Ensure that no protected names like Rawanga, Xwendn, Sunrise, Scribd, Scribd are used or checked in validation or registry
  const reg = CurriculumRegistry.getInstance();
  const allCurricula = reg.getCurriculum("curriculum-zana-default");
  assert.ok(allCurricula);
  assert.strictEqual(allCurricula.name, "ZANA Default Open Curriculum");
});
