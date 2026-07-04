export type AdaptiveAction =
  | "review_weakness"
  | "practice_more"
  | "continue_learning"
  | "advance_next_lesson";

export interface AdaptiveDecision {
  action: AdaptiveAction;
  title: string;
  message: string;
  targetNodeIds: string[];
  targetMode: "learn" | "practice" | "review" | "assessment";
  confidenceImpact: number;
  masteryImpact: number;
  priority: "high" | "medium" | "low";
}

export interface AdaptiveSnapshot {
  generatedAt: string;
  studentId: string;
  assessmentId?: string;
  scorePercentage: number;
  weakConceptIds: string[];
  strongConceptIds: string[];
  decision: AdaptiveDecision;
  reviewQueue: string[];
  practiceQueue: string[];
  completedNodeIds: string[];
  warnings: string[];
}
