export type AssessmentMode =
  | "diagnostic"
  | "lesson_check"
  | "review_check"
  | "exam_practice";

export type AssessmentQuestionType =
  | "multiple_choice"
  | "short_answer"
  | "step_by_step";

export interface AssessmentQuestion {
  id: string;
  type: AssessmentQuestionType;
  prompt: string;
  choices?: string[];
  correctAnswer?: string;
  explanation: string;
  conceptId?: string;
  lessonId?: string;
  difficulty:
    | "introductory"
    | "basic"
    | "intermediate"
    | "advanced"
    | "exam_level";
  source: "curriculum_generated" | "ai_generated_future";
}

export interface AssessmentAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  feedback: string;
  answeredAt: string;
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
