import { test } from "node:test";
import assert from "node:assert";
import { AdaptiveLearningEngine } from "./AdaptiveLearningEngine.ts";
import { MasteryStatus, DifficultyLevel, MisconceptionStatus } from "../domain/MasteryTypes.ts";

test("AdaptiveLearningEngine - Mastery Score Calculations", () => {
  // Test baseline mastery calculation
  const initMastery = AdaptiveLearningEngine.calculateNewMastery(null, {
    isCorrect: true,
    responseTimeMs: 3000,
    difficulty: DifficultyLevel.STANDARD // medium difficulty
  });

  assert.strictEqual(initMastery.totalAttempts, 1);
  assert.strictEqual(initMastery.consecutiveCorrect, 1);
  assert.ok(initMastery.masteryScore > 0);
  assert.strictEqual(initMastery.status, MasteryStatus.INTRODUCED);

  // Test decay on wrong answer
  const wrongMastery = AdaptiveLearningEngine.calculateNewMastery(initMastery, {
    isCorrect: false,
    responseTimeMs: 12000,
    difficulty: DifficultyLevel.STANDARD
  });

  assert.strictEqual(wrongMastery.totalAttempts, 2);
  assert.strictEqual(wrongMastery.consecutiveCorrect, 0);
  assert.ok(wrongMastery.masteryScore < initMastery.masteryScore);
});

test("AdaptiveLearningEngine - Misconception Detection", () => {
  const mockAttempt = {
    id: "att_1",
    studentId: "stud_1",
    conceptId: "hawkisha",
    isCorrect: false,
    responseTimeMs: 5000,
    difficulty: DifficultyLevel.EASY,
    questionText: "شیکاری هاوکێشە بکە: x + 5 = 10",
    studentResponse: "x = -5",
    timestamp: new Date().toISOString()
  };

  const detected = AdaptiveLearningEngine.detectMisconception(mockAttempt, []);
  assert.ok(detected !== null);
  assert.strictEqual(detected.misconceptionId, "misc_sign_flip");
  assert.strictEqual(detected.count, 1);
});

test("AdaptiveLearningEngine - Difficulty Adaptation Logic", () => {
  const easyHistory = [{ isCorrect: false }, { isCorrect: false }];
  const easyDiff = AdaptiveLearningEngine.adaptDifficulty("concept_1", easyHistory);
  assert.strictEqual(easyDiff, DifficultyLevel.FOUNDATION); // should suggest FOUNDATION on complete failures

  const hardHistory = [{ isCorrect: true }, { isCorrect: true }, { isCorrect: true }];
  const hardDiff = AdaptiveLearningEngine.adaptDifficulty("concept_1", hardHistory);
  assert.strictEqual(hardDiff, DifficultyLevel.CHALLENGING); // should suggest CHALLENGING on consecutive successes
});

test("AdaptiveLearningEngine - Prerequisite Cycle Detection", () => {
  const prereqGraph = {
    "A": ["B"],
    "B": ["C"],
    "C": ["A"] // cycle
  };

  const hasCycle = AdaptiveLearningEngine.hasPrerequisiteCycle(prereqGraph, "A");
  assert.strictEqual(hasCycle, true);

  const cleanGraph = {
    "A": ["B"],
    "B": ["C"],
    "C": []
  };
  const hasNoCycle = AdaptiveLearningEngine.hasPrerequisiteCycle(cleanGraph, "A");
  assert.strictEqual(hasNoCycle, false);
});
