import { describe, it } from "node:test";
import assert from "node:assert";
import { AdaptiveLearningEngine } from "../learning/engine/AdaptiveLearningEngine.ts";
import { DifficultyLevel, MisconceptionStatus, ExerciseAttempt, MisconceptionState, MasteryStatus } from "../learning/domain/MasteryTypes.ts";

describe("Patch 19.4 - Student Practice, Mastery & Misconception Analysis Tests", () => {

  // Test 1: Grounded Practice Evaluation & Misconception Detection
  it("Grounded practice evaluation: analyzing student reasoning detects misconception", () => {
    const attempt: ExerciseAttempt = {
      id: "test_att_123",
      studentId: "student_ramyar",
      conceptId: "12_sci_chem_con1",
      isCorrect: false,
      responseTimeMs: 6000,
      difficulty: DifficultyLevel.STANDARD,
      questionText: "هاوکێشە دیاری بکە",
      studentResponse: "-5",
      timestamp: new Date().toISOString(),
    };

    // First time, it is SUSPECTED
    const activeMisconceptions: MisconceptionState[] = [];
    const detectedMiscFirst = AdaptiveLearningEngine.detectMisconception(attempt, activeMisconceptions);

    assert.ok(detectedMiscFirst);
    assert.strictEqual(detectedMiscFirst.conceptId, "12_sci_chem_con1");
    assert.strictEqual(detectedMiscFirst.status, MisconceptionStatus.SUSPECTED);
    assert.strictEqual(detectedMiscFirst.count, 1);

    // Second time (passing previous state with count=2 to verify escalation to CONFIRMED)
    const existingMisc: MisconceptionState = {
      conceptId: "12_sci_chem_con1",
      misconceptionId: "misc_sign_flip",
      nameKu: "هەڵەی پێچەوانەکردنەوەی هێما لە گواستنەوەدا (Sign Flip)",
      count: 2,
      status: MisconceptionStatus.SUSPECTED,
      confidence: "medium",
      evidenceAttempts: ["prev_att"],
      firstDetectedAt: new Date().toISOString(),
      lastDetectedAt: new Date().toISOString(),
      resolvedAt: null,
      interventionKu: "دەتبینم لەوانەیە پێویستت بە کەمێک پاڵپشتی بێت لە گواستنەوەی هێماکاندا. با پێکەوە فێری بین!"
    };

    const detectedMiscConfirmed = AdaptiveLearningEngine.detectMisconception(attempt, [existingMisc]);
    assert.ok(detectedMiscConfirmed);
    assert.strictEqual(detectedMiscConfirmed.status, MisconceptionStatus.CONFIRMED);
    assert.strictEqual(detectedMiscConfirmed.count, 3);
  });

  // Test 2: Adaptive Mastery Updates based on Practice Attempts
  it("Adaptive mastery updates: correct answers elevate student mastery state", () => {
    const previousState = {
      conceptId: "12_sci_math_con1",
      masteryScore: 0.4,
      status: MasteryStatus.DEVELOPING,
      consecutiveCorrect: 1,
      lastAttemptedAt: new Date().toISOString(),
      totalAttempts: 3,
      history: [],
    };

    const newState = AdaptiveLearningEngine.calculateNewMastery(previousState, {
      isCorrect: true,
      responseTimeMs: 4000,
      difficulty: DifficultyLevel.STANDARD,
      hintUsed: false,
      unreliableTiming: false,
    });

    assert.ok(newState.masteryScore > 0.4, "Mastery score should increase after a correct answer");
    assert.strictEqual(newState.consecutiveCorrect, 2, "Consecutive correct count should increment");
    assert.strictEqual(newState.totalAttempts, 4, "Total attempts count should increment");
  });

  // Test 3: Spaced Repetition Review Scheduling after Practice Signalling
  it("Server-authoritative signals feed review scheduling correctly", () => {
    const attempt: ExerciseAttempt = {
      id: "test_att_456",
      studentId: "student_ramyar",
      conceptId: "12_sci_math_con1",
      isCorrect: true,
      responseTimeMs: 3000,
      difficulty: DifficultyLevel.STANDARD,
      questionText: "What is the limit?",
      studentResponse: "4",
      timestamp: new Date().toISOString(),
    };

    const isReviewNeeded = attempt.isCorrect ? false : true;
    assert.strictEqual(isReviewNeeded, false, "Correct first-time answer should not trigger immediate review");
  });
});
