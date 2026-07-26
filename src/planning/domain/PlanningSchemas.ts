import { DifficultyLevel } from "../../learning/domain/MasteryTypes.ts";
import {
  GoalStatus,
  LearningGoal,
  LearningGoalType,
  LearningPlan,
  PlanGenerationMode,
  PlanProgress,
  ReviewItem,
  StudentLearningPreferences,
  StudyTask,
  StudyTaskPriority,
  StudyTaskStatus,
  StudyTaskType,
} from "./LearningPlanTypes.ts";

export type PlanningGuard<T> = (value: unknown) => value is T;

export function isPlanningRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isNumber);
}

function isStringNumberRecord(value: unknown): value is Record<string, number> {
  return isPlanningRecord(value) && Object.values(value).every(isNumber);
}

function isDifficultyLevel(value: unknown): value is DifficultyLevel {
  return Object.values(DifficultyLevel).includes(value as DifficultyLevel);
}

function isGoalStatus(value: unknown): value is GoalStatus {
  return Object.values(GoalStatus).includes(value as GoalStatus);
}

function isGoalType(value: unknown): value is LearningGoalType {
  return Object.values(LearningGoalType).includes(value as LearningGoalType);
}

function isStudyTaskType(value: unknown): value is StudyTaskType {
  return Object.values(StudyTaskType).includes(value as StudyTaskType);
}

function isStudyTaskStatus(value: unknown): value is StudyTaskStatus {
  return Object.values(StudyTaskStatus).includes(value as StudyTaskStatus);
}

function isStudyTaskPriority(value: unknown): value is StudyTaskPriority {
  return Object.values(StudyTaskPriority).includes(value as StudyTaskPriority);
}

export function isPlanGenerationMode(value: unknown): value is PlanGenerationMode {
  return [
    "FIRST_TIME_PLAN",
    "WEEKLY_REFRESH",
    "DAILY_REFRESH",
    "POST_ASSESSMENT_UPDATE",
    "MISSED_TASK_RECOVERY",
    "EXAM_PREPARATION",
    "MANUAL_REPLAN",
  ].includes(String(value));
}

function isGoalSuccessCriteria(value: unknown): boolean {
  return (
    isPlanningRecord(value) &&
    ["mastery_score", "completed_tasks", "study_minutes", "streak_days", "assessment_score"].includes(
      String(value.metric)
    ) &&
    isNumber(value.targetValue) &&
    (value.currentValue === undefined || isNumber(value.currentValue))
  );
}

export function isStudentLearningPreferences(value: unknown): value is StudentLearningPreferences {
  if (!isPlanningRecord(value) || !isPlanningRecord(value.reminderPreference)) return false;
  const available = value.availableMinutesPerDay;
  return (
    isString(value.studentId) &&
    isNumberArray(value.preferredStudyDays) &&
    isStringNumberRecord(available) &&
    ["MORNING", "AFTERNOON", "EVENING", "NIGHT", "FLEXIBLE"].includes(String(value.preferredStudyTime)) &&
    isNumber(value.preferredSessionLengthMinutes) &&
    isNumber(value.maxTasksPerDay) &&
    isStringArray(value.preferredSubjects) &&
    isStringArray(value.difficultSubjects) &&
    (value.targetExamDate === undefined || isString(value.targetExamDate)) &&
    isNumber(value.weeklyGoalMinutes) &&
    isBoolean(value.reminderPreference.enabled) &&
    (value.reminderPreference.preferredHour === undefined || isNumber(value.reminderPreference.preferredHour)) &&
    (value.reminderPreference.channel === undefined ||
      ["IN_APP", "PUSH", "EMAIL"].includes(String(value.reminderPreference.channel))) &&
    ["ku", "ar", "en"].includes(String(value.preferredLanguage)) &&
    isString(value.updatedAt)
  );
}

export function isLearningGoal(value: unknown): value is LearningGoal {
  return (
    isPlanningRecord(value) &&
    isString(value.id) &&
    isString(value.studentId) &&
    isGoalType(value.type) &&
    isString(value.titleKu) &&
    isString(value.targetSubjectId) &&
    (value.targetCurriculumScope === undefined || isStringArray(value.targetCurriculumScope)) &&
    (value.targetDate === undefined || isString(value.targetDate)) &&
    isNumber(value.weeklyTargetMinutes) &&
    isGoalSuccessCriteria(value.successCriteria) &&
    isGoalStatus(value.status) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isStudyTaskReason(value: unknown): boolean {
  return (
    isPlanningRecord(value) &&
    [
      "LOW_MASTERY",
      "MISCONCEPTION_ACTIVE",
      "PREREQUISITE_MISSING",
      "SPACED_REVIEW_DUE",
      "ASSESSMENT_WEAKNESS",
      "EXAM_APPROACHING",
      "DAILY_HABIT",
      "RETRY_INCOMPLETE",
      "CURRICULUM_PROGRESS",
    ].includes(String(value.code)) &&
    isStringArray(value.evidenceIds) &&
    isString(value.descriptionKu)
  );
}

export function isStudyTask(value: unknown): value is StudyTask {
  return (
    isPlanningRecord(value) &&
    isString(value.id) &&
    isString(value.planId) &&
    isString(value.studentId) &&
    isStudyTaskType(value.type) &&
    isStudyTaskStatus(value.status) &&
    isStudyTaskPriority(value.priority) &&
    isNumber(value.priorityScore) &&
    isString(value.titleKu) &&
    isString(value.descriptionKu) &&
    isString(value.subjectId) &&
    (value.unitId === undefined || isString(value.unitId)) &&
    (value.lessonId === undefined || isString(value.lessonId)) &&
    (value.conceptId === undefined || isString(value.conceptId)) &&
    (value.prerequisiteForConceptId === undefined || isString(value.prerequisiteForConceptId)) &&
    isStudyTaskReason(value.reason) &&
    isNumber(value.estimatedDurationMinutes) &&
    isString(value.scheduledDate) &&
    isDifficultyLevel(value.targetDifficulty) &&
    [
      "CURRICULUM",
      "MISCONCEPTION",
      "ASSESSMENT_WEAKNESS",
      "SPACED_REVIEW",
      "PREREQUISITE_GAP",
      "USER_GOAL",
      "MISSED_TASK_RECOVERY",
    ].includes(String(value.source)) &&
    (value.completedAt === undefined || isString(value.completedAt)) &&
    (value.actualDurationMinutes === undefined || isNumber(value.actualDurationMinutes)) &&
    (value.assessmentAttemptId === undefined || isString(value.assessmentAttemptId)) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isDailyStudyPlan(value: unknown): boolean {
  return (
    isPlanningRecord(value) &&
    isString(value.date) &&
    isNumber(value.dayOfWeek) &&
    isNumber(value.targetMinutes) &&
    isNumber(value.plannedMinutes) &&
    isNumber(value.completedMinutes) &&
    Array.isArray(value.tasks) &&
    value.tasks.every(isStudyTask) &&
    isBoolean(value.isRestDay)
  );
}

function isWeeklyStudyPlan(value: unknown): boolean {
  return (
    isPlanningRecord(value) &&
    isNumber(value.weekNumber) &&
    isString(value.startDate) &&
    isString(value.endDate) &&
    Array.isArray(value.dailyPlans) &&
    value.dailyPlans.every(isDailyStudyPlan) &&
    isNumber(value.weeklyTargetMinutes) &&
    isNumber(value.weeklyPlannedMinutes) &&
    isNumber(value.weeklyCompletedMinutes)
  );
}

export function isLearningPlan(value: unknown): value is LearningPlan {
  return (
    isPlanningRecord(value) &&
    isString(value.id) &&
    isString(value.studentId) &&
    isString(value.goalId) &&
    isPlanGenerationMode(value.mode) &&
    isString(value.startDate) &&
    isString(value.endDate) &&
    Array.isArray(value.weeklyPlans) &&
    value.weeklyPlans.every(isWeeklyStudyPlan) &&
    ["ACTIVE", "COMPLETED", "SUPERSEDED", "ARCHIVED"].includes(String(value.status)) &&
    isBoolean(value.authoritative) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

export function isReviewItem(value: unknown): value is ReviewItem {
  return (
    isPlanningRecord(value) &&
    isString(value.conceptId) &&
    isString(value.subjectId) &&
    isString(value.conceptNameKu) &&
    isNumber(value.masteryScore) &&
    (value.lastReviewedAt === null || isString(value.lastReviewedAt)) &&
    isString(value.nextDueDate) &&
    ["UPCOMING", "DUE", "OVERDUE", "COMPLETED", "DEFERRED"].includes(String(value.state)) &&
    isNumber(value.reviewCount) &&
    isNumber(value.intervalDays) &&
    isString(value.updatedAt)
  );
}

export function isPlanProgress(value: unknown): value is PlanProgress {
  return (
    isPlanningRecord(value) &&
    isString(value.studentId) &&
    isNumber(value.plannedMinutes) &&
    isNumber(value.completedMinutes) &&
    isNumber(value.completedTasksCount) &&
    isNumber(value.missedTasksCount) &&
    isNumber(value.skippedTasksCount) &&
    isNumber(value.reviewCompletionRate) &&
    isStringNumberRecord(value.subjectDistribution) &&
    isNumber(value.weeklyConsistencyScore) &&
    isNumber(value.goalProgressPercentage) &&
    isString(value.updatedAt)
  );
}

export function parsePlanningJson<T>(raw: string, guard: PlanningGuard<T>, label: string): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid persisted JSON for ${label}`);
  }
  if (!guard(parsed)) throw new Error(`Invalid persisted planning contract for ${label}`);
  return parsed;
}
