import { ComputedAnalytics, KnowledgeGraphState, ConceptMastery, ConceptConfidence, HabitState, GoalState } from "./types.ts";

export class AnalyticsEngine {
  public calculateAnalytics(
    graph: KnowledgeGraphState,
    masteryMap: Record<string, ConceptMastery>,
    confidenceMap: Record<string, ConceptConfidence>,
    habitState: HabitState,
    goalState: GoalState
  ): ComputedAnalytics {
    // 1. Weekly Progress based on completed goals or target completion rate
    const completedGoals = goalState.goals.filter(g => g.isCompleted).length;
    const totalGoals = goalState.goals.length;
    const weeklyProgressPercent = totalGoals > 0 
      ? Math.round((completedGoals / totalGoals) * 100) 
      : 50; // default initial midpoint

    // 2. Learning Velocity: active completions per study session rate
    const learningVelocity = habitState.totalSessions > 0
      ? Number((graph.completedNodeIds.size / Math.max(1, habitState.studyDays.length)).toFixed(1))
      : 0.5;

    // 3. General Mastery %: average of all recorded concepts
    const masteryValues = Object.values(masteryMap);
    const generalMasteryPercent = masteryValues.length > 0
      ? Math.round((masteryValues.reduce((sum, m) => sum + m.value, 0) / masteryValues.length) * 100)
      : 0; // Starts at 0% until exercises are logged

    // 4. General Confidence %: average of confidence self-ratings
    const confidenceValues = Object.values(confidenceMap);
    const generalConfidencePercent = confidenceValues.length > 0
      ? Math.round((confidenceValues.reduce((sum, c) => sum + c.confidenceScore, 0) / confidenceValues.length) * 100)
      : 50; // Neutral starting confidence

    // 5. Consistency %: based on practice habits and active streaks
    const studyDaysCount = habitState.studyDays.length;
    const streakBonus = Math.min(30, goalState.currentStreak * 5); // up to 30% bonus
    const baseConsistency = Math.min(70, studyDaysCount * 10);
    const consistencyPercent = Math.min(100, Math.max(0, baseConsistency + streakBonus));

    return {
      weeklyProgressPercent,
      learningVelocity,
      generalMasteryPercent,
      generalConfidencePercent,
      consistencyPercent
    };
  }
}
