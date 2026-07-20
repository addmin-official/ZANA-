import { test } from "node:test";
import assert from "node:assert";
import {
  QuestionBankProvider,
  AnswerGrader,
  PartialCreditEngine,
  DifficultySelector,
  QuizTerminationPolicy,
  AdaptiveQuizEngine,
  InMemoryAssessmentRecordProvider,
  AssessmentService,
  AssessmentBlueprint,
  AssessmentType,
  QuestionType,
  AnswerSubmission,
  AssessmentStatus
} from "./index.ts";
import { InMemoryLearningRecordProvider } from "../learning/providers/LearningRecordProvider.ts";
import { DifficultyLevel, MasteryStatus } from "../learning/domain/MasteryTypes.ts";

test("Assessment Intelligence - Question Bank and Answer Leak Prevention", () => {
  const provider = QuestionBankProvider.getInstance();
  
  // Verify curated questions exist
  const questions = provider.queryQuestions({ curriculumId: "curriculum-zana-default" });
  assert.ok(questions.length >= 4, "Should have seeded at least 4 math questions");

  // Verify answer strip helper prevents leakages
  const firstQ = questions[0];
  const publicQ = provider.toPublicQuestion(firstQ);

  // Correct answer definitions must not be present in public representation
  assert.strictEqual((publicQ as any).correctAnswer, undefined, "Answer key must be stripped!");
  assert.strictEqual((publicQ as any).explanationKu, undefined, "Explanation must be stripped!");
});

test("Assessment Intelligence - Authoritative Server Grading and Misconception Mapping", () => {
  const provider = QuestionBankProvider.getInstance();
  const q4 = provider.getQuestion("q_alg_l2_02"); // Solve 2x - 4 = 10, correct is 7
  assert.ok(q4, "Numeric equation question should exist");

  // Test Correct numeric submission
  const correctSub: AnswerSubmission = {
    questionId: q4.id,
    numericValue: 7,
    responseTimeMs: 3500
  };
  const correctAttempt = AnswerGrader.gradeSubmission(q4, correctSub);
  assert.strictEqual(correctAttempt.isCorrect, true);
  assert.strictEqual(correctAttempt.partialCreditScore, 1.0);
  assert.strictEqual(correctAttempt.misconceptionDetectedId, undefined);

  // Test Incorrect numeric submission triggering sign flip misconception (student answered 3)
  const signFlipSub: AnswerSubmission = {
    questionId: q4.id,
    numericValue: 3,
    responseTimeMs: 8000
  };
  const incorrectAttempt = AnswerGrader.gradeSubmission(q4, signFlipSub);
  assert.strictEqual(incorrectAttempt.isCorrect, false);
  assert.strictEqual(incorrectAttempt.partialCreditScore, 0.0);
  assert.strictEqual(incorrectAttempt.misconceptionDetectedId, "misc_sign_flip");
  assert.ok(incorrectAttempt.feedbackKu.includes("نیشانە") || incorrectAttempt.feedbackKu.includes("هێما"), "Remedial feedback must mention sign adjustments");
});

test("Assessment Intelligence - Partial Credit Math Engine", () => {
  const correctMCDef = {
    multipleOptionIds: ["opt1", "opt2", "opt3"]
  };

  // 1. Correct selection with positive partial points
  const subPartial: AnswerSubmission = {
    questionId: "test_q",
    selectedOptionIds: ["opt1", "opt2"], // missed opt3, but chose correct ones
    responseTimeMs: 2000
  };

  const resPartial = PartialCreditEngine.calculateCredit(
    QuestionType.MULTIPLE_CHOICE_MULTIPLE,
    correctMCDef,
    subPartial
  );
  // Score should be (2 correct - 0 incorrect) / 3 total correct = 0.667
  assert.ok(resPartial.score > 0.6 && resPartial.score < 0.7);

  // 2. Guessing all options (penalized incorrect)
  const subGuessAll: AnswerSubmission = {
    questionId: "test_q",
    selectedOptionIds: ["opt1", "opt2", "opt3", "opt_wrong"], // got all 3 correct but also chose 1 incorrect
    responseTimeMs: 2000
  };

  const resGuess = PartialCreditEngine.calculateCredit(
    QuestionType.MULTIPLE_CHOICE_MULTIPLE,
    correctMCDef,
    subGuessAll
  );
  // Score should be (3 correct - 1 incorrect) / 3 total = 2/3 = 0.667
  assert.ok(resGuess.score > 0.6 && resGuess.score < 0.7);
});

test("Assessment Intelligence - Adaptive Stepping and Early Stopping Pathways", () => {
  // Test starting difficulty
  const startDiff = DifficultySelector.selectInitialDifficulty(0.1);
  assert.strictEqual(startDiff, DifficultyLevel.EASY);

  // Test difficulty adaptation
  const stepUp = DifficultySelector.selectNextDifficulty(DifficultyLevel.STANDARD, true, 1);
  assert.strictEqual(stepUp, DifficultyLevel.CHALLENGING);

  const stepDown = DifficultySelector.selectNextDifficulty(DifficultyLevel.STANDARD, false, 1);
  assert.strictEqual(stepDown, DifficultyLevel.EASY);

  // Test early stopping policy triggers
  const mockAttempts: any[] = [
    { isCorrect: true, maxScore: 1.0, partialCreditScore: 1.0, id: "q1_standard", submission: { responseTimeMs: 1000 } },
    { isCorrect: true, maxScore: 1.0, partialCreditScore: 1.0, id: "q2_challenging", submission: { responseTimeMs: 1000 } },
    { isCorrect: true, maxScore: 1.0, partialCreditScore: 1.0, id: "q3_challenging", submission: { responseTimeMs: 1000 } },
    { isCorrect: true, maxScore: 1.0, partialCreditScore: 1.0, id: "q4_advanced", submission: { responseTimeMs: 1000 } },
    { isCorrect: true, maxScore: 1.0, partialCreditScore: 1.0, id: "q5_advanced", submission: { responseTimeMs: 1000 } }
  ];

  const termDecision = QuizTerminationPolicy.shouldTerminate(mockAttempts);
  assert.strictEqual(termDecision.terminate, true, "Should terminate early on high correct streak");
  assert.ok(termDecision.reasonKu.includes("ئاست"), "Reason must suggest mastery confidence");
});

test("Assessment Intelligence - Full End-to-End Orchestrated Integration", async () => {
  const recordProvider = new InMemoryAssessmentRecordProvider();
  const learningProvider = new InMemoryLearningRecordProvider();
  const service = new AssessmentService(recordProvider);

  const blueprint: AssessmentBlueprint = {
    id: "bp_test_mastery_algebra",
    type: AssessmentType.MASTERY_CHECK,
    curriculumId: "curriculum-zana-default",
    grade: "9",
    subjectId: "math",
    unitId: "foundations-of-algebra",
    totalQuestions: 5,
    targetDurationSeconds: 300,
    difficultyDistribution: {
      [DifficultyLevel.FOUNDATION]: 0.1,
      [DifficultyLevel.EASY]: 0.2,
      [DifficultyLevel.STANDARD]: 0.4,
      [DifficultyLevel.CHALLENGING]: 0.2,
      [DifficultyLevel.ADVANCED]: 0.1
    },
    questionTypeDistribution: {
      [QuestionType.MULTIPLE_CHOICE_SINGLE]: 0.8,
      [QuestionType.MULTIPLE_CHOICE_MULTIPLE]: 0.0,
      [QuestionType.TRUE_FALSE]: 0.2,
      [QuestionType.SHORT_ANSWER]: 0.0,
      [QuestionType.NUMERIC]: 0.0,
      [QuestionType.ORDERING]: 0.0,
      [QuestionType.MATCHING]: 0.0
    },
    learningObjectives: ["LOB1"],
    masteryObjectives: ["MOB1"],
    passingThresholdPercentage: 70,
    partialCreditPolicy: "strict",
    retryPolicy: { maxRetries: 3, cooldownSeconds: 0 },
    randomizationRules: { shuffleQuestions: false, shuffleOptions: false }
  };

  // 1. Start the adaptive assessment
  const studentId = "student_zana_01";
  const { attempt, firstQuestion } = await service.startAssessment(
    studentId,
    blueprint,
    "تاقیکردنەوەی لێهاتوویی جەبر",
    "تکایە بە وریاییەوە پرسیارەکان بخوێنەرەوە.",
    0.3 // initial mastery
  );

  assert.ok(attempt.id);
  assert.strictEqual(attempt.status, AssessmentStatus.IN_PROGRESS);
  assert.ok(firstQuestion);

  // 2. Authoritative Submit and check automatic Phase 15 student mastery updates
  const submission: AnswerSubmission = {
    questionId: firstQuestion.id,
    selectedOptionIds: ["opt_b"], // Submit opt_b (correct answer) for MCQ Single variables translation
    responseTimeMs: 4000
  };

  const stepResult = await service.submitAnswer(
    attempt.id,
    firstQuestion.id,
    submission,
    learningProvider,
    blueprint
  );

  assert.ok(stepResult.gradedAttempt);
  assert.strictEqual(stepResult.gradedAttempt.questionId, firstQuestion.id);

  // Inspect that StudentMasteryProfile was automatically updated in Phase 15 learning provider!
  const profile = await learningProvider.getStudentMasteryProfile(studentId);
  const activeConceptId = firstQuestion.conceptId || "unknown";
  const masteryState = profile.conceptMasteries[activeConceptId]; // first question concept
  assert.ok(masteryState, "Mastery state must be seeded under learning record provider");
  assert.strictEqual(masteryState.totalAttempts, 1);
  assert.ok(masteryState.masteryScore > 0, "Mastery score must be calculated");
});
