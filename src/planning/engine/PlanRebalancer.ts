import { AssessmentResult } from "../../assessment/domain/AssessmentTypes.ts";
import {
  LearningPlan,
  StudyTask,
  StudyTaskStatus,
  StudyTaskPriority,
  PlanAdjustment,
  StudentLearningPreferences
} from "../domain/LearningPlanTypes.ts";
import { StudyTaskPrioritizer } from "./StudyTaskPrioritizer.ts";

export class PlanRebalancer {
  /**
   * Rebalances an active learning plan when a task status changes (completed, skipped, missed)
   * or when an assessment result is submitted.
   */
  public static rebalancePlan(
    plan: LearningPlan,
    preferences: StudentLearningPreferences,
    options: {
      completedTaskId?: string;
      missedTaskId?: string;
      skippedTaskId?: string;
      assessmentResult?: AssessmentResult;
      currentDateIso?: string;
    }
  ): { updatedPlan: LearningPlan; adjustment: PlanAdjustment } {
    const todayStr = (options.currentDateIso ? new Date(options.currentDateIso) : new Date())
      .toISOString().split("T")[0];

    const affectedTaskIds: string[] = [];
    let reasonCode = "ROUTINE_REBALANCE";
    let explanationKu = "ڕێکخستنەوەی خشتەی خوێندن لەسەر بنەمای چالاکییە نوێیەکان";

    const updatedPlan: LearningPlan = JSON.parse(JSON.stringify(plan));

    // Flatten all tasks from daily plans
    const allTasks: StudyTask[] = [];
    for (const week of updatedPlan.weeklyPlans) {
      for (const day of week.dailyPlans) {
        allTasks.push(...day.tasks);
      }
    }

    // 1. Handle Missed Task Recovery
    if (options.missedTaskId) {
      const taskIndex = allTasks.findIndex(t => t.id === options.missedTaskId);
      if (taskIndex >= 0) {
        const missedTask = allTasks[taskIndex];
        if (missedTask.status !== StudyTaskStatus.COMPLETED) {
          missedTask.status = StudyTaskStatus.MISSED;
          affectedTaskIds.push(missedTask.id);

          // Find next available study day that has not exceeded max daily minutes or tasks
          const nextDateStr = this.findNextAvailableStudyDate(updatedPlan, preferences, todayStr);
          if (nextDateStr) {
            const rescheduledTask: StudyTask = {
              ...missedTask,
              id: `task_recovered_${missedTask.id}_${Date.now()}`,
              status: StudyTaskStatus.PLANNED,
              scheduledDate: nextDateStr,
              priority: StudyTaskPriority.HIGH,
              source: "MISSED_TASK_RECOVERY",
              reason: {
                code: "RETRY_INCOMPLETE",
                evidenceIds: [missedTask.id],
                descriptionKu: "دوبارەکردنەوەی ئەرکی لەدەستچوو بۆ پاراستنی هێڵی فێربوون"
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            this.addTaskToDailyPlan(updatedPlan, rescheduledTask);
            affectedTaskIds.push(rescheduledTask.id);
            reasonCode = "MISSED_TASK_RECOVERY";
            explanationKu = "دوبارە ڕێکخستنەوەی ئەرکی لەدەستچوو بۆ ڕۆژانی داهاتوو بەبێ دروستکردنی بارگرانی";
          }
        }
      }
    }

    // 2. Handle Assessment Result Integration
    if (options.assessmentResult) {
      const { weaknessesKu, scoreBreakdown } = options.assessmentResult;
      reasonCode = "POST_ASSESSMENT_UPDATE";
      explanationKu = `ڕێکخستنەوەی پلانی خوێندن دوای تاقیکردنەوە (نمرە: ${Math.round(scoreBreakdown.percentage)}٪)`;

      // If score < 70%, schedule extra practice / review tasks for weak concepts
      if (scoreBreakdown.percentage < 70) {
        for (const [conceptId, info] of Object.entries(scoreBreakdown.byConcept)) {
          if (info.max > 0 && (info.scored / info.max) < 0.6) {
            const nextDateStr = this.findNextAvailableStudyDate(updatedPlan, preferences, todayStr);
            if (nextDateStr) {
              const remediationTask: StudyTask = {
                id: `task_assessment_fix_${conceptId}_${Date.now()}`,
                planId: updatedPlan.id,
                studentId: updatedPlan.studentId,
                type: "PRACTICE" as any,
                status: StudyTaskStatus.PLANNED,
                priority: StudyTaskPriority.HIGH,
                priorityScore: 50,
                titleKu: `راهێنانی خێرا لەسەر خاڵی لاواز (${conceptId})`,
                descriptionKu: "راهێنانی ئامانجدار لەسەر ئەو پرسیارانەی لە تاقیکردنەوەدا هەڵەیان تێدابوو",
                subjectId: options.assessmentResult.assessmentId || "subject-math-g9",
                conceptId,
                reason: {
                  code: "ASSESSMENT_WEAKNESS",
                  evidenceIds: [`assessment:${options.assessmentResult.attemptId}`],
                  descriptionKu: weaknessesKu[0] || "دەستنیشانکردنی پێویستی بەرەوپێشبردن لە تاقیکردنەوەدا"
                },
                estimatedDurationMinutes: 15,
                scheduledDate: nextDateStr,
                targetDifficulty: "EASY" as any,
                source: "ASSESSMENT_WEAKNESS",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };

              this.addTaskToDailyPlan(updatedPlan, remediationTask);
              affectedTaskIds.push(remediationTask.id);
            }
          }
        }
      }
    }

    // Recalculate daily and weekly plan totals
    for (const week of updatedPlan.weeklyPlans) {
      let weekPlanned = 0;
      let weekCompleted = 0;
      for (const day of week.dailyPlans) {
        day.plannedMinutes = day.tasks.reduce((sum, t) => sum + (t.estimatedDurationMinutes || 0), 0);
        day.completedMinutes = day.tasks
          .filter(t => t.status === StudyTaskStatus.COMPLETED)
          .reduce((sum, t) => sum + (t.actualDurationMinutes || t.estimatedDurationMinutes || 0), 0);
        weekPlanned += day.plannedMinutes;
        weekCompleted += day.completedMinutes;
      }
      week.weeklyPlannedMinutes = weekPlanned;
      week.weeklyCompletedMinutes = weekCompleted;
    }

    updatedPlan.updatedAt = new Date().toISOString();

    const adjustment: PlanAdjustment = {
      id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      planId: updatedPlan.id,
      studentId: updatedPlan.studentId,
      reasonCode,
      explanationKu,
      adjustedAt: new Date().toISOString(),
      affectedTaskIds
    };

    return { updatedPlan, adjustment };
  }

  private static findNextAvailableStudyDate(
    plan: LearningPlan,
    preferences: StudentLearningPreferences,
    fromDateStr: string
  ): string | null {
    const fromDate = new Date(fromDateStr);

    for (let offset = 1; offset <= 14; offset++) {
      const candidateDate = new Date(fromDate);
      candidateDate.setDate(candidateDate.getDate() + offset);
      const candStr = candidateDate.toISOString().split("T")[0];
      const dayOfWeek = candidateDate.getDay();

      const maxMinutes = preferences.availableMinutesPerDay[dayOfWeek] || 45;
      const maxTasks = preferences.maxTasksPerDay || 5;

      // Find candidate day in plan
      for (const week of plan.weeklyPlans) {
        const dayPlan = week.dailyPlans.find(d => d.date === candStr);
        if (dayPlan) {
          const currentMins = dayPlan.plannedMinutes;
          const currentTasksCount = dayPlan.tasks.length;
          if (currentMins < maxMinutes && currentTasksCount < maxTasks) {
            return candStr;
          }
        }
      }
    }

    // Fallback: next day
    const tomorrow = new Date(fromDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }

  private static addTaskToDailyPlan(plan: LearningPlan, task: StudyTask): void {
    for (const week of plan.weeklyPlans) {
      const dayPlan = week.dailyPlans.find(d => d.date === task.scheduledDate);
      if (dayPlan) {
        dayPlan.tasks.push(task);
        dayPlan.plannedMinutes += task.estimatedDurationMinutes;
        return;
      }
    }

    // If day plan not found, push to first non-rest day in first week
    if (plan.weeklyPlans[0]?.dailyPlans[0]) {
      plan.weeklyPlans[0].dailyPlans[0].tasks.push(task);
      plan.weeklyPlans[0].dailyPlans[0].plannedMinutes += task.estimatedDurationMinutes;
    }
  }
}
