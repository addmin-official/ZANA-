import { HabitState } from "./types.ts";

export class HabitEngine {
  private studyDays: string[] = []; // 'YYYY-MM-DD'
  private totalSessions: number = 0;
  private totalSessionSeconds: number = 0;
  private hourFrequency: Record<number, number> = {};

  constructor(initialState?: Partial<HabitState>) {
    if (initialState?.studyDays) {
      this.studyDays = [...initialState.studyDays];
    }
    this.totalSessions = initialState?.totalSessions || 0;
    this.totalSessionSeconds = (initialState?.averageSessionLengthSeconds || 0) * this.totalSessions;
    this.seedHourFrequency();
  }

  private seedHourFrequency(): void {
    // Fill basic hour maps
    for (let h = 0; h < 24; h++) {
      this.hourFrequency[h] = 0;
    }
  }

  public getSnapshot(): HabitState {
    const avgLength = this.totalSessions > 0 ? Math.round(this.totalSessionSeconds / this.totalSessions) : 0;
    
    // Calculate best study hour
    let bestHour = 16; // default afternoon (4 PM)
    let maxCount = -1;
    for (let h = 0; h < 24; h++) {
      if ((this.hourFrequency[h] || 0) > maxCount) {
        maxCount = this.hourFrequency[h] || 0;
        bestHour = h;
      }
    }

    // Determine learning rhythm
    let rhythm: "morning-owl" | "afternoon-focused" | "night-rider" | "irregular" = "irregular";
    if (maxCount > 0) {
      if (bestHour >= 6 && bestHour < 12) {
        rhythm = "morning-owl";
      } else if (bestHour >= 12 && bestHour < 18) {
        rhythm = "afternoon-focused";
      } else if (bestHour >= 18 || bestHour < 6) {
        rhythm = "night-rider";
      }
    }

    return {
      studyDays: [...this.studyDays],
      totalSessions: this.totalSessions,
      averageSessionLengthSeconds: avgLength,
      bestStudyHour: bestHour,
      learningRhythm: rhythm
    };
  }

  public recordSession(durationSeconds: number, startTimestamp: string): void {
    this.totalSessions += 1;
    this.totalSessionSeconds += durationSeconds;

    // Record study date
    try {
      const dateStr = new Date(startTimestamp).toISOString().split("T")[0];
      if (!this.studyDays.includes(dateStr)) {
        this.studyDays.push(dateStr);
      }
      
      const hour = new Date(startTimestamp).getHours();
      this.hourFrequency[hour] = (this.hourFrequency[hour] || 0) + 1;
    } catch {
      // safe fallback
      const fallbackDate = new Date().toISOString().split("T")[0];
      if (!this.studyDays.includes(fallbackDate)) {
        this.studyDays.push(fallbackDate);
      }
      const hour = new Date().getHours();
      this.hourFrequency[hour] = (this.hourFrequency[hour] || 0) + 1;
    }
  }
}
