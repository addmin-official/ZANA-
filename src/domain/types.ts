export type DomainEventType =
  | "STUDENT_CREATED"
  | "STUDENT_UPDATED"
  | "SESSION_STARTED"
  | "SESSION_PAUSED"
  | "SESSION_RESUMED"
  | "SESSION_FINISHED"
  | "LESSON_STARTED"
  | "LESSON_COMPLETED"
  | "CONCEPT_STARTED"
  | "CONCEPT_COMPLETED"
  | "ANSWER_SUBMITTED"
  | "ANSWER_EVALUATED"
  | "ASSESSMENT_STARTED"
  | "ASSESSMENT_FINISHED"
  | "MASTERY_UPDATED"
  | "CONFIDENCE_UPDATED"
  | "WEAKNESS_DETECTED"
  | "GOAL_CREATED"
  | "GOAL_COMPLETED"
  | "REPORT_GENERATED"
  | "DAILY_SPARK_TRIGGERED";

export type DomainEventSource =
  | "student-portal"
  | "ai-tutor"
  | "assessment-engine"
  | "curriculum-engine"
  | "session-engine"
  | "intelligence-engine"
  | "system";

export interface EventMetadata {
  grade?: string;
  stream?: string;
  subject?: string;
  nodeId?: string;
  sessionId?: string;
  [key: string]: string | undefined;
}

export interface BaseDomainEvent<T = Record<string, unknown>> {
  id: string;
  type: DomainEventType;
  studentId: string;
  occurredAt: string;
  source: DomainEventSource;
  payload: T;
  metadata?: EventMetadata;
}

// Payload schemas for specific events

export interface StudentCreatedPayload {
  name: string;
  grade: string;
  stream: string;
  preferredStyle?: string;
}

export interface StudentUpdatedPayload {
  updates: Record<string, unknown>;
}

export interface SessionStartedPayload {
  sessionId: string;
  grade: string;
  stream: string;
  subject: string;
  initialNodeId: string;
  mode: string;
}

export interface SessionPausedPayload {
  sessionId: string;
  durationSeconds: number;
}

export interface SessionResumedPayload {
  sessionId: string;
}

export interface SessionFinishedPayload {
  sessionId: string;
  totalDurationSeconds: number;
  completedNodeIds: string[];
}

export interface LessonStartedPayload {
  lessonId: string;
  sessionId?: string;
}

export interface LessonCompletedPayload {
  lessonId: string;
  sessionId?: string;
}

export interface ConceptStartedPayload {
  conceptId: string;
  sessionId?: string;
}

export interface ConceptCompletedPayload {
  conceptId: string;
  sessionId?: string;
}

export interface AnswerSubmittedPayload {
  questionId: string;
  studentAnswer: string;
  conceptId: string;
}

export interface AnswerEvaluatedPayload {
  questionId: string;
  isCorrect: boolean;
  score: number;
  feedbackKu?: string;
}

export interface AssessmentStartedPayload {
  assessmentId: string;
  type: string;
  totalQuestions: number;
}

export interface AssessmentFinishedPayload {
  assessmentId: string;
  correctAnswers: number;
  totalQuestions: number;
  score: number;
}

export interface MasteryUpdatedPayload {
  conceptId: string;
  oldValue: number;
  newValue: number;
  status: string;
}

export interface ConfidenceUpdatedPayload {
  conceptId: string;
  oldScore: number;
  newScore: number;
}

export interface WeaknessDetectedPayload {
  conceptId: string;
  wrongAttemptsCount: number;
  priority: "low" | "medium" | "high";
}

export interface GoalCreatedPayload {
  goalId: string;
  title: string;
  type: "daily" | "weekly";
  targetValue: number;
}

export interface GoalCompletedPayload {
  goalId: string;
  title: string;
  type: "daily" | "weekly";
}

export interface ReportGeneratedPayload {
  reportId: string;
  type: "parent" | "student" | "academic";
  summaryKu: string;
}

export interface DailySparkTriggeredPayload {
  sparkId: string;
  titleKu: string;
  type: string;
}

// Map the specific payload to its event types
export type DomainEventMap = {
  STUDENT_CREATED: BaseDomainEvent<StudentCreatedPayload>;
  STUDENT_UPDATED: BaseDomainEvent<StudentUpdatedPayload>;
  SESSION_STARTED: BaseDomainEvent<SessionStartedPayload>;
  SESSION_PAUSED: BaseDomainEvent<SessionPausedPayload>;
  SESSION_RESUMED: BaseDomainEvent<SessionResumedPayload>;
  SESSION_FINISHED: BaseDomainEvent<SessionFinishedPayload>;
  LESSON_STARTED: BaseDomainEvent<LessonStartedPayload>;
  LESSON_COMPLETED: BaseDomainEvent<LessonCompletedPayload>;
  CONCEPT_STARTED: BaseDomainEvent<ConceptStartedPayload>;
  CONCEPT_COMPLETED: BaseDomainEvent<ConceptCompletedPayload>;
  ANSWER_SUBMITTED: BaseDomainEvent<AnswerSubmittedPayload>;
  ANSWER_EVALUATED: BaseDomainEvent<AnswerEvaluatedPayload>;
  ASSESSMENT_STARTED: BaseDomainEvent<AssessmentStartedPayload>;
  ASSESSMENT_FINISHED: BaseDomainEvent<AssessmentFinishedPayload>;
  MASTERY_UPDATED: BaseDomainEvent<MasteryUpdatedPayload>;
  CONFIDENCE_UPDATED: BaseDomainEvent<ConfidenceUpdatedPayload>;
  WEAKNESS_DETECTED: BaseDomainEvent<WeaknessDetectedPayload>;
  GOAL_CREATED: BaseDomainEvent<GoalCreatedPayload>;
  GOAL_COMPLETED: BaseDomainEvent<GoalCompletedPayload>;
  REPORT_GENERATED: BaseDomainEvent<ReportGeneratedPayload>;
  DAILY_SPARK_TRIGGERED: BaseDomainEvent<DailySparkTriggeredPayload>;
};

// Generic Domain Event representation
export type DomainEvent = DomainEventMap[keyof DomainEventMap];

// Derived state interface for reducer output
export interface DerivedDomainState {
  studentActivityCount: number;
  completedLessons: string[];
  completedConcepts: string[];
  assessmentCount: number;
  reportCount: number;
  lastActiveTime: string | null;
  currentSubject: string | null;
  currentSessionId: string | null;
}
