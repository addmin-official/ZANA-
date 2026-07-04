import { LearningMode } from "../../session/types.ts";

export type DailySparkType =
  | "continue_learning"
  | "review_weakness"
  | "practice_concept"
  | "complete_goal"
  | "start_assessment"
  | "rest_reminder";

export interface DailySparkCard {
  id: string;
  type: DailySparkType;
  title: string;
  description: string;
  subjectLabel: string;
  gradeLabel: string;
  streamLabel: string;
  estimatedMinutes: number;
  priority: "high" | "medium" | "low";
  actionLabel: string;
  targetNodeId?: string;
  targetMode?: LearningMode;
}

export interface DailySparkSnapshot {
  generatedAt: string;
  studentName: string;
  greeting: string;
  mainCard: DailySparkCard;
  secondaryCards: DailySparkCard[];
  progressSummary: {
    todayStudyMinutes: number;
    weeklyStudyMinutes: number;
    completionPercentage: number;
    currentStreakDays: number;
  };
  warnings: string[];
}
