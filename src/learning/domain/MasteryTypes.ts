import { StudentGrade, AcademicStream, SubjectKey, StudentLevel } from "../../features/student/studentTypes.ts";

export enum MasteryStatus {
  NOT_STARTED = "NOT_STARTED",
  INTRODUCED = "INTRODUCED",
  DEVELOPING = "DEVELOPING",
  PROFICIENT = "PROFICIENT",
  MASTERED = "MASTERED",
  NEEDS_REVIEW = "NEEDS_REVIEW"
}

export interface ConceptMasteryState {
  conceptId: string;
  masteryScore: number; // 0.0 to 1.0
  status: MasteryStatus;
  consecutiveCorrect: number;
  totalAttempts: number;
  lastAttemptedAt: string | null;
  history: { isCorrect: boolean; timestamp: string; responseTimeMs: number; difficulty: number }[];
}

export interface MisconceptionState {
  conceptId: string;
  misconceptionId: string;
  nameKu: string;
  count: number;
  detectedAt: string;
  resolvedAt: string | null;
}

export interface StudentMasteryProfile {
  studentId: string;
  overallMasteryScore: number; // 0.0 to 1.0
  conceptMasteries: Record<string, ConceptMasteryState>;
  activeMisconceptions: MisconceptionState[];
  recentRecommendedActions: string[];
}

export type LearningEventType =
  | "EXERCISE_ATTEMPT"
  | "LESSON_VIEW"
  | "SESSION_START"
  | "SESSION_END"
  | "RECOMMENDATION_DECISION";

export interface LearningEvent {
  id: string;
  studentId: string;
  timestamp: string;
  type: LearningEventType;
  data: Record<string, any>;
}

export interface ExerciseAttempt {
  id: string;
  studentId: string;
  conceptId: string;
  isCorrect: boolean;
  responseTimeMs: number;
  difficulty: number; // 1 (easy) to 3 (hard)
  questionText: string;
  studentResponse: string;
  misconceptionDetected?: string; // ID or name of misconception if any
  timestamp: string;
}

export type RecommendationType =
  | "PREREQUISITE_REVIEW"
  | "PRACTICE_DRILL"
  | "ADVANCE_CONCEPT"
  | "REMEDIAL_EXPLANATION";

export type RecommendationPriority = "high" | "medium" | "low";

export type RecommendationStatus = "ACTIVE" | "ACCEPTED" | "COMPLETED" | "DISMISSED";

export interface AdaptiveRecommendation {
  id: string;
  studentId: string;
  conceptId: string;
  type: RecommendationType;
  titleKu: string;
  explanationKu: string;
  priority: RecommendationPriority;
  status: RecommendationStatus;
  generatedAt: string;
  reasoningKu: string; // pedagogical reasoning in Kurdish
}

export interface LearningSession {
  id: string;
  studentId: string;
  startTime: string;
  endTime: string | null;
  events: LearningEvent[];
  focusScore: number; // 0.0 to 1.0
}
