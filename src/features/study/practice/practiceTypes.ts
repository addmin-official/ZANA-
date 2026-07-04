export type PracticeQuestionType =
  | "multiple_choice"
  | "short_answer"
  | "step_by_step";

export interface PracticeQuestion {
  id: string;
  type: PracticeQuestionType;
  prompt: string;
  choices?: string[];
  correctAnswer?: string; // string representation or choice index
  explanation: string;
  difficultyLabel: string;
  targetConceptId?: string;
}

export interface PracticeAttempt {
  questionId: string;
  studentAnswer: string;
  isCorrect: boolean;
  submittedAt: string;
}

export interface PracticeSnapshot {
  generatedAt: string;
  lessonTitle: string;
  conceptTitle: string;
  subjectLabel: string;
  gradeLabel: string;
  streamLabel: string;
  questions: PracticeQuestion[];
  attempts: PracticeAttempt[];
  completionPercentage: number;
  feedbackMessage?: string;
  warnings: string[];
}
