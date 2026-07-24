import { ConceptMasteryState, StudentMasteryProfile } from "../../learning/domain/MasteryTypes.ts";
import { ReviewItem, ReviewState } from "../domain/LearningPlanTypes.ts";

export class ReviewScheduler {
  /**
   * Calculates spaced review schedule for concepts in a student's mastery profile.
   * Review interval increases with mastery score and consecutive correct attempts.
   */
  public static calculateReviewItems(
    profile: StudentMasteryProfile,
    currentDateIso?: string
  ): ReviewItem[] {
    const now = currentDateIso ? new Date(currentDateIso) : new Date();
    const todayStr = now.toISOString().split("T")[0];
    const reviewItems: ReviewItem[] = [];

    for (const [conceptId, state] of Object.entries(profile.conceptMasteries)) {
      if (!state.lastAttemptedAt) continue;

      // Intervals in days based on mastery status / score
      const intervalDays = this.getSpacedIntervalDays(state);
      const lastAttemptDate = new Date(state.lastAttemptedAt);
      const dueDate = new Date(lastAttemptDate);
      dueDate.setDate(dueDate.getDate() + intervalDays);
      const dueDateStr = dueDate.toISOString().split("T")[0];

      // Determine state relative to today
      const diffMs = now.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let reviewState: ReviewState = "UPCOMING";
      if (diffDays > 2) {
        reviewState = "OVERDUE";
      } else if (diffDays >= 0) {
        reviewState = "DUE";
      }

      reviewItems.push({
        conceptId,
        subjectId: "subject-math-g9", // fallback or inferred
        conceptNameKu: `پێداچوونەوەی ${conceptId}`,
        masteryScore: state.masteryScore,
        lastReviewedAt: state.lastAttemptedAt,
        nextDueDate: dueDateStr,
        state: reviewState,
        reviewCount: state.history?.length || 0,
        intervalDays,
        updatedAt: now.toISOString()
      });
    }

    return reviewItems;
  }

  /**
   * Spaced repetition interval formula:
   * Mastery < 0.3 -> 1 day
   * Mastery < 0.5 -> 2 days
   * Mastery < 0.7 -> 4 days
   * Mastery < 0.85 -> 7 days
   * Mastery >= 0.85 -> 14 days
   */
  private static getSpacedIntervalDays(state: ConceptMasteryState): number {
    const score = state.masteryScore;
    if (score < 0.3) return 1;
    if (score < 0.5) return 2;
    if (score < 0.7) return 4;
    if (score < 0.85) return 7;
    return 14;
  }
}
