import { CurriculumGrade, CurriculumStream, CurriculumSubject } from "../curriculum/types.ts";

export type LearningMode = "learn" | "practice" | "review" | "assessment" | "exam";

export interface SessionGoal {
  targetMinutes: number;
  currentMinutes: number;
  targetConcepts: number;
  currentConcepts: number;
  targetLessons: number;
  currentLessons: number;
  isCompleted: boolean;
}

export interface StudentSession {
  id: string;
  studentId: string;
  grade: CurriculumGrade;
  stream: CurriculumStream;
  subject: CurriculumSubject;
  currentNodeId: string;
  currentLessonId: string;
  currentConceptId: string;
  currentMode: LearningMode;
  startedAt: string;
  lastActivity: string;
  estimatedRemainingMinutes: number;
  completionPercentage: number;
  completedNodeIds: string[];
  reviewQueue: string[];
  practiceQueue: string[];
  dailyGoal: SessionGoal;
}

export type SessionHistoryEventType =
  | "session_started"
  | "session_paused"
  | "session_resumed"
  | "session_finished"
  | "mode_switched"
  | "progress_updated"
  | "lesson_entered"
  | "concept_entered"
  | "node_completed"
  | "goal_reached";

export interface SessionHistoryEvent {
  id: string;
  sessionId: string;
  timestamp: string;
  type: SessionHistoryEventType;
  nodeId: string;
  lessonId: string;
  conceptId: string;
  durationSeconds: number;
  details?: string;
}

export type SessionTimelineEventType =
  | "StartedLearning"
  | "CompletedLesson"
  | "CompletedConcept"
  | "Practice"
  | "Review"
  | "Assessment"
  | "GoalReached";

export interface SessionTimelineEvent {
  id: string;
  timestamp: string;
  type: SessionTimelineEventType;
  titleKu: string;
  detailsKu: string;
}

export interface SessionAnalyticsSummary {
  todayStudyTimeSeconds: number;
  weekStudyTimeSeconds: number;
  averageSessionLengthSeconds: number;
  longestSessionLengthSeconds: number;
  completionPercentage: number;
  currentStreakDays: number;
}

export interface SessionSnapshot {
  currentSession: StudentSession | null;
  timeline: SessionTimelineEvent[];
  analytics: SessionAnalyticsSummary;
  nextRecommendation: string | undefined;
}

export interface ScheduledTask {
  id: string;
  type: "review" | "practice" | "revision" | "rest_reminder" | "daily_spark_trigger";
  scheduledFor: string;
  nodeId: string;
  messageKu: string;
  isTriggered: boolean;
}
