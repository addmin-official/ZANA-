import { DifficultyLevel } from "../../learning/domain/MasteryTypes.ts";

export class DifficultySelector {
  private static readonly DIFFICULTY_STEPS: DifficultyLevel[] = [
    DifficultyLevel.FOUNDATION,
    DifficultyLevel.EASY,
    DifficultyLevel.STANDARD,
    DifficultyLevel.CHALLENGING,
    DifficultyLevel.ADVANCED
  ];

  /**
   * Adapts the difficulty level for the next question based on the correctness of the last attempt.
   */
  public static selectNextDifficulty(
    currentDifficulty: DifficultyLevel,
    lastIsCorrect: boolean,
    consecutiveStreak: number
  ): DifficultyLevel {
    const currentIndex = this.DIFFICULTY_STEPS.indexOf(currentDifficulty);
    if (currentIndex === -1) return DifficultyLevel.STANDARD;

    if (lastIsCorrect) {
      // Step up if correct and streak condition or simply step up on each correct
      // To prevent jumping too fast, step up by 1 step.
      const nextIndex = Math.min(this.DIFFICULTY_STEPS.length - 1, currentIndex + 1);
      return this.DIFFICULTY_STEPS[nextIndex];
    } else {
      // Step down by 1 step on incorrect
      const nextIndex = Math.max(0, currentIndex - 1);
      return this.DIFFICULTY_STEPS[nextIndex];
    }
  }

  /**
   * Selects an starting difficulty level based on the student's existing mastery score for the concept.
   */
  public static selectInitialDifficulty(masteryScore: number): DifficultyLevel {
    if (masteryScore < 0.25) {
      return DifficultyLevel.EASY;
    } else if (masteryScore < 0.60) {
      return DifficultyLevel.STANDARD;
    } else if (masteryScore < 0.85) {
      return DifficultyLevel.CHALLENGING;
    } else {
      return DifficultyLevel.ADVANCED;
    }
  }
}
