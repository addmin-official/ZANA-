import {
  StudentLearningPreferences,
  LearningGoal,
  StudyTaskStatus,
  LearningGoalType,
  StudyTimePreference
} from "./LearningPlanTypes.ts";

export class PlanningValidation {
  /**
   * Validates and returns normalized safe student learning preferences.
   * Empty preferences produce safe defaults. Negative or out-of-bound values are clamped.
   */
  public static validatePreferences(
    studentId: string,
    raw?: Partial<StudentLearningPreferences>
  ): StudentLearningPreferences {
    const defaultDays = [0, 1, 2, 3, 4, 5, 6];
    const preferredStudyDays = Array.isArray(raw?.preferredStudyDays) && raw.preferredStudyDays.length > 0
      ? raw.preferredStudyDays.filter(d => typeof d === "number" && d >= 0 && d <= 6)
      : defaultDays;

    const finalStudyDays = preferredStudyDays.length > 0 ? preferredStudyDays : defaultDays;

    // Available minutes per day mapping
    const availableMinutesPerDay: Record<number, number> = {};
    for (let d = 0; d < 7; d++) {
      let mins = raw?.availableMinutesPerDay?.[d];
      if (typeof mins !== "number" || isNaN(mins) || mins < 0) {
        mins = finalStudyDays.includes(d) ? 45 : 0;
      }
      // Clamp between 0 and 300 minutes (5 hours) max per day
      availableMinutesPerDay[d] = Math.min(Math.max(Math.round(mins), 0), 300);
    }

    // Preferred session length: clamp between 10 and 120 minutes
    let preferredSessionLengthMinutes = typeof raw?.preferredSessionLengthMinutes === "number"
      ? Math.round(raw.preferredSessionLengthMinutes)
      : 30;
    preferredSessionLengthMinutes = Math.min(Math.max(preferredSessionLengthMinutes, 10), 120);

    // Max tasks per day: clamp between 1 and 15
    let maxTasksPerDay = typeof raw?.maxTasksPerDay === "number"
      ? Math.round(raw.maxTasksPerDay)
      : 5;
    maxTasksPerDay = Math.min(Math.max(maxTasksPerDay, 1), 15);

    // Preferred study time
    const validTimes: StudyTimePreference[] = ["MORNING", "AFTERNOON", "EVENING", "NIGHT", "FLEXIBLE"];
    const preferredStudyTime: StudyTimePreference = raw?.preferredStudyTime && validTimes.includes(raw.preferredStudyTime)
      ? raw.preferredStudyTime
      : "AFTERNOON";

    // Target exam date validation: cannot be in the past
    let targetExamDate: string | undefined = undefined;
    if (raw?.targetExamDate && typeof raw.targetExamDate === "string") {
      const examTime = new Date(raw.targetExamDate).getTime();
      const nowTime = new Date().setHours(0, 0, 0, 0);
      if (!isNaN(examTime) && examTime >= nowTime) {
        targetExamDate = new Date(raw.targetExamDate).toISOString().split("T")[0];
      } else {
        throw new Error("تاریخی تاقیکردنەوە ناتوانێت لە ڕابردوودا بێت.");
      }
    }

    // Weekly goal minutes
    const weeklyGoalMinutes = typeof raw?.weeklyGoalMinutes === "number" && raw.weeklyGoalMinutes > 0
      ? Math.min(Math.round(raw.weeklyGoalMinutes), 2100)
      : Object.values(availableMinutesPerDay).reduce((a, b) => a + b, 0);

    return {
      studentId,
      preferredStudyDays: finalStudyDays,
      availableMinutesPerDay,
      preferredStudyTime,
      preferredSessionLengthMinutes,
      maxTasksPerDay,
      preferredSubjects: Array.isArray(raw?.preferredSubjects) ? raw.preferredSubjects.filter(Boolean) : [],
      difficultSubjects: Array.isArray(raw?.difficultSubjects) ? raw.difficultSubjects.filter(Boolean) : [],
      targetExamDate,
      weeklyGoalMinutes,
      reminderPreference: {
        enabled: Boolean(raw?.reminderPreference?.enabled),
        preferredHour: raw?.reminderPreference?.preferredHour,
        channel: raw?.reminderPreference?.channel || "IN_APP"
      },
      preferredLanguage: raw?.preferredLanguage || "ku",
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Validates a LearningGoal creation or update.
   */
  public static validateGoal(studentId: string, raw: Partial<LearningGoal>): Partial<LearningGoal> {
    if (!raw.type || !Object.values(LearningGoalType).includes(raw.type as LearningGoalType)) {
      throw new Error("جۆری ئامانج دروست نییە.");
    }

    if (!raw.targetSubjectId || typeof raw.targetSubjectId !== "string" || raw.targetSubjectId.trim() === "") {
      throw new Error("بابەتی دیاریکراو بۆ ئامانج پێویستە.");
    }

    if (raw.targetDate) {
      const dateVal = new Date(raw.targetDate).getTime();
      const nowVal = new Date().setHours(0, 0, 0, 0);
      if (isNaN(dateVal) || dateVal < nowVal) {
        throw new Error("تاریخی ئامانج ناتوانێت لە ڕابردوودا بێت.");
      }
    }

    const weeklyTargetMinutes = typeof raw.weeklyTargetMinutes === "number" && raw.weeklyTargetMinutes > 0
      ? Math.min(Math.round(raw.weeklyTargetMinutes), 2100)
      : 180;

    return {
      ...raw,
      studentId,
      titleKu: raw.titleKu || "ئامانجی نوێی خوێندن",
      weeklyTargetMinutes
    };
  }

  /**
   * Validates Task State Machine Transitions according to Phase 17 specs:
   * PLANNED -> AVAILABLE -> IN_PROGRESS -> COMPLETED
   * PLANNED/AVAILABLE/IN_PROGRESS -> SKIPPED
   * PLANNED/AVAILABLE (past due date) -> MISSED
   * MISSED/SKIPPED -> RESCHEDULED
   * PLANNED/AVAILABLE/IN_PROGRESS -> CANCELLED
   */
  public static validateTaskTransition(
    currentStatus: StudyTaskStatus,
    targetStatus: StudyTaskStatus
  ): boolean {
    if (currentStatus === targetStatus) {
      return true; // Idempotent check
    }

    // Terminal states cannot transition to other active states
    if (currentStatus === StudyTaskStatus.COMPLETED) {
      return false; // COMPLETED is immutable
    }

    if (currentStatus === StudyTaskStatus.CANCELLED) {
      return false; // CANCELLED cannot be completed or modified
    }

    switch (currentStatus) {
      case StudyTaskStatus.PLANNED:
        return [
          StudyTaskStatus.AVAILABLE,
          StudyTaskStatus.IN_PROGRESS,
          StudyTaskStatus.SKIPPED,
          StudyTaskStatus.MISSED,
          StudyTaskStatus.CANCELLED
        ].includes(targetStatus);

      case StudyTaskStatus.AVAILABLE:
        return [
          StudyTaskStatus.IN_PROGRESS,
          StudyTaskStatus.COMPLETED,
          StudyTaskStatus.SKIPPED,
          StudyTaskStatus.MISSED,
          StudyTaskStatus.CANCELLED
        ].includes(targetStatus);

      case StudyTaskStatus.IN_PROGRESS:
        return [
          StudyTaskStatus.COMPLETED,
          StudyTaskStatus.SKIPPED,
          StudyTaskStatus.CANCELLED,
          StudyTaskStatus.RESCHEDULED
        ].includes(targetStatus);

      case StudyTaskStatus.MISSED:
      case StudyTaskStatus.SKIPPED:
        return [
          StudyTaskStatus.RESCHEDULED,
          StudyTaskStatus.CANCELLED,
          StudyTaskStatus.AVAILABLE
        ].includes(targetStatus);

      case StudyTaskStatus.RESCHEDULED:
        return [
          StudyTaskStatus.PLANNED,
          StudyTaskStatus.AVAILABLE,
          StudyTaskStatus.IN_PROGRESS,
          StudyTaskStatus.CANCELLED
        ].includes(targetStatus);

      default:
        return false;
    }
  }
}
