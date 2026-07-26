import {
  StudentLearningPreferences,
  LearningGoal,
  LearningPlan,
  StudyTask,
  StudyTaskStatus,
  DailyStudyPlan,
  WeeklyStudyPlan,
  NextBestAction,
  PlanProgress,
  GoalStatus,
  LearningGoalType,
  PlanGenerationMode
} from "../domain/LearningPlanTypes.ts";
import { PlanningValidation } from "../domain/PlanningValidation.ts";
import { PersonalLearningPlanEngine } from "../engine/PersonalLearningPlanEngine.ts";
import { NextBestActionEngine } from "../engine/NextBestActionEngine.ts";
import { PlanRebalancer } from "../engine/PlanRebalancer.ts";
import { LearningPlanProvider } from "../providers/LearningPlanProvider.ts";
import { LearningRecordProvider } from "../../learning/providers/LearningRecordProvider.ts";
import { StudentMasteryProfile } from "../../learning/domain/MasteryTypes.ts";

export class LearningPlanService {
  private planProvider: LearningPlanProvider;
  private learningProvider?: LearningRecordProvider;
  private planEngine: PersonalLearningPlanEngine;
  private nextActionEngine: NextBestActionEngine;

  constructor(planProvider: LearningPlanProvider, learningProvider?: LearningRecordProvider) {
    this.planProvider = planProvider;
    this.learningProvider = learningProvider;
    this.planEngine = new PersonalLearningPlanEngine();
    this.nextActionEngine = new NextBestActionEngine();
  }

  public async getPreferences(studentId: string): Promise<StudentLearningPreferences> {
    const existing = await this.planProvider.getPreferences(studentId);
    if (existing) {
      return existing;
    }
    const defaults = PlanningValidation.validatePreferences(studentId);
    await this.planProvider.savePreferences(defaults);
    return defaults;
  }

  public async savePreferences(
    studentId: string,
    raw: Partial<StudentLearningPreferences>
  ): Promise<StudentLearningPreferences> {
    const validated = PlanningValidation.validatePreferences(studentId, raw);
    await this.planProvider.savePreferences(validated);
    return validated;
  }

  public async getActiveGoal(studentId: string): Promise<LearningGoal> {
    const active = await this.planProvider.getActiveGoal(studentId);
    if (active) {
      return active;
    }
    const defaultGoal: LearningGoal = {
      id: `goal_default_${studentId}`,
      studentId,
      type: LearningGoalType.IMPROVE_SUBJECT,
      titleKu: "بەرەوپێشبردنی ئاستی وانەی بیرکاری",
      targetSubjectId: "subject-math-g9",
      weeklyTargetMinutes: 180,
      successCriteria: { metric: "mastery_score", targetValue: 0.8, currentValue: 0.0 },
      status: GoalStatus.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.planProvider.saveGoal(defaultGoal);
    return defaultGoal;
  }

  public async generatePlanForStudent(
    studentId: string,
    options?: { mode?: PlanGenerationMode; startDateIso?: string; authoritative?: boolean }
  ): Promise<LearningPlan> {
    const prefs = await this.getPreferences(studentId);
    const goal = await this.getActiveGoal(studentId);

    let masteryProfile: StudentMasteryProfile = {
      studentId,
      overallMasteryScore: 0,
      conceptMasteries: {},
      activeMisconceptions: [],
      recentRecommendedActions: [],
      updatedAt: new Date().toISOString()
    };
    if (this.learningProvider) {
      masteryProfile = await this.learningProvider.getStudentMasteryProfile(studentId);
    }

    const plan = this.planEngine.generatePlan({
      studentId,
      preferences: prefs,
      goal,
      masteryProfile,
      mode: options?.mode || "FIRST_TIME_PLAN",
      startDateIso: options?.startDateIso,
      authoritative: options?.authoritative !== undefined ? options.authoritative : true
    });

    await this.planProvider.savePlan(plan);

    for (const week of plan.weeklyPlans) {
      for (const day of week.dailyPlans) {
        for (const task of day.tasks) {
          await this.planProvider.saveTask(task);
        }
      }
    }

    return plan;
  }

  public async getCurrentPlan(studentId: string): Promise<LearningPlan> {
    let current = await this.planProvider.getCurrentPlan(studentId);
    if (!current) {
      current = await this.generatePlanForStudent(studentId);
    }
    return current;
  }

  public async getTodayPlan(studentId: string, dateIso?: string): Promise<DailyStudyPlan> {
    const currentPlan = await this.getCurrentPlan(studentId);
    const dateStr = (dateIso ? new Date(dateIso) : new Date()).toISOString().split("T")[0];

    for (const week of currentPlan.weeklyPlans) {
      const day = week.dailyPlans.find(d => d.date === dateStr);
      if (day) {
        return day;
      }
    }

    return {
      date: dateStr,
      dayOfWeek: new Date(dateStr).getDay(),
      targetMinutes: 45,
      plannedMinutes: 0,
      completedMinutes: 0,
      tasks: [],
      isRestDay: true
    };
  }

  public async getWeekPlan(studentId: string): Promise<WeeklyStudyPlan> {
    const currentPlan = await this.getCurrentPlan(studentId);
    return currentPlan.weeklyPlans[0] || {
      weekNumber: 1,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      dailyPlans: [],
      weeklyTargetMinutes: 0,
      weeklyPlannedMinutes: 0,
      weeklyCompletedMinutes: 0
    };
  }

  public async updateTaskStatus(
    studentId: string,
    taskId: string,
    targetStatus: StudyTaskStatus,
    actualDurationMinutes?: number
  ): Promise<{ task: StudyTask; plan: LearningPlan }> {
    const plan = await this.getCurrentPlan(studentId);

    let targetTask: StudyTask | null = null;

    for (const week of plan.weeklyPlans) {
      for (const day of week.dailyPlans) {
        const found = day.tasks.find(t => t.id === taskId);
        if (found) {
          targetTask = found;
          break;
        }
      }
      if (targetTask) break;
    }

    if (!targetTask || targetTask.studentId !== studentId) {
      throw new Error("ئەرکەکە نەدۆزرایەوە یان ڕێگەی پێدراو نییە.");
    }

    const isValid = PlanningValidation.validateTaskTransition(targetTask.status, targetStatus);
    if (!isValid) {
      throw new Error(`گوێستنەوەی ڕەوشی ئەرک له ${targetTask.status} بۆ ${targetStatus} ڕێگەپێدراو نییە.`);
    }

    targetTask.status = targetStatus;
    targetTask.updatedAt = new Date().toISOString();

    if (targetStatus === StudyTaskStatus.COMPLETED) {
      targetTask.completedAt = new Date().toISOString();
      if (typeof actualDurationMinutes === "number" && actualDurationMinutes > 0) {
        targetTask.actualDurationMinutes = actualDurationMinutes;
      }
    }

    await this.planProvider.saveTask(targetTask);

    const prefs = await this.getPreferences(studentId);
    const rebalanceRes = PlanRebalancer.rebalancePlan(plan, prefs, {
      completedTaskId: targetStatus === StudyTaskStatus.COMPLETED ? taskId : undefined,
      missedTaskId: targetStatus === StudyTaskStatus.MISSED ? taskId : undefined,
      skippedTaskId: targetStatus === StudyTaskStatus.SKIPPED ? taskId : undefined
    });

    await this.planProvider.savePlan(rebalanceRes.updatedPlan);
    await this.planProvider.saveAdjustment(rebalanceRes.adjustment);

    return { task: targetTask, plan: rebalanceRes.updatedPlan };
  }

  public async getNextBestAction(studentId: string): Promise<NextBestAction> {
    const todayPlan = await this.getTodayPlan(studentId);
    const prefs = await this.getPreferences(studentId);

    let masteryProfile: StudentMasteryProfile | undefined;
    if (this.learningProvider) {
      masteryProfile = await this.learningProvider.getStudentMasteryProfile(studentId);
    }

    return this.nextActionEngine.determineNextBestAction({
      studentMasteryProfile: masteryProfile,
      activeTasks: todayPlan.tasks,
      completedMinutesToday: todayPlan.completedMinutes,
      maxMinutesToday: todayPlan.targetMinutes || prefs.availableMinutesPerDay[new Date().getDay()] || 45
    });
  }

  public async getProgress(studentId: string): Promise<PlanProgress> {
    const plan = await this.getCurrentPlan(studentId);
    let plannedMins = 0;
    let completedMins = 0;
    let completedTasks = 0;
    let missedTasks = 0;
    let skippedTasks = 0;

    for (const week of plan.weeklyPlans) {
      for (const day of week.dailyPlans) {
        plannedMins += day.plannedMinutes;
        completedMins += day.completedMinutes;
        for (const task of day.tasks) {
          if (task.status === StudyTaskStatus.COMPLETED) completedTasks++;
          if (task.status === StudyTaskStatus.MISSED) missedTasks++;
          if (task.status === StudyTaskStatus.SKIPPED) skippedTasks++;
        }
      }
    }

    const progress: PlanProgress = {
      studentId,
      plannedMinutes: plannedMins,
      completedMinutes: completedMins,
      completedTasksCount: completedTasks,
      missedTasksCount: missedTasks,
      skippedTasksCount: skippedTasks,
      reviewCompletionRate: completedTasks > 0 ? (completedTasks / (completedTasks + missedTasks)) : 1.0,
      subjectDistribution: { "subject-math-g9": completedMins },
      weeklyConsistencyScore: completedTasks > 0 ? 0.85 : 0.0,
      goalProgressPercentage: plannedMins > 0 ? Math.min(Math.round((completedMins / plannedMins) * 100), 100) : 0,
      updatedAt: new Date().toISOString()
    };

    await this.planProvider.saveProgress(progress);
    return progress;
  }
}
