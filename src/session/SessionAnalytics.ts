import { SessionHistoryEvent, SessionAnalyticsSummary } from "./types.ts";

export class SessionAnalytics {
  public generateSummary(
    history: SessionHistoryEvent[],
    completionPercentage: number,
    streakDays: number
  ): SessionAnalyticsSummary {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Find date 7 days ago
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let todayStudyTimeSeconds = 0;
    let weekStudyTimeSeconds = 0;

    // Track session lengths
    const sessionDurations: Record<string, number> = {};

    for (const event of history) {
      const eventDate = new Date(event.timestamp);
      const eventDateStr = event.timestamp.split("T")[0];

      // 1. Calculate today's study time
      if (eventDateStr === todayStr) {
        todayStudyTimeSeconds += event.durationSeconds;
      }

      // 2. Calculate week's study time
      if (eventDate >= sevenDaysAgo) {
        weekStudyTimeSeconds += event.durationSeconds;
      }

      // 3. Collect session duration totals
      if (event.sessionId) {
        sessionDurations[event.sessionId] = (sessionDurations[event.sessionId] || 0) + event.durationSeconds;
      }
    }

    const durationValues = Object.values(sessionDurations);
    const averageSessionLengthSeconds = durationValues.length > 0
      ? Math.round(durationValues.reduce((sum, val) => sum + val, 0) / durationValues.length)
      : 0;

    const longestSessionLengthSeconds = durationValues.length > 0
      ? Math.max(...durationValues)
      : 0;

    return {
      todayStudyTimeSeconds,
      weekStudyTimeSeconds,
      averageSessionLengthSeconds,
      longestSessionLengthSeconds,
      completionPercentage,
      currentStreakDays: streakDays
    };
  }
}
export const sessionAnalyticsInstance = new SessionAnalytics();
