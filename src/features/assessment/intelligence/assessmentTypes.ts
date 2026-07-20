export type AssessmentMode =
  | "diagnostic"
  | "lesson_check"
  | "review_check"
  | "exam_practice";

export type AssessmentQuestionType =
  | "multiple_choice"
  | "short_answer"
  | "step_by_step"
  | "MULTIPLE_CHOICE_SINGLE"
  | "MULTIPLE_CHOICE_MULTIPLE"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "NUMERIC"
  | "ORDERING"
  | "MATCHING";

export interface QuestionOption {
  id: string;
  textKu: string;
  textAr?: string;
  textEn?: string;
}

export interface AssessmentQuestion {
  id: string;
  type: AssessmentQuestionType;
  prompt: string;
  choices?: string[]; // fallback for legacy multiple_choice
  options?: QuestionOption[]; // for Phase 16 MCQs
  correctAnswer?: string;
  explanation: string;
  conceptId?: string;
  lessonId?: string;
  difficulty:
    | "introductory"
    | "basic"
    | "intermediate"
    | "advanced"
    | "exam_level"
    | "foundation"
    | "easy"
    | "standard"
    | "challenging"
    | "expert";
  source: "curriculum_generated" | "ai_generated_future" | "ZANA_ORIGINAL" | "GENERATED_APPROVED" | "ZANA_OWNED_2026";
}

export interface AssessmentAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  feedback: string;
  answeredAt: string;
  score?: number;
}

export interface AssessmentSession {
  id: string;
  studentId: string;
  mode: AssessmentMode;
  grade: string;
  stream: string;
  subject: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  questions: AssessmentQuestion[];
  answers: AssessmentAnswer[];
  startedAt: string;
  completedAt?: string;
  scorePercentage: number;
  completed: boolean;
  weakConceptIds: string[];
  strongConceptIds: string[];
  recommendedNextAction:
    | "continue_learning"
    | "review_weakness"
    | "practice_more"
    | "advance_next_lesson";
  blueprint?: any; // For Phase 16 real backend attempt
  authoritative?: boolean;
}

export interface AssessmentSnapshot {
  session: AssessmentSession;
  currentQuestion?: AssessmentQuestion;
  progressPercentage: number;
  resultSummary?: {
    title: string;
    message: string;
    scoreLabel: string;
    weakAreas: string[];
    strongAreas: string[];
    nextStep: string;
  };
  warnings: string[];
}

