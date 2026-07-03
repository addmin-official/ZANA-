export interface AssessmentState {
  id: string;
  subject: string;
  grade: string;
  currentQuestion: number; // 1-indexed (1 to 5)
  totalQuestions: number; // always 5
  questions: string[]; // array of 5 questions
  answers: string[]; // array of student responses
  feedbacks: string[]; // assessment feedback from Zana for each answer
  correctAnswers: boolean[]; // whether Zana graded it correct
  completed: boolean;
  finalLevel: string | null; // beginner/intermediate/advanced in Sorani
}
