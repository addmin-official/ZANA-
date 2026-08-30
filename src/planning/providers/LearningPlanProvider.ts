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
  private kv: CloudflareKVBinding | null = null;
  private memoryStore = new InMemoryLearningPlanProvider();
  private envMode: "production" | "development" | "test";

  constructor(kvBinding?: unknown, forceMode?: "production" | "development" | "test") {
    if (kvBinding) {
      this.kv = kvBinding as CloudflareKVBinding;
    }

    if (forceMode) {
      this.envMode = forceMode;
    } else {
      const envVar = typeof process !== "undefined" ? (process.env?.ZANA_ENV || process.env?.NODE_ENV) : undefined;
      const isNode = typeof process !== "undefined" && process.versions && !!process.versions.node;
      if (envVar === "production" && !isNode) {
        this.envMode = "production";
      } else if (envVar === "test") {
        this.envMode = "test";
      } else {
        this.envMode = "development";
      }
    }

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
    if (this.kv) {
      const k = this.key(preferences.studentId, "preferences");
      await this.kv.put(k, JSON.stringify(preferences));
    } else {
      await this.memoryStore.savePreferences(preferences);
    }
  }

  public async getPreferences(studentId: string): Promise<StudentLearningPreferences | null> {
    if (this.kv) {
      const k = this.key(studentId, "preferences");
      const raw = await this.kv.get(k);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return this.memoryStore.getPreferences(studentId);
  }

  public async saveGoal(goal: LearningGoal): Promise<void> {
    if (this.kv) {
      const kGoal = this.key(goal.studentId, `goal:${goal.id}`);
      const kActive = this.key(goal.studentId, "active_goal_id");
      await this.kv.put(kGoal, JSON.stringify(goal));
      if (goal.status === "ACTIVE") {
        await this.kv.put(kActive, goal.id);
      }
    } else {
      await this.memoryStore.saveGoal(goal);
    }
  }

  public async getGoal(studentId: string, goalId: string): Promise<LearningGoal | null> {
    if (this.kv) {
      const k = this.key(studentId, `goal:${goalId}`);
      const raw = await this.kv.get(k);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return this.memoryStore.getGoal(studentId, goalId);
  }

  public async getActiveGoal(studentId: string): Promise<LearningGoal | null> {
    if (this.kv) {
      const kActive = this.key(studentId, "active_goal_id");
      const activeGoalId = await this.kv.get(kActive);
      if (!activeGoalId) return null;
      return this.getGoal(studentId, activeGoalId);
    }
    return this.memoryStore.getActiveGoal(studentId);
  }

  public async savePlan(plan: LearningPlan): Promise<void> {
    if (this.kv) {
      const kPlan = this.key(plan.studentId, `plan:${plan.id}`);
      const kCurrent = this.key(plan.studentId, "current_plan");
      await this.kv.put(kPlan, JSON.stringify(plan));
      if (plan.status === "ACTIVE") {
        await this.kv.put(kCurrent, JSON.stringify(plan));
      }
    } else {
      await this.memoryStore.savePlan(plan);
    }
  }

  public async getPlan(studentId: string, planId: string): Promise<LearningPlan | null> {
    if (this.kv) {
      const k = this.key(studentId, `plan:${planId}`);
      const raw = await this.kv.get(k);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return this.memoryStore.getPlan(studentId, planId);
  }

  public async getCurrentPlan(studentId: string): Promise<LearningPlan | null> {
    if (this.kv) {
      const k = this.key(studentId, "current_plan");
      const raw = await this.kv.get(k);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return this.memoryStore.getCurrentPlan(studentId);
  }

  public async saveTask(task: StudyTask): Promise<void> {
    if (this.kv) {
      const k = this.key(task.studentId, `task:${task.id}`);
      await this.kv.put(k, JSON.stringify(task));
    } else {
      await this.memoryStore.saveTask(task);
    }
  }

  public async getTask(studentId: string, taskId: string): Promise<StudyTask | null> {
    if (this.kv) {
      const k = this.key(studentId, `task:${taskId}`);
      const raw = await this.kv.get(k);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return this.memoryStore.getTask(studentId, taskId);
  }

  public async saveReviewItem(studentId: string, item: ReviewItem): Promise<void> {
    if (this.kv) {
      const k = this.key(studentId, `review:${item.conceptId}`);
      await this.kv.put(k, JSON.stringify(item));
    } else {
      await this.memoryStore.saveReviewItem(studentId, item);
    }
  }

  public async getReviewItems(studentId: string): Promise<ReviewItem[]> {
    if (this.kv) {
      if (!this.kv.list) return [];
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
    return this.memoryStore.getReviewItems(studentId);
  }

  public async saveProgress(progress: PlanProgress): Promise<void> {
    if (this.kv) {
      const k = this.key(progress.studentId, "progress");
      await this.kv.put(k, JSON.stringify(progress));
    } else {
      await this.memoryStore.saveProgress(progress);
    }
  }

  public async getProgress(studentId: string): Promise<PlanProgress | null> {
    if (this.kv) {
      const k = this.key(studentId, "progress");
      const raw = await this.kv.get(k);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return this.memoryStore.getProgress(studentId);
  }

  public async saveAdjustment(adjustment: PlanAdjustment): Promise<void> {
    if (this.kv) {
      const k = this.key(adjustment.studentId, `adj:${adjustment.id}`);
      await this.kv.put(k, JSON.stringify(adjustment));
    } else {
      await this.memoryStore.saveAdjustment(adjustment);
    }
  }

  public async appendAnalyticsEvent(event: PlanningAnalyticsEvent): Promise<void> {
    if (this.kv) {
      const k = this.key(event.studentId, `event:${event.id}`);
      await this.kv.put(k, JSON.stringify(event));
    } else {
      await this.memoryStore.appendAnalyticsEvent(event);
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
