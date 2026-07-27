import {
  StudentLearningPreferences,
  LearningGoal,
  LearningPlan,
  StudyTask,
  ReviewItem,
  PlanProgress,
  PlanAdjustment,
  PlanningAnalyticsEvent
} from "../domain/LearningPlanTypes.ts";

export interface LearningPlanProvider {
  // Preferences
  savePreferences(preferences: StudentLearningPreferences): Promise<void>;
  getPreferences(studentId: string): Promise<StudentLearningPreferences | null>;

  // Goals
  saveGoal(goal: LearningGoal): Promise<void>;
  getGoal(studentId: string, goalId: string): Promise<LearningGoal | null>;
  getActiveGoal(studentId: string): Promise<LearningGoal | null>;

  // Plans
  savePlan(plan: LearningPlan): Promise<void>;
  getPlan(studentId: string, planId: string): Promise<LearningPlan | null>;
  getCurrentPlan(studentId: string): Promise<LearningPlan | null>;

  // Tasks
  saveTask(task: StudyTask): Promise<void>;
  getTask(studentId: string, taskId: string): Promise<StudyTask | null>;

  // Review Queue
  saveReviewItem(studentId: string, item: ReviewItem): Promise<void>;
  getReviewItems(studentId: string): Promise<ReviewItem[]>;

  // Progress
  saveProgress(progress: PlanProgress): Promise<void>;
  getProgress(studentId: string): Promise<PlanProgress | null>;

  // Adjustments & Events
  saveAdjustment(adjustment: PlanAdjustment): Promise<void>;
  appendAnalyticsEvent(event: PlanningAnalyticsEvent): Promise<void>;
}

import { CloudflareKVBinding } from "../../learning/providers/LearningRecordProvider.ts";

export class PersistentLearningPlanProvider implements LearningPlanProvider {
  private kv: CloudflareKVBinding | null;
  private envMode: "production" | "development" | "test";

  constructor(kvBinding?: unknown, envMode: "production" | "development" | "test" = "production") {
    this.kv = (kvBinding as CloudflareKVBinding) || null;
    this.envMode = envMode;

    if (this.envMode === "production" && !this.kv) {
      throw new Error(
        "Cloudflare KV binding (LEARNING_RECORDS_KV or ZANA_LEARNING_KV) is required in production environment for PersistentLearningPlanProvider."
      );
    }
  }

  // Helper method for KV keys
  private key(studentId: string, subkey: string): string {
    return `student:${studentId}:planning:${subkey}`;
  }

  public async savePreferences(preferences: StudentLearningPreferences): Promise<void> {
    const k = this.key(preferences.studentId, "preferences");
    if (this.kv) {
      await this.kv.put(k, JSON.stringify(preferences));
    }
  }

  public async getPreferences(studentId: string): Promise<StudentLearningPreferences | null> {
    const k = this.key(studentId, "preferences");
    if (!this.kv) return null;
    const raw = await this.kv.get(k);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public async saveGoal(goal: LearningGoal): Promise<void> {
    const kGoal = this.key(goal.studentId, `goal:${goal.id}`);
    const kActive = this.key(goal.studentId, "active_goal_id");

    if (this.kv) {
      await this.kv.put(kGoal, JSON.stringify(goal));
      if (goal.status === "ACTIVE") {
        await this.kv.put(kActive, goal.id);
      }
    }
  }

  public async getGoal(studentId: string, goalId: string): Promise<LearningGoal | null> {
    const k = this.key(studentId, `goal:${goalId}`);
    if (!this.kv) return null;
    const raw = await this.kv.get(k);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public async getActiveGoal(studentId: string): Promise<LearningGoal | null> {
    const kActive = this.key(studentId, "active_goal_id");
    if (!this.kv) return null;
    const activeGoalId = await this.kv.get(kActive);
    if (!activeGoalId) return null;
    return this.getGoal(studentId, activeGoalId);
  }

  public async savePlan(plan: LearningPlan): Promise<void> {
    const kPlan = this.key(plan.studentId, `plan:${plan.id}`);
    const kCurrent = this.key(plan.studentId, "current_plan");

    if (this.kv) {
      await this.kv.put(kPlan, JSON.stringify(plan));
      if (plan.status === "ACTIVE") {
        await this.kv.put(kCurrent, JSON.stringify(plan));
      }
    }
  }

  public async getPlan(studentId: string, planId: string): Promise<LearningPlan | null> {
    const k = this.key(studentId, `plan:${planId}`);
    if (!this.kv) return null;
    const raw = await this.kv.get(k);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public async getCurrentPlan(studentId: string): Promise<LearningPlan | null> {
    const k = this.key(studentId, "current_plan");
    if (!this.kv) return null;
    const raw = await this.kv.get(k);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public async saveTask(task: StudyTask): Promise<void> {
    const k = this.key(task.studentId, `task:${task.id}`);
    if (this.kv) {
      await this.kv.put(k, JSON.stringify(task));
    }
  }

  public async getTask(studentId: string, taskId: string): Promise<StudyTask | null> {
    const k = this.key(studentId, `task:${taskId}`);
    if (!this.kv) return null;
    const raw = await this.kv.get(k);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public async saveReviewItem(studentId: string, item: ReviewItem): Promise<void> {
    const k = this.key(studentId, `review:${item.conceptId}`);
    if (this.kv) {
      await this.kv.put(k, JSON.stringify(item));
    }
  }

  public async getReviewItems(studentId: string): Promise<ReviewItem[]> {
    if (!this.kv || !this.kv.list) return [];
    const prefix = this.key(studentId, "review:");
    try {
      const listRes = await this.kv.list({ prefix });
      const items: ReviewItem[] = [];
      for (const k of listRes.keys || []) {
        const raw = await this.kv.get(k.name);
        if (raw) {
          items.push(JSON.parse(raw));
        }
      }
      return items;
    } catch {
      return [];
    }
  }

  public async saveProgress(progress: PlanProgress): Promise<void> {
    const k = this.key(progress.studentId, "progress");
    if (this.kv) {
      await this.kv.put(k, JSON.stringify(progress));
    }
  }

  public async getProgress(studentId: string): Promise<PlanProgress | null> {
    const k = this.key(studentId, "progress");
    if (!this.kv) return null;
    const raw = await this.kv.get(k);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public async saveAdjustment(adjustment: PlanAdjustment): Promise<void> {
    const k = this.key(adjustment.studentId, `adj:${adjustment.id}`);
    if (this.kv) {
      await this.kv.put(k, JSON.stringify(adjustment));
    }
  }

  public async appendAnalyticsEvent(event: PlanningAnalyticsEvent): Promise<void> {
    const k = this.key(event.studentId, `event:${event.id}`);
    if (this.kv) {
      await this.kv.put(k, JSON.stringify(event));
    }
  }
}

/**
 * Isolated in-memory provider for unit testing without KV dependency.
 */
export class InMemoryLearningPlanProvider implements LearningPlanProvider {
  private store = new Map<string, string>();

  public async savePreferences(preferences: StudentLearningPreferences): Promise<void> {
    this.store.set(`pref:${preferences.studentId}`, JSON.stringify(preferences));
  }

  public async getPreferences(studentId: string): Promise<StudentLearningPreferences | null> {
    const raw = this.store.get(`pref:${studentId}`);
    return raw ? JSON.parse(raw) : null;
  }

  public async saveGoal(goal: LearningGoal): Promise<void> {
    this.store.set(`goal:${goal.studentId}:${goal.id}`, JSON.stringify(goal));
    if (goal.status === "ACTIVE") {
      this.store.set(`active_goal:${goal.studentId}`, goal.id);
    }
  }

  public async getGoal(studentId: string, goalId: string): Promise<LearningGoal | null> {
    const raw = this.store.get(`goal:${studentId}:${goalId}`);
    return raw ? JSON.parse(raw) : null;
  }

  public async getActiveGoal(studentId: string): Promise<LearningGoal | null> {
    const activeId = this.store.get(`active_goal:${studentId}`);
    if (!activeId) return null;
    return this.getGoal(studentId, activeId);
  }

  public async savePlan(plan: LearningPlan): Promise<void> {
    this.store.set(`plan:${plan.studentId}:${plan.id}`, JSON.stringify(plan));
    if (plan.status === "ACTIVE") {
      this.store.set(`current_plan:${plan.studentId}`, JSON.stringify(plan));
    }
  }

  public async getPlan(studentId: string, planId: string): Promise<LearningPlan | null> {
    const raw = this.store.get(`plan:${studentId}:${planId}`);
    return raw ? JSON.parse(raw) : null;
  }

  public async getCurrentPlan(studentId: string): Promise<LearningPlan | null> {
    const raw = this.store.get(`current_plan:${studentId}`);
    return raw ? JSON.parse(raw) : null;
  }

  public async saveTask(task: StudyTask): Promise<void> {
    this.store.set(`task:${task.studentId}:${task.id}`, JSON.stringify(task));
  }

  public async getTask(studentId: string, taskId: string): Promise<StudyTask | null> {
    const raw = this.store.get(`task:${studentId}:${taskId}`);
    return raw ? JSON.parse(raw) : null;
  }

  public async saveReviewItem(studentId: string, item: ReviewItem): Promise<void> {
    this.store.set(`review:${studentId}:${item.conceptId}`, JSON.stringify(item));
  }

  public async getReviewItems(studentId: string): Promise<ReviewItem[]> {
    const prefix = `review:${studentId}:`;
    const items: ReviewItem[] = [];
    for (const [key, raw] of this.store.entries()) {
      if (key.startsWith(prefix)) {
        items.push(JSON.parse(raw));
      }
    }
    return items;
  }

  public async saveProgress(progress: PlanProgress): Promise<void> {
    this.store.set(`progress:${progress.studentId}`, JSON.stringify(progress));
  }

  public async getProgress(studentId: string): Promise<PlanProgress | null> {
    const raw = this.store.get(`progress:${studentId}`);
    return raw ? JSON.parse(raw) : null;
  }

  public async saveAdjustment(adjustment: PlanAdjustment): Promise<void> {
    this.store.set(`adj:${adjustment.studentId}:${adjustment.id}`, JSON.stringify(adjustment));
  }

  public async appendAnalyticsEvent(event: PlanningAnalyticsEvent): Promise<void> {
    this.store.set(`event:${event.studentId}:${event.id}`, JSON.stringify(event));
  }
}
