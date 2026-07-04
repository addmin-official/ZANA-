import { SessionGoal } from "./types.ts";

export class SessionGoalEngine {
  private activeGoal: SessionGoal;
  private weeklyStreak: number = 0;

  constructor(initialGoal?: SessionGoal, initialStreak: number = 0) {
    this.activeGoal = initialGoal || {
      targetMinutes: 30,
      currentMinutes: 0,
      targetConcepts: 5,
      currentConcepts: 0,
      targetLessons: 2,
      currentLessons: 0,
      isCompleted: false
    };
    this.weeklyStreak = initialStreak;
  }

  public getGoal(): SessionGoal {
    return { ...this.activeGoal };
  }

  public setGoal(goal: SessionGoal): void {
    this.activeGoal = { ...goal };
  }

  public registerStudyMinutes(minutes: number): SessionGoal {
    this.activeGoal.currentMinutes = Math.min(
      this.activeGoal.targetMinutes * 2, // Allow going over but cap visual bounds or just let it grow
      this.activeGoal.currentMinutes + minutes
    );
    this.checkCompletion();
    return { ...this.activeGoal };
  }

  public registerConceptCompleted(): SessionGoal {
    this.activeGoal.currentConcepts += 1;
    this.checkCompletion();
    return { ...this.activeGoal };
  }

  public registerLessonCompleted(): SessionGoal {
    this.activeGoal.currentLessons += 1;
    this.checkCompletion();
    return { ...this.activeGoal };
  }

  public getWeeklyStreak(): number {
    return this.weeklyStreak;
  }

  public incrementStreak(): number {
    this.weeklyStreak += 1;
    return this.weeklyStreak;
  }

  public resetStreak(): void {
    this.weeklyStreak = 0;
  }

  private checkCompletion(): void {
    const minutesMet = this.activeGoal.currentMinutes >= this.activeGoal.targetMinutes;
    const conceptsMet = this.activeGoal.currentConcepts >= this.activeGoal.targetConcepts;
    const lessonsMet = this.activeGoal.currentLessons >= this.activeGoal.targetLessons;

    this.activeGoal.isCompleted = minutesMet && conceptsMet && lessonsMet;
  }
}
