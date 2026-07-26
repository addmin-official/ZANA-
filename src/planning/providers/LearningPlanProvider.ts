import {
  StudentLearningPreferences,
  LearningGoal,
  LearningPlan,
  StudyTask,
  ReviewItem,
  PlanProgress,
  PlanAdjustment,
  PlanningAnalyticsEvent,
} from "../domain/LearningPlanTypes.ts";
import {
  isLearningGoal,
  isLearningPlan,
  isPlanProgress,
  isReviewItem,
  isStudentLearningPreferences,
  isStudyTask,
  parsePlanningJson,
} from "../domain/PlanningSchemas.ts";
import {
  CloudflareKvNamespace,
  isCloudflareKvNamespace,
  requireCloudflareKvNamespace,
} from "../../platform/CloudflareKv.ts";

export interface LearningPlanProvider {
  savePreferences(preferences: StudentLearningPreferences): Promise<void>;
  getPreferences(studentId: string): Promise<StudentLearningPreferences | null>;
  saveGoal(goal: LearningGoal): Promise<void>;
  getGoal(studentId: string, goalId: string): Promise<LearningGoal | null>;
  getActiveGoal(studentId: string): Promise<LearningGoal | null>;
  savePlan(plan: LearningPlan): Promise<void>;
  getPlan(studentId: string, planId: string): Promise<LearningPlan | null>;
  getCurrentPlan(studentId: string): Promise<LearningPlan | null>;
  saveTask(task: StudyTask): Promise<void>;
  getTask(studentId: string, taskId: string): Promise<StudyTask | null>;
  saveReviewItem(studentId: string, item: ReviewItem): Promise<void>;
  getReviewItems(studentId: string): Promise<ReviewItem[]>;
  saveProgress(progress: PlanProgress): Promise<void>;
  getProgress(studentId: string): Promise<PlanProgress | null>;
  saveAdjustment(adjustment: PlanAdjustment): Promise<void>;
  appendAnalyticsEvent(event: PlanningAnalyticsEvent): Promise<void>;
}

type RuntimeMode = "production" | "development" | "test";

function assertStudentScope(expectedStudentId: string, actualStudentId: string, label: string): void {
  if (expectedStudentId !== actualStudentId) {
    throw new Error(`Student scope mismatch in ${label}`);
  }
}

export class PersistentLearningPlanProvider implements LearningPlanProvider {
  private readonly kv: CloudflareKvNamespace | null;
  private readonly envMode: RuntimeMode;

  constructor(kvBinding?: unknown, envMode: RuntimeMode = "production") {
    this.envMode = envMode;
    this.kv = isCloudflareKvNamespace(kvBinding) ? kvBinding : null;
    if (this.envMode === "production") {
      requireCloudflareKvNamespace(kvBinding, "LEARNING_RECORDS_KV");
    }
  }

  private requireKv(): CloudflareKvNamespace {
    if (this.kv) return this.kv;
    throw new Error("Persistent planning storage is unavailable outside the explicit in-memory provider");
  }

  private key(studentId: string, subkey: string): string {
    return `student:${studentId}:planning:${subkey}`;
  }

  private async putJson(key: string, value: unknown): Promise<void> {
    const payload = JSON.stringify(value);
    if (payload.length > 131_072) throw new Error("Planning payload size limit exceeded");
    await this.requireKv().put(key, payload);
  }

  public async savePreferences(preferences: StudentLearningPreferences): Promise<void> {
    await this.putJson(this.key(preferences.studentId, "preferences"), preferences);
  }

  public async getPreferences(studentId: string): Promise<StudentLearningPreferences | null> {
    const raw = await this.requireKv().get(this.key(studentId, "preferences"));
    if (raw === null) return null;
    const preferences = parsePlanningJson(raw, isStudentLearningPreferences, "student preferences");
    assertStudentScope(studentId, preferences.studentId, "student preferences");
    return preferences;
  }

  public async saveGoal(goal: LearningGoal): Promise<void> {
    await this.putJson(this.key(goal.studentId, `goal:${goal.id}`), goal);
    if (goal.status === "ACTIVE") {
      await this.requireKv().put(this.key(goal.studentId, "active_goal_id"), goal.id);
    }
  }

  public async getGoal(studentId: string, goalId: string): Promise<LearningGoal | null> {
    const raw = await this.requireKv().get(this.key(studentId, `goal:${goalId}`));
    if (raw === null) return null;
    const goal = parsePlanningJson(raw, isLearningGoal, "learning goal");
    assertStudentScope(studentId, goal.studentId, "learning goal");
    return goal;
  }

  public async getActiveGoal(studentId: string): Promise<LearningGoal | null> {
    const goalId = await this.requireKv().get(this.key(studentId, "active_goal_id"));
    if (goalId === null) return null;
    return this.getGoal(studentId, goalId);
  }

  public async savePlan(plan: LearningPlan): Promise<void> {
    await this.putJson(this.key(plan.studentId, `plan:${plan.id}`), plan);
    if (plan.status === "ACTIVE") {
      await this.requireKv().put(this.key(plan.studentId, "current_plan_id"), plan.id);
    }
  }

  public async getPlan(studentId: string, planId: string): Promise<LearningPlan | null> {
    const raw = await this.requireKv().get(this.key(studentId, `plan:${planId}`));
    if (raw === null) return null;
    const plan = parsePlanningJson(raw, isLearningPlan, "learning plan");
    assertStudentScope(studentId, plan.studentId, "learning plan");
    return plan;
  }

  public async getCurrentPlan(studentId: string): Promise<LearningPlan | null> {
    const planId = await this.requireKv().get(this.key(studentId, "current_plan_id"));
    if (planId === null) return null;
    return this.getPlan(studentId, planId);
  }

  public async saveTask(task: StudyTask): Promise<void> {
    await this.putJson(this.key(task.studentId, `task:${task.id}`), task);
  }

  public async getTask(studentId: string, taskId: string): Promise<StudyTask | null> {
    const raw = await this.requireKv().get(this.key(studentId, `task:${taskId}`));
    if (raw === null) return null;
    const task = parsePlanningJson(raw, isStudyTask, "study task");
    assertStudentScope(studentId, task.studentId, "study task");
    return task;
  }

  public async saveReviewItem(studentId: string, item: ReviewItem): Promise<void> {
    await this.putJson(this.key(studentId, `review:${item.conceptId}`), item);
  }

  public async getReviewItems(studentId: string): Promise<ReviewItem[]> {
    const prefix = this.key(studentId, "review:");
    const result = await this.requireKv().list({ prefix });
    const items: ReviewItem[] = [];
    for (const entry of result.keys) {
      const raw = await this.requireKv().get(entry.name);
      if (raw !== null) items.push(parsePlanningJson(raw, isReviewItem, "review item"));
    }
    return items;
  }

  public async saveProgress(progress: PlanProgress): Promise<void> {
    await this.putJson(this.key(progress.studentId, "progress"), progress);
  }

  public async getProgress(studentId: string): Promise<PlanProgress | null> {
    const raw = await this.requireKv().get(this.key(studentId, "progress"));
    if (raw === null) return null;
    const progress = parsePlanningJson(raw, isPlanProgress, "plan progress");
    assertStudentScope(studentId, progress.studentId, "plan progress");
    return progress;
  }

  public async saveAdjustment(adjustment: PlanAdjustment): Promise<void> {
    await this.putJson(this.key(adjustment.studentId, `adjustment:${adjustment.id}`), adjustment);
  }

  public async appendAnalyticsEvent(event: PlanningAnalyticsEvent): Promise<void> {
    await this.putJson(this.key(event.studentId, `event:${event.id}`), event);
  }
}

/** Explicit test/development provider; production code must use PersistentLearningPlanProvider. */
export class InMemoryLearningPlanProvider implements LearningPlanProvider {
  private readonly preferences = new Map<string, StudentLearningPreferences>();
  private readonly goals = new Map<string, LearningGoal>();
  private readonly activeGoalIds = new Map<string, string>();
  private readonly plans = new Map<string, LearningPlan>();
  private readonly currentPlanIds = new Map<string, string>();
  private readonly tasks = new Map<string, StudyTask>();
  private readonly reviewItems = new Map<string, ReviewItem>();
  private readonly progress = new Map<string, PlanProgress>();
  private readonly adjustments = new Map<string, PlanAdjustment>();
  private readonly analyticsEvents = new Map<string, PlanningAnalyticsEvent>();

  private scoped(studentId: string, id: string): string {
    return `${studentId}:${id}`;
  }

  public async savePreferences(preferences: StudentLearningPreferences): Promise<void> {
    this.preferences.set(preferences.studentId, preferences);
  }

  public async getPreferences(studentId: string): Promise<StudentLearningPreferences | null> {
    return this.preferences.get(studentId) ?? null;
  }

  public async saveGoal(goal: LearningGoal): Promise<void> {
    this.goals.set(this.scoped(goal.studentId, goal.id), goal);
    if (goal.status === "ACTIVE") this.activeGoalIds.set(goal.studentId, goal.id);
  }

  public async getGoal(studentId: string, goalId: string): Promise<LearningGoal | null> {
    return this.goals.get(this.scoped(studentId, goalId)) ?? null;
  }

  public async getActiveGoal(studentId: string): Promise<LearningGoal | null> {
    const goalId = this.activeGoalIds.get(studentId);
    return goalId ? this.getGoal(studentId, goalId) : null;
  }

  public async savePlan(plan: LearningPlan): Promise<void> {
    this.plans.set(this.scoped(plan.studentId, plan.id), plan);
    if (plan.status === "ACTIVE") this.currentPlanIds.set(plan.studentId, plan.id);
  }

  public async getPlan(studentId: string, planId: string): Promise<LearningPlan | null> {
    return this.plans.get(this.scoped(studentId, planId)) ?? null;
  }

  public async getCurrentPlan(studentId: string): Promise<LearningPlan | null> {
    const planId = this.currentPlanIds.get(studentId);
    return planId ? this.getPlan(studentId, planId) : null;
  }

  public async saveTask(task: StudyTask): Promise<void> {
    this.tasks.set(this.scoped(task.studentId, task.id), task);
  }

  public async getTask(studentId: string, taskId: string): Promise<StudyTask | null> {
    return this.tasks.get(this.scoped(studentId, taskId)) ?? null;
  }

  public async saveReviewItem(studentId: string, item: ReviewItem): Promise<void> {
    this.reviewItems.set(this.scoped(studentId, item.conceptId), item);
  }

  public async getReviewItems(studentId: string): Promise<ReviewItem[]> {
    const prefix = `${studentId}:`;
    return [...this.reviewItems.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, item]) => item);
  }

  public async saveProgress(progress: PlanProgress): Promise<void> {
    this.progress.set(progress.studentId, progress);
  }

  public async getProgress(studentId: string): Promise<PlanProgress | null> {
    return this.progress.get(studentId) ?? null;
  }

  public async saveAdjustment(adjustment: PlanAdjustment): Promise<void> {
    this.adjustments.set(this.scoped(adjustment.studentId, adjustment.id), adjustment);
  }

  public async appendAnalyticsEvent(event: PlanningAnalyticsEvent): Promise<void> {
    this.analyticsEvents.set(this.scoped(event.studentId, event.id), event);
  }
}
