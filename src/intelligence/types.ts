import { StudentGrade, AcademicStream, SubjectKey, StudentLevel } from "../features/student/studentTypes.ts";

export interface StudentIdentity {
  readonly studentId: string;
  readonly createdAt: string;
  readonly grade: StudentGrade;
  readonly stream: AcademicStream;
  readonly name: string;
  readonly activeSubject: SubjectKey;
  readonly learningLevel: StudentLevel;
}

export type ExplanationStyle = "visual" | "analytical" | "practical" | "story-driven" | "step-by-step";

export interface LearningDNA {
  preferredStyle: ExplanationStyle;
  learningSpeed: number; // 0.1 (slow/deep) to 1.0 (fast)
  responseQuality: number; // 0.0 to 1.0
  practiceFrequency: number; // Sessions per week
  confidenceTrend: "rising" | "stable" | "declining";
  consistency: number; // 0.0 to 1.0
  focusScore: number; // 0.0 to 1.0
  curiosityScore: number; // 0.0 to 1.0
  motivationScore: number; // 0.0 to 1.0
}

export type GraphNodeType = "subject" | "chapter" | "lesson" | "topic" | "concept" | "skill";

export interface KnowledgeNode {
  readonly id: string;
  readonly type: GraphNodeType;
  readonly label: string;
  readonly parentId?: string;
  readonly dependencies: string[]; // IDs of node dependencies
}

export interface KnowledgeGraphState {
  readonly nodes: Record<string, KnowledgeNode>;
  readonly completedNodeIds: Set<string>;
  readonly blockedNodeIds: Set<string>;
}

export interface ConceptWeakness {
  readonly conceptId: string;
  readonly wrongAttemptsCount: number;
  readonly lastAttemptTimestamp: string;
  readonly isForgotten: boolean;
  readonly isLowConfidence: boolean;
  readonly retryCount: number;
}

export interface WeaknessState {
  readonly conceptWeaknesses: Record<string, ConceptWeakness>;
  readonly weakChapterIds: Set<string>;
  readonly weakSubjectIds: Set<string>;
}

export type MasteryStatus = "Not Started" | "Learning" | "Practicing" | "Mastered" | "Review Needed";

export interface ConceptMastery {
  readonly conceptId: string;
  readonly value: number; // 0.0 to 1.0
  readonly status: MasteryStatus;
  readonly lastUpdated: string;
}

export interface ConceptConfidence {
  readonly conceptId: string;
  readonly confidenceScore: number; // 0.0 to 1.0
  readonly ratingHistory: { score: number; timestamp: string }[];
}

export interface StudentGoal {
  readonly id: string;
  readonly title: string;
  readonly type: "daily" | "weekly" | "monthly";
  readonly targetValue: number;
  readonly currentValue: number;
  readonly isCompleted: boolean;
  readonly deadline: string;
}

export interface GoalState {
  readonly goals: StudentGoal[];
  readonly currentStreak: number;
  readonly longestStreak: number;
}

export interface HabitState {
  readonly studyDays: string[]; // ISO Date strings 'YYYY-MM-DD'
  readonly totalSessions: number;
  readonly averageSessionLengthSeconds: number;
  readonly bestStudyHour: number; // 0 to 23
  readonly learningRhythm: "morning-owl" | "afternoon-focused" | "night-rider" | "irregular";
}

export type RecommendationType = 
  | "ReviewConcept" 
  | "PracticeTopic" 
  | "TakeMiniQuiz" 
  | "ContinueChapter" 
  | "ReviewYesterday";

export interface LearningRecommendation {
  readonly id: string;
  readonly type: RecommendationType;
  readonly titleKu: string;
  readonly descriptionKu: string;
  readonly priority: "high" | "medium" | "low";
  readonly targetNodeId: string;
  readonly generatedAt: string;
}

export type TimelineEventType =
  | "AssessmentCompleted"
  | "LessonFinished"
  | "WeaknessReduced"
  | "MasteryIncreased"
  | "GoalCompleted";

export interface TimelineEvent {
  readonly id: string;
  readonly timestamp: string;
  readonly type: TimelineEventType;
  readonly titleKu: string;
  readonly detailsKu: string;
}

export interface ComputedAnalytics {
  readonly weeklyProgressPercent: number; // 0 to 100
  readonly learningVelocity: number; // Node completions per week
  readonly generalMasteryPercent: number; // 0 to 100
  readonly generalConfidencePercent: number; // 0 to 100
  readonly consistencyPercent: number; // 0 to 100
}

export interface StudentIntelligenceSnapshot {
  readonly identity: StudentIdentity;
  readonly dna: LearningDNA;
  readonly graph: KnowledgeGraphState;
  readonly weaknesses: WeaknessState;
  readonly mastery: Record<string, ConceptMastery>;
  readonly confidence: Record<string, ConceptConfidence>;
  readonly goals: GoalState;
  readonly habits: HabitState;
  readonly recommendations: LearningRecommendation[];
  readonly timeline: TimelineEvent[];
  readonly analytics: ComputedAnalytics;
}
