import { GoalState, StudentGoal } from "./types.ts";

export class GoalEngine {
  private goals: StudentGoal[] = [];
  private currentStreak: number = 0;
  private longestStreak: number = 0;

  constructor(initialState?: Partial<GoalState>) {
    if (initialState?.goals) {
      this.goals = [...initialState.goals];
    }
    this.currentStreak = initialState?.currentStreak || 0;
    this.longestStreak = initialState?.longestStreak || 0;
    
    // Seed standard goals if empty
    if (this.goals.length === 0) {
      this.seedStandardGoals();
    }
  }

  private seedStandardGoals(): void {
    const today = new Date();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
    const endOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (7 - today.getDay()), 23, 59, 59).toISOString();

    this.goals = [
      {
        id: "goal_daily_questions",
        title: "دە پرسیاری بیرکاری یان زانستەکان شیکار بکە",
        type: "daily",
        targetValue: 10,
        currentValue: 0,
        isCompleted: false,
        deadline: endOfDay
      },
      {
        id: "goal_weekly_sessions",
        title: "٥ جێبەجێکردنی خوێندنی چڕ ئەنجام بدە",
        type: "weekly",
        targetValue: 5,
        currentValue: 0,
        isCompleted: false,
        deadline: endOfWeek
      }
    ];
  }

  public getSnapshot(): GoalState {
    return {
      goals: this.goals.map(g => ({ ...g })),
      currentStreak: this.currentStreak,
      longestStreak: this.longestStreak
    };
  }

  public registerProgress(goalId: string, increment: number): void {
    this.goals = this.goals.map((goal) => {
      if (goal.id !== goalId) return goal;
      
      const newValue = Math.min(goal.targetValue, goal.currentValue + increment);
      const isNowCompleted = newValue >= goal.targetValue;
      
      return {
        ...goal,
        currentValue: newValue,
        isCompleted: isNowCompleted
      };
    });
  }

  public incrementStreak(): void {
    this.currentStreak += 1;
    if (this.currentStreak > this.longestStreak) {
      this.longestStreak = this.currentStreak;
    }
  }

  public resetStreak(): void {
    this.currentStreak = 0;
  }

  public addNewGoal(goal: StudentGoal): void {
    this.goals.push(goal);
  }
}
