import { test } from "node:test";
import assert from "node:assert";
import {
  PlanningValidation,
  PersonalLearningPlanEngine,
  NextBestActionEngine,
  StudyTaskPrioritizer,
  PrerequisitePlanner,
  ReviewScheduler,
  PersistentLearningPlanProvider,
  InMemoryLearningPlanProvider,
  StudyTaskStatus,
  StudyTaskType,
  LearningGoalType,
  GoalStatus
} from "./index.ts";
import { StudentMasteryProfile } from "../learning/domain/MasteryTypes.ts";

test("1. PlanningValidation - empty input produces safe defaults", () => {
  const prefs = PlanningValidation.validatePreferences("student_1");
  assert.strictEqual(prefs.studentId, "student_1");
  assert.strictEqual(prefs.preferredStudyDays.length, 7);
  assert.strictEqual(prefs.preferredSessionLengthMinutes, 30);
  assert.strictEqual(prefs.maxTasksPerDay, 5);
});

test("1. PlanningValidation - clamps session length and tasks per day", () => {
  const prefs = PlanningValidation.validatePreferences("student_1", {
    preferredSessionLengthMinutes: 5,
    maxTasksPerDay: 25
  });
  assert.strictEqual(prefs.preferredSessionLengthMinutes, 10);
  assert.strictEqual(prefs.maxTasksPerDay, 15);
});

test("1. PlanningValidation - validates exam date", () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const futureStr = futureDate.toISOString().split("T")[0];

  const validPrefs = PlanningValidation.validatePreferences("student_1", { targetExamDate: futureStr });
  assert.strictEqual(validPrefs.targetExamDate, futureStr);

  assert.throws(() => {
    PlanningValidation.validatePreferences("student_1", { targetExamDate: "2020-01-01" });
  }, /تاریخی تاقیکردنەوە ناتوانێت لە ڕابردوودا بێت/);
});

test("2. PersonalLearningPlanEngine - generates structured plan", () => {
  const engine = new PersonalLearningPlanEngine();
  const prefs = PlanningValidation.validatePreferences("student_1");
  const goal = {
    id: "goal_1",
    studentId: "student_1",
    type: LearningGoalType.IMPROVE_SUBJECT,
    titleKu: "بیرکاری",
    targetSubjectId: "subject-math-g9",
    weeklyTargetMinutes: 180,
    successCriteria: { metric: "mastery_score" as const, targetValue: 0.8 },
    status: GoalStatus.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const profile: StudentMasteryProfile = {
    studentId: "student_1",
    overallMasteryScore: 0,
    conceptMasteries: {},
    activeMisconceptions: [],
    recentRecommendedActions: []
  };

  const plan = engine.generatePlan({
    studentId: "student_1",
    preferences: prefs,
    goal,
    masteryProfile: profile
  });

  assert.strictEqual(plan.studentId, "student_1");
  assert.strictEqual(plan.weeklyPlans.length, 1);
  assert.strictEqual(plan.weeklyPlans[0].dailyPlans.length, 7);
  assert.strictEqual(plan.authoritative, true);
});

test("3. NextBestActionEngine - cold start & rest recommendations", () => {
  const engine = new NextBestActionEngine();
  const action1 = engine.determineNextBestAction({});
  assert.strictEqual(action1.actionType, "TAKE_DIAGNOSTIC");

  const action2 = engine.determineNextBestAction({
    completedMinutesToday: 60,
    maxMinutesToday: 60
  });
  assert.strictEqual(action2.actionType, "REST_AND_RESUME");
});

test("4. StudyTaskPrioritizer - prerequisite score calculation", () => {
  const res = StudyTaskPrioritizer.calculatePriority(StudyTaskType.PREREQUISITE, {
    isPrerequisiteForTarget: true
  });
  assert.ok(res.score >= 40);
  assert.strictEqual(res.reason.code, "PREREQUISITE_MISSING");
});

test("5. Task State Machine - transitions", () => {
  assert.strictEqual(PlanningValidation.validateTaskTransition(StudyTaskStatus.PLANNED, StudyTaskStatus.IN_PROGRESS), true);
  assert.strictEqual(PlanningValidation.validateTaskTransition(StudyTaskStatus.IN_PROGRESS, StudyTaskStatus.COMPLETED), true);
  assert.strictEqual(PlanningValidation.validateTaskTransition(StudyTaskStatus.COMPLETED, StudyTaskStatus.IN_PROGRESS), false);
});

test("6. LearningPlanProvider (InMemory)", async () => {
  const provider = new InMemoryLearningPlanProvider();
  const prefs = PlanningValidation.validatePreferences("student_test");
  await provider.savePreferences(prefs);

  const fetched = await provider.getPreferences("student_test");
  assert.notStrictEqual(fetched, null);
  assert.strictEqual(fetched?.studentId, "student_test");
});

test("7. PersistentLearningPlanProvider - production fail-closed without KV", () => {
  assert.throws(() => {
    new PersistentLearningPlanProvider(undefined, "production");
  }, /Cloudflare KV binding/);
});
