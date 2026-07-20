import { DifficultyLevel, RecommendationType } from "../../learning/domain/MasteryTypes.ts";

export enum AssessmentType {
  DIAGNOSTIC = "DIAGNOSTIC",
  FORMATIVE = "FORMATIVE",
  PRACTICE = "PRACTICE",
  REVIEW = "REVIEW",
  MASTERY_CHECK = "MASTERY_CHECK",
  SUMMATIVE = "SUMMATIVE"
}

export enum AssessmentStatus {
  DRAFT = "DRAFT",
  READY = "READY",
  IN_PROGRESS = "IN_PROGRESS",
  SUBMITTED = "SUBMITTED",
  GRADED = "GRADED",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED"
}

export enum QuestionType {
  MULTIPLE_CHOICE_SINGLE = "MULTIPLE_CHOICE_SINGLE",
  MULTIPLE_CHOICE_MULTIPLE = "MULTIPLE_CHOICE_MULTIPLE",
  TRUE_FALSE = "TRUE_FALSE",
  SHORT_ANSWER = "SHORT_ANSWER",
  NUMERIC = "NUMERIC",
  ORDERING = "ORDERING",
  MATCHING = "MATCHING"
}

export enum QuestionSource {
  ZANA_ORIGINAL = "ZANA_ORIGINAL",
  OPEN_LICENSE = "OPEN_LICENSE",
  LICENSED = "LICENSED",
  GENERATED_APPROVED = "GENERATED_APPROVED"
}

export enum GenerationReviewStatus {
  GENERATED_PENDING_REVIEW = "GENERATED_PENDING_REVIEW",
  GENERATED_VALIDATED = "GENERATED_VALIDATED",
  REJECTED = "REJECTED"
}

export interface QuestionOption {
  id: string;
  textKu: string;
  textAr?: string;
  textEn?: string;
}

export interface CorrectAnswerDefinition {
  singleOptionId?: string;
  multipleOptionIds?: string[];
  trueFalseValue?: boolean;
  numericValue?: number;
  numericTolerance?: number; // absolute tolerance
  numericUnit?: string;
  shortAnswerPatterns?: string[]; // normalized correct responses
  orderedIds?: string[]; // correct ordering IDs
  matchingPairs?: Record<string, string>; // leftId -> rightId mapping
}

export interface QuestionGenerationMetadata {
  reviewStatus: GenerationReviewStatus;
  promptHash?: string;
  generatorModel?: string;
  verificationDetails?: string;
  createdAt: string;
}

export interface AssessmentQuestion {
  id: string;
  source: QuestionSource;
  licenseId?: string;
  curriculumId: string;
  unitId?: string;
  lessonId?: string;
  conceptId?: string;
  skillId?: string;
  difficulty: DifficultyLevel;
  type: QuestionType;
  promptKu: string;
  promptAr?: string;
  promptEn?: string;
  options?: QuestionOption[];
  explanationKu: string;
  explanationAr?: string;
  explanationEn?: string;
  misconceptionSignatures?: { optionId?: string; pattern?: string; misconceptionId: string; countTrigger?: number }[];
  estimatedDurationSeconds: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  generationMetadata?: QuestionGenerationMetadata;
}

// Separate public student-facing representation of a question (hiding answers and grading patterns)
export interface PublicQuestion {
  id: string;
  difficulty: DifficultyLevel;
  type: QuestionType;
  promptKu: string;
  promptAr?: string;
  promptEn?: string;
  options?: QuestionOption[];
  estimatedDurationSeconds: number;
  conceptId?: string;
  skillId?: string;
  lessonId?: string;
}

export interface AssessmentSection {
  id: string;
  titleKu: string;
  titleAr?: string;
  titleEn?: string;
  instructionsKu?: string;
  conceptIds: string[];
  totalQuestions: number;
}

export interface AssessmentBlueprint {
  id: string;
  type: AssessmentType;
  curriculumId: string;
  grade: string;
  subjectId: string;
  unitId?: string;
  lessonIds?: string[];
  conceptIds?: string[];
  skillIds?: string[];
  totalQuestions: number;
  targetDurationSeconds: number;
  difficultyDistribution: Record<DifficultyLevel, number>; // difficulty -> percentage (0 to 1)
  questionTypeDistribution: Record<QuestionType, number>; // type -> percentage (0 to 1)
  learningObjectives: string[];
  masteryObjectives: string[];
  passingThresholdPercentage: number;
  partialCreditPolicy: "strict" | "lenient" | "custom";
  retryPolicy: { maxRetries: number; cooldownSeconds: number };
  randomizationRules: { shuffleQuestions: boolean; shuffleOptions: boolean };
}

export interface Assessment {
  id: string;
  blueprintId?: string;
  titleKu: string;
  titleAr?: string;
  titleEn?: string;
  descriptionKu?: string;
  type: AssessmentType;
  grade: string;
  subjectId: string;
  curriculumId: string;
  unitId?: string;
  questions: AssessmentQuestion[];
  instructionsKu: string;
  instructionsAr?: string;
  instructionsEn?: string;
  durationLimitSeconds?: number;
  passingScorePercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnswerSubmission {
  questionId: string;
  selectedOptionIds?: string[];
  trueFalseValue?: boolean;
  numericValue?: number;
  numericUnit?: string;
  shortAnswerText?: string;
  orderedIds?: string[];
  matchingPairs?: Record<string, string>;
  responseTimeMs: number;
  hintUsed?: boolean;
}

export interface QuestionAttempt {
  id: string;
  questionId: string;
  conceptId?: string;
  skillId?: string;
  submission: AnswerSubmission;
  isCorrect: boolean;
  partialCreditScore: number; // 0.0 to 1.0
  maxScore: number; // e.g. 1.0
  gradedAt: string;
  reasonCodes: string[];
  misconceptionDetectedId?: string;
  feedbackKu: string;
  feedbackAr?: string;
  feedbackEn?: string;
}

export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  studentId: string;
  status: AssessmentStatus;
  questionAttempts: Record<string, QuestionAttempt>;
  activeQuestionId?: string; // for one-by-one flow
  startedAt: string;
  submittedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreBreakdown {
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  byDifficulty: Record<DifficultyLevel, { scored: number; max: number; count: number }>;
  byConcept: Record<string, { scored: number; max: number; count: number }>;
  byQuestionType: Record<QuestionType, { scored: number; max: number; count: number }>;
}

export interface AssessmentRecommendation {
  type: RecommendationType;
  titleKu: string;
  explanationKu: string;
  priority: "high" | "medium" | "low";
  conceptId: string;
}

export interface AssessmentResult {
  attemptId: string;
  assessmentId: string;
  studentId: string;
  scoreBreakdown: ScoreBreakdown;
  strengthsKu: string[];
  weaknessesKu: string[];
  masteryChanges: { conceptId: string; oldScore: number; newScore: number; oldStatus: string; newStatus: string }[];
  misconceptionsDetected: { misconceptionId: string; nameKu: string; status: string; count: number; interventionKu: string }[];
  nextRecommendedActionKu: string;
  recommendations: AssessmentRecommendation[];
  interpretationConfidence: "low" | "medium" | "high";
}
