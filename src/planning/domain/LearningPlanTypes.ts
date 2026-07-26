import { DifficultyLevel } from "../../learning/domain/MasteryTypes.ts";

export enum LearningGoalType {
  IMPROVE_SUBJECT = "IMPROVE_SUBJECT",
  PREPARE_FOR_EXAM = "PREPARE_FOR_EXAM",
  COMPLETE_CURRICULUM = "COMPLETE_CURRICULUM",
  REVIEW_WEAK_CONCEPTS = "REVIEW_WEAK_CONCEPTS",
  BUILD_DAILY_HABIT = "BUILD_DAILY_HABIT",
  CUSTOM = "CUSTOM"
}

export enum GoalStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  PAUSED = "PAUSED",
  ARCHIVED = "ARCHIVED"
}

export interface GoalSuccessCriteria {
  metric: "mastery_score" | "completed_tasks" | "study_minutes" | "streak_days" | "assessment_score";
  targetValue: number;
  currentValue?: number;
}

export interface LearningGoal {
  id: string;
  studentId: string;
  type: LearningGoalType;
  titleKu: string;
  targetSubjectId: string;
  targetCurriculumScope?: string[]; // unitIds or conceptIds
  targetDate?: string; // YYYY-MM-DD
  weeklyTargetMinutes: number;
  successCriteria: GoalSuccessCriteria;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export type StudyTimePreference = "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT" | "FLEXIBLE";

export interface StudentLearningPreferences {
  studentId: string;
  preferredStudyDays: number[]; // 0 (Sun) - 6 (Sat)
  availableMinutesPerDay: Record<number, number>; // dayOfWeek (0-6) -> minutes
  preferredStudyTime: StudyTimePreference;
  preferredSessionLengthMinutes: number; // e.g., 15, 25, 45, 60
  maxTasksPerDay: number;
  preferredSubjects: string[];
  difficultSubjects: string[];
  targetExamDate?: string; // YYYY-MM-DD
  weeklyGoalMinutes: number;
  reminderPreference: {
    enabled: boolean;
    preferredHour?: number;
    channel?: "IN_APP" | "PUSH" | "EMAIL";
  };
  preferredLanguage: "ku" | "ar" | "en";
  updatedAt: string;
}

export enum StudyTaskType {
  LEARN = "LEARN",
  REVIEW = "REVIEW",
  PRACTICE = "PRACTICE",
  ASSESSMENT = "ASSESSMENT",
  MASTERY_CHECK = "MASTERY_CHECK",
  PREREQUISITE = "PREREQUISITE",
  RETRY = "RETRY",
  REFLECTION = "REFLECTION"
}

export enum StudyTaskStatus {
  PLANNED = "PLANNED",
  AVAILABLE = "AVAILABLE",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  SKIPPED = "SKIPPED",
  MISSED = "MISSED",
  RESCHEDULED = "RESCHEDULED",
  CANCELLED = "CANCELLED"
}

export enum StudyTaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT"
}

export type StudyTaskSource =
  | "CURRICULUM"
  | "MISCONCEPTION"
  | "ASSESSMENT_WEAKNESS"
  | "SPACED_REVIEW"
  | "PREREQUISITE_GAP"
  | "USER_GOAL"
  | "MISSED_TASK_RECOVERY";

export interface StudyTaskReason {
  code:
    | "LOW_MASTERY"
    | "MISCONCEPTION_ACTIVE"
    | "PREREQUISITE_MISSING"
    | "SPACED_REVIEW_DUE"
    | "ASSESSMENT_WEAKNESS"
    | "EXAM_APPROACHING"
    | "DAILY_HABIT"
    | "RETRY_INCOMPLETE"
    | "CURRICULUM_PROGRESS";
  evidenceIds: string[];
  descriptionKu: string;
}

export interface StudyTask {
  id: string;
  planId: string;
  studentId: string;
  type: StudyTaskType;
  status: StudyTaskStatus;
  priority: StudyTaskPriority;
  priorityScore: number; // Numerical score used by prioritizer
  titleKu: string;
  descriptionKu: string;
  subjectId: string;
  unitId?: string;
  lessonId?: string;
  conceptId?: string;
  prerequisiteForConceptId?: string;
  reason: StudyTaskReason;
  estimatedDurationMinutes: number;
  scheduledDate: string; // YYYY-MM-DD
  targetDifficulty: DifficultyLevel;
  source: StudyTaskSource;
  completedAt?: string;
  actualDurationMinutes?: number;
  assessmentAttemptId?: string;
  createdAt: string;
  updatedAt: string;
}

export type PlanGenerationMode =
  | "FIRST_TIME_PLAN"
  | "WEEKLY_REFRESH"
  | "DAILY_REFRESH"
  | "POST_ASSESSMENT_UPDATE"
  | "MISSED_TASK_RECOVERY"
  | "EXAM_PREPARATION"
  | "MANUAL_REPLAN";

export interface DailyStudyPlan {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 - 6
  targetMinutes: number;
  plannedMinutes: number;
  completedMinutes: number;
  tasks: StudyTask[];
  isRestDay: boolean;
}

export interface WeeklyStudyPlan {
  weekNumber: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  dailyPlans: DailyStudyPlan[];
  weeklyTargetMinutes: number;
  weeklyPlannedMinutes: number;
  weeklyCompletedMinutes: number;
}

export interface LearningPlan {
  id: string;
  studentId: string;
  goalId: string;
  mode: PlanGenerationMode;
  startDate: string;
  endDate: string;
  weeklyPlans: WeeklyStudyPlan[];
  status: "ACTIVE" | "COMPLETED" | "SUPERSEDED" | "ARCHIVED";
  authoritative: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NextActionType =
  | "CONTINUE_LESSON"
  | "REVIEW_WEAK_CONCEPT"
  | "COMPLETE_PREREQUISITE"
  | "PRACTICE_EASY"
  | "TAKE_DIAGNOSTIC"
  | "TAKE_MASTERY_CHECK"
  | "RETRY_TASK"
  | "REVIEW_MISCONCEPTION"
  | "REST_AND_RESUME";

export interface NextBestAction {
  actionType: NextActionType;
  titleKu: string;
  reasonKu: string;
  estimatedDurationMinutes: number;
  curriculumReferences: {
    subjectId?: string;
    unitId?: string;
    conceptId?: string;
    lessonId?: string;
  };
  taskId?: string;
  confidence: "high" | "medium" | "low";
  evidenceReferences: string[];
  fallbackReason?: string;
}

export type ReviewState = "UPCOMING" | "DUE" | "OVERDUE" | "COMPLETED" | "DEFERRED";

export interface ReviewItem {
  conceptId: string;
  subjectId: string;
  conceptNameKu: string;
  masteryScore: number;
  lastReviewedAt: string | null;
  nextDueDate: string; // YYYY-MM-DD
  state: ReviewState;
  reviewCount: number;
  intervalDays: number;
  updatedAt: string;
}

export interface PlanAdjustment {
  id: string;
  planId: string;
  studentId: string;
  reasonCode: string;
  explanationKu: string;
  adjustedAt: string;
  affectedTaskIds: string[];
}

export interface PlanProgress {
  studentId: string;
  plannedMinutes: number;
  completedMinutes: number;
  completedTasksCount: number;
  missedTasksCount: number;
  skippedTasksCount: number;
  reviewCompletionRate: number; // 0.0 - 1.0
  subjectDistribution: Record<string, number>; // subjectId -> completedMinutes
  weeklyConsistencyScore: number; // 0.0 - 1.0
  goalProgressPercentage: number; // 0 - 100
  updatedAt: string;
}

export type PlanningEventType =
  | "PLAN_CREATED"
  | "PLAN_REFRESHED"
  | "TASK_STARTED"
  | "TASK_COMPLETED"
  | "TASK_SKIPPED"
  | "TASK_MISSED"
  | "TASK_RESCHEDULED"
  | "GOAL_CREATED"
  | "NEXT_ACTION_VIEWED"
  | "REVIEW_COMPLETED";

export interface PlanningAnalyticsEvent {
  id: string;
  studentId: string;
  type: PlanningEventType;
  timestamp: string;
  data: Record<string, unknown>;
}
