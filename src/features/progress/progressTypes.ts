export interface ProgressMetrics {
  totalSessions: number;
  weeklyQuestionCount: number;
  currentProgressPercent: number;
  weakAreas: string[];
  recommendation: string | null;
}
