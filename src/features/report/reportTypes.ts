export interface ParentReport {
  studentName: string;
  grade: string;
  subject: string;
  level: string;
  totalSessions: number;
  weeklyQuestionCount: number;
  currentProgressPercent: number;
  weakAreas: string[];
  recommendation: string; // AI recommendation text in Sorani
}
