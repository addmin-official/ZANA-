import {
  StudentMasteryProfile,
  ConceptMasteryState,
  LearningEvent,
  AdaptiveRecommendation,
  MisconceptionState,
  MisconceptionStatus,
  LearningSession,
  ExerciseAttempt,
  MasteryStatus,
  DifficultyLevel
} from "../domain/MasteryTypes.ts";

export interface LearningRecordProvider {
  getStudentMasteryProfile(studentId: string): Promise<StudentMasteryProfile>;
  getConceptMastery(studentId: string, conceptId: string): Promise<ConceptMasteryState | null>;
  listConceptMasteries(studentId: string): Promise<ConceptMasteryState[]>;
  saveMasteryChange(studentId: string, conceptId: string, masteryState: ConceptMasteryState): Promise<void>;
  appendLearningEvent(studentId: string, event: LearningEvent): Promise<void>;
  createLearningSession(session: LearningSession): Promise<void>;
  updateLearningSession(session: LearningSession): Promise<void>;
  listRecentAttempts(studentId: string, limit?: number): Promise<ExerciseAttempt[]>;
  listActiveMisconceptions(studentId: string): Promise<MisconceptionState[]>;
  saveRecommendation(recommendation: AdaptiveRecommendation): Promise<void>;
  listRecommendations(studentId: string, status?: string): Promise<AdaptiveRecommendation[]>;
}

// Helper to access Node's fs module safely without breaking browser or Cloudflare environments
const getFs = () => {
  if (typeof window === "undefined" && typeof require !== "undefined") {
    try {
      return require("fs");
    } catch (e) {}
  }
  return null;
};

// =========================================================================
// In-Memory Implementation (Server-side/Tests fallback)
// =========================================================================
export class InMemoryLearningRecordProvider implements LearningRecordProvider {
  private profiles = new Map<string, StudentMasteryProfile>();
  private events = new Map<string, LearningEvent[]>();
  private sessions = new Map<string, LearningSession>();
  private attempts = new Map<string, ExerciseAttempt[]>();
  private recommendations = new Map<string, AdaptiveRecommendation[]>();

  public async getStudentMasteryProfile(studentId: string): Promise<StudentMasteryProfile> {
    let profile = this.profiles.get(studentId);
    if (!profile) {
      profile = {
        studentId,
        overallMasteryScore: 0.0,
        conceptMasteries: {},
        activeMisconceptions: [],
        recentRecommendedActions: []
      };
      this.profiles.set(studentId, profile);
    }
    return { ...profile };
  }

  public async getConceptMastery(studentId: string, conceptId: string): Promise<ConceptMasteryState | null> {
    const profile = await this.getStudentMasteryProfile(studentId);
    return profile.conceptMasteries[conceptId] || null;
  }

  public async listConceptMasteries(studentId: string): Promise<ConceptMasteryState[]> {
    const profile = await this.getStudentMasteryProfile(studentId);
    return Object.values(profile.conceptMasteries);
  }

  public async saveMasteryChange(studentId: string, conceptId: string, masteryState: ConceptMasteryState): Promise<void> {
    const profile = await this.getStudentMasteryProfile(studentId);
    profile.conceptMasteries[conceptId] = masteryState;
    
    // Recalculate overall score as average of active masteries
    const masteries = Object.values(profile.conceptMasteries);
    if (masteries.length > 0) {
      const sum = masteries.reduce((acc, m) => acc + m.masteryScore, 0);
      profile.overallMasteryScore = Number((sum / masteries.length).toFixed(3));
    }

    this.profiles.set(studentId, profile);
  }

  public async appendLearningEvent(studentId: string, event: LearningEvent): Promise<void> {
    const list = this.events.get(studentId) || [];
    list.push(event);
    this.events.set(studentId, list);

    if (event.type === "EXERCISE_ATTEMPT") {
      const attemptData = event.data as ExerciseAttempt;
      const atts = this.attempts.get(studentId) || [];
      atts.unshift(attemptData);
      this.attempts.set(studentId, atts);
    }
  }

  public async createLearningSession(session: LearningSession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  public async updateLearningSession(session: LearningSession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  public async listRecentAttempts(studentId: string, limit: number = 20): Promise<ExerciseAttempt[]> {
    const atts = this.attempts.get(studentId) || [];
    return atts.slice(0, limit);
  }

  public async listActiveMisconceptions(studentId: string): Promise<MisconceptionState[]> {
    const profile = await this.getStudentMasteryProfile(studentId);
    return profile.activeMisconceptions.filter(m => m.resolvedAt === null);
  }

  public async saveRecommendation(recommendation: AdaptiveRecommendation): Promise<void> {
    const sId = recommendation.studentId;
    const list = this.recommendations.get(sId) || [];
    const index = list.findIndex(r => r.id === recommendation.id);
    if (index >= 0) {
      list[index] = recommendation;
    } else {
      list.push(recommendation);
    }
    this.recommendations.set(sId, list);
  }

  public async listRecommendations(studentId: string, status?: string): Promise<AdaptiveRecommendation[]> {
    const list = this.recommendations.get(studentId) || [];
    if (status) {
      return list.filter(r => r.status === status);
    }
    return list;
  }
}

// =========================================================================
// Browser LocalStorage Implementation (Client-side offline fallback)
// =========================================================================
export class LocalStorageLearningRecordProvider implements LearningRecordProvider {
  private isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

  private safeGet<T>(key: string, fallback: T): T {
    if (!this.isBrowser) return fallback;
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return fallback;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error reading key "${key}" from localStorage:`, error);
      return fallback;
    }
  }

  private safeSet<T>(key: string, value: T): void {
    if (!this.isBrowser) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing key "${key}" to localStorage:`, error);
    }
  }

  private getProfileKey(studentId: string): string {
    return `zana:learning:profile:${studentId}`;
  }

  private getEventsKey(studentId: string): string {
    return `zana:learning:events:${studentId}`;
  }

  private getAttemptsKey(studentId: string): string {
    return `zana:learning:attempts:${studentId}`;
  }

  private getRecommendationsKey(studentId: string): string {
    return `zana:learning:recommendations:${studentId}`;
  }

  private getSessionKey(sessionId: string): string {
    return `zana:learning:session:${sessionId}`;
  }

  public async getStudentMasteryProfile(studentId: string): Promise<StudentMasteryProfile> {
    const key = this.getProfileKey(studentId);
    return this.safeGet<StudentMasteryProfile>(key, {
      studentId,
      overallMasteryScore: 0.0,
      conceptMasteries: {},
      activeMisconceptions: [],
      recentRecommendedActions: []
    });
  }

  public async getConceptMastery(studentId: string, conceptId: string): Promise<ConceptMasteryState | null> {
    const profile = await this.getStudentMasteryProfile(studentId);
    return profile.conceptMasteries[conceptId] || null;
  }

  public async listConceptMasteries(studentId: string): Promise<ConceptMasteryState[]> {
    const profile = await this.getStudentMasteryProfile(studentId);
    return Object.values(profile.conceptMasteries);
  }

  public async saveMasteryChange(studentId: string, conceptId: string, masteryState: ConceptMasteryState): Promise<void> {
    const profile = await this.getStudentMasteryProfile(studentId);
    profile.conceptMasteries[conceptId] = masteryState;
    
    const masteries = Object.values(profile.conceptMasteries);
    if (masteries.length > 0) {
      const sum = masteries.reduce((acc, m) => acc + m.masteryScore, 0);
      profile.overallMasteryScore = Number((sum / masteries.length).toFixed(3));
    }

    this.safeSet(this.getProfileKey(studentId), profile);
  }

  public async appendLearningEvent(studentId: string, event: LearningEvent): Promise<void> {
    const key = this.getEventsKey(studentId);
    const list = this.safeGet<LearningEvent[]>(key, []);
    list.push(event);
    this.safeSet(key, list);

    if (event.type === "EXERCISE_ATTEMPT") {
      const attemptData = event.data as ExerciseAttempt;
      const attsKey = this.getAttemptsKey(studentId);
      const atts = this.safeGet<ExerciseAttempt[]>(attsKey, []);
      atts.unshift(attemptData);
      this.safeSet(attsKey, atts);
    }
  }

  public async createLearningSession(session: LearningSession): Promise<void> {
    const key = this.getSessionKey(session.id);
    this.safeSet(key, session);
  }

  public async updateLearningSession(session: LearningSession): Promise<void> {
    const key = this.getSessionKey(session.id);
    this.safeSet(key, session);
  }

  public async listRecentAttempts(studentId: string, limit: number = 20): Promise<ExerciseAttempt[]> {
    const key = this.getAttemptsKey(studentId);
    const atts = this.safeGet<ExerciseAttempt[]>(key, []);
    return atts.slice(0, limit);
  }

  public async listActiveMisconceptions(studentId: string): Promise<MisconceptionState[]> {
    const profile = await this.getStudentMasteryProfile(studentId);
    return profile.activeMisconceptions.filter(m => m.resolvedAt === null);
  }

  public async saveRecommendation(recommendation: AdaptiveRecommendation): Promise<void> {
    const sId = recommendation.studentId;
    const key = this.getRecommendationsKey(sId);
    const list = this.safeGet<AdaptiveRecommendation[]>(key, []);
    const index = list.findIndex(r => r.id === recommendation.id);
    if (index >= 0) {
      list[index] = recommendation;
    } else {
      list.push(recommendation);
    }
    this.safeSet(key, list);
  }

  public async listRecommendations(studentId: string, status?: string): Promise<AdaptiveRecommendation[]> {
    const key = this.getRecommendationsKey(studentId);
    const list = this.safeGet<AdaptiveRecommendation[]>(key, []);
    if (status) {
      return list.filter(r => r.status === status);
    }
    return list;
  }
}

// =========================================================================
// Server Persistent & Cloudflare-Compatible Learning Record Provider
// =========================================================================
export class PersistentLearningRecordProvider implements LearningRecordProvider {
  private memoryStore = new InMemoryLearningRecordProvider();
  private filePath = "learning_records_db.json";
  private cloudflareKv: any = null;
  private mode: "production" | "development" | "test";

  constructor(kvInstance?: any, forceMode?: "production" | "development" | "test") {
    if (kvInstance) {
      this.cloudflareKv = kvInstance;
    }

    // Determine environment mode explicitly
    if (forceMode) {
      this.mode = forceMode;
    } else {
      const envVar = typeof process !== "undefined" ? (process.env?.ZANA_ENV || process.env?.NODE_ENV) : undefined;
      const isNode = typeof process !== "undefined" && process.versions && !!process.versions.node;
      if (envVar === "production" && !isNode) {
        this.mode = "production";
      } else if (envVar === "test") {
        this.mode = "test";
      } else {
        this.mode = "development";
      }
    }

    if (this.mode === "production") {
      // Production must only use a configured persistent Cloudflare binding and fail closed if it's missing
      if (!this.cloudflareKv) {
        throw new Error(
          "CRITICAL CONFIGURATION ERROR: Persistent Cloudflare KV binding (LEARNING_RECORDS_KV) is missing in production environment. ZANA is failing closed."
        );
      }
    } else if (this.mode === "development") {
      this.loadFromLocalFile();
    }
    // Test mode remains purely in-memory
  }

  private loadFromLocalFile(): void {
    // Local JSON-file fallback must NEVER be used in production or test environments
    if (this.mode !== "development") return;

    const fs = getFs();
    if (fs) {
      try {
        if (fs.existsSync(this.filePath)) {
          const raw = fs.readFileSync(this.filePath, "utf-8");
          const data = JSON.parse(raw);
          if (data && typeof data === "object") {
            // Rehydrate memoryStore
            if (data.profiles) {
              for (const [k, v] of Object.entries(data.profiles)) {
                (this.memoryStore as any).profiles.set(k, v as any);
              }
            }
            if (data.events) {
              for (const [k, v] of Object.entries(data.events)) {
                (this.memoryStore as any).events.set(k, v as any);
              }
            }
            if (data.attempts) {
              for (const [k, v] of Object.entries(data.attempts)) {
                (this.memoryStore as any).attempts.set(k, v as any);
              }
            }
            if (data.recommendations) {
              for (const [k, v] of Object.entries(data.recommendations)) {
                (this.memoryStore as any).recommendations.set(k, v as any);
              }
            }
          }
        }
      } catch (e) {
        console.warn("Could not load local learning database file, using in-memory:", e);
      }
    }
  }

  private saveToLocalFile(): void {
    // JSON-file fallback must NEVER be used in production or test environments
    if (this.mode !== "development") return;

    const fs = getFs();
    if (fs) {
      try {
        const data = {
          profiles: Object.fromEntries(this.memoryStore["profiles"]),
          events: Object.fromEntries(this.memoryStore["events"]),
          attempts: Object.fromEntries(this.memoryStore["attempts"]),
          recommendations: Object.fromEntries(this.memoryStore["recommendations"]),
        };
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf-8");
      } catch (e) {
        console.warn("Could not save to local learning database file:", e);
      }
    }
  }

  // =========================================================================
  // Deterministic Scoped Key Generators for KV
  // =========================================================================
  private getProfileKey(studentId: string): string {
    return `student:${studentId}:profile`;
  }

  private getSessionKey(studentId: string, sessionId: string): string {
    return `student:${studentId}:session:${sessionId}`;
  }

  private getEventKey(studentId: string, eventId: string): string {
    return `student:${studentId}:event:${eventId}`;
  }

  private getAttemptKey(studentId: string, attemptId: string): string {
    return `student:${studentId}:attempt:${attemptId}`;
  }

  private getRecommendationKey(studentId: string, recommendationId: string): string {
    return `student:${studentId}:recommendation:${recommendationId}`;
  }

  // =========================================================================
  // Core Database Methods
  // =========================================================================
  public async getStudentMasteryProfile(studentId: string): Promise<StudentMasteryProfile> {
    if (this.mode === "production" && !this.cloudflareKv) {
      throw new Error("Missing production persistence binding.");
    }

    if (this.cloudflareKv) {
      const key = this.getProfileKey(studentId);
      const val = await this.cloudflareKv.get(key);
      if (val) {
        const profile = JSON.parse(val);
        // Ensure standard fields are intact
        profile.studentId = studentId;
        profile.schemaVersion = profile.schemaVersion || 1;
        profile.updatedAt = profile.updatedAt || new Date().toISOString();
        return profile;
      }
      return {
        studentId,
        overallMasteryScore: 0.0,
        conceptMasteries: {},
        activeMisconceptions: [],
        recentRecommendedActions: []
      };
    }

    // fallback for dev/test
    if (this.mode === "production") {
      throw new Error("Silent fallback to local files or memory is forbidden in production!");
    }
    return this.memoryStore.getStudentMasteryProfile(studentId);
  }

  public async getConceptMastery(studentId: string, conceptId: string): Promise<ConceptMasteryState | null> {
    const profile = await this.getStudentMasteryProfile(studentId);
    return profile.conceptMasteries[conceptId] || null;
  }

  public async listConceptMasteries(studentId: string): Promise<ConceptMasteryState[]> {
    const profile = await this.getStudentMasteryProfile(studentId);
    return Object.values(profile.conceptMasteries);
  }

  public async saveMasteryChange(studentId: string, conceptId: string, masteryState: ConceptMasteryState): Promise<void> {
    if (this.mode === "production" && !this.cloudflareKv) {
      throw new Error("Missing production persistence binding.");
    }

    if (this.cloudflareKv) {
      const key = this.getProfileKey(studentId);
      const profile = await this.getStudentMasteryProfile(studentId);
      
      profile.conceptMasteries[conceptId] = masteryState;
      const masteries = Object.values(profile.conceptMasteries);
      if (masteries.length > 0) {
        const sum = masteries.reduce((acc, m) => acc + m.masteryScore, 0);
        profile.overallMasteryScore = Number((sum / masteries.length).toFixed(3));
      }
      
      profile.updatedAt = new Date().toISOString();
      profile.schemaVersion = 1;
      
      const payload = JSON.stringify(profile);
      if (payload.length > 131072) { // 128KB limit guard
        throw new Error("Data model payload size limit exceeded.");
      }
      
      await this.cloudflareKv.put(key, payload);
      return;
    }

    if (this.mode === "production") {
      throw new Error("Silent fallback to local files or memory is forbidden in production!");
    }
    await this.memoryStore.saveMasteryChange(studentId, conceptId, masteryState);
    if (this.mode === "development") {
      this.saveToLocalFile();
    }
  }

  public async appendLearningEvent(studentId: string, event: LearningEvent): Promise<void> {
    if (this.mode === "production" && !this.cloudflareKv) {
      throw new Error("Missing production persistence binding.");
    }

    if (this.cloudflareKv) {
      // 1. Idempotency Check / Duplicate Event Detection
      const eventKey = this.getEventKey(studentId, event.id);
      const existingEvent = await this.cloudflareKv.get(eventKey);
      if (existingEvent) {
        // Idempotency: duplicate write matches existing write, exit early
        return;
      }

      // 2. Check no secrets or prompts
      const eventStr = JSON.stringify(event);
      if (eventStr.includes("GEMINI_API_KEY") || eventStr.includes("JWT_SECRET")) {
        throw new Error("Security violation: secrets detected in learning event payload");
      }

      // Write single event for durability & duplicate detection
      await this.cloudflareKv.put(eventKey, JSON.stringify({
        ...event,
        schemaVersion: 1,
        updatedAt: new Date().toISOString()
      }));

      // Append to list of events for rapid listing
      const listKey = `student:${studentId}:events`;
      const events = JSON.parse(await this.cloudflareKv.get(listKey) || "[]");
      events.push(event);
      await this.cloudflareKv.put(listKey, JSON.stringify(events));

      // Handle attempts separately
      if (event.type === "EXERCISE_ATTEMPT") {
        const attemptData = event.data as ExerciseAttempt;
        const attemptKey = this.getAttemptKey(studentId, attemptData.id);
        const existingAttempt = await this.cloudflareKv.get(attemptKey);
        if (!existingAttempt) {
          await this.cloudflareKv.put(attemptKey, JSON.stringify({
            ...attemptData,
            schemaVersion: 1,
            updatedAt: new Date().toISOString()
          }));

          const attemptsKey = `student:${studentId}:attempts`;
          const attempts = JSON.parse(await this.cloudflareKv.get(attemptsKey) || "[]");
          attempts.unshift(attemptData);
          await this.cloudflareKv.put(attemptsKey, JSON.stringify(attempts));
        }
      }
      return;
    }

    if (this.mode === "production") {
      throw new Error("Silent fallback to local files or memory is forbidden in production!");
    }
    await this.memoryStore.appendLearningEvent(studentId, event);
    if (this.mode === "development") {
      this.saveToLocalFile();
    }
  }

  public async createLearningSession(session: LearningSession): Promise<void> {
    if (this.mode === "production" && !this.cloudflareKv) {
      throw new Error("Missing production persistence binding.");
    }

    if (this.cloudflareKv) {
      const key = this.getSessionKey(session.studentId, session.id);
      await this.cloudflareKv.put(key, JSON.stringify({
        ...session,
        schemaVersion: 1,
        updatedAt: new Date().toISOString()
      }));
      return;
    }

    if (this.mode === "production") {
      throw new Error("Silent fallback to local files or memory is forbidden in production!");
    }
    await this.memoryStore.createLearningSession(session);
  }

  public async updateLearningSession(session: LearningSession): Promise<void> {
    if (this.mode === "production" && !this.cloudflareKv) {
      throw new Error("Missing production persistence binding.");
    }

    if (this.cloudflareKv) {
      const key = this.getSessionKey(session.studentId, session.id);
      await this.cloudflareKv.put(key, JSON.stringify({
        ...session,
        schemaVersion: 1,
        updatedAt: new Date().toISOString()
      }));
      return;
    }

    if (this.mode === "production") {
      throw new Error("Silent fallback to local files or memory is forbidden in production!");
    }
    await this.memoryStore.updateLearningSession(session);
  }

  public async listRecentAttempts(studentId: string, limit: number = 20): Promise<ExerciseAttempt[]> {
    if (this.mode === "production" && !this.cloudflareKv) {
      throw new Error("Missing production persistence binding.");
    }

    if (this.cloudflareKv) {
      const attemptsKey = `student:${studentId}:attempts`;
      const attempts = JSON.parse(await this.cloudflareKv.get(attemptsKey) || "[]");
      return attempts.slice(0, limit);
    }

    if (this.mode === "production") {
      throw new Error("Silent fallback to local files or memory is forbidden in production!");
    }
    return this.memoryStore.listRecentAttempts(studentId, limit);
  }

  public async listActiveMisconceptions(studentId: string): Promise<MisconceptionState[]> {
    const profile = await this.getStudentMasteryProfile(studentId);
    return profile.activeMisconceptions.filter(m => m.resolvedAt === null);
  }

  public async saveRecommendation(recommendation: AdaptiveRecommendation): Promise<void> {
    const sId = recommendation.studentId;
    if (this.mode === "production" && !this.cloudflareKv) {
      throw new Error("Missing production persistence binding.");
    }

    if (this.cloudflareKv) {
      const recKey = this.getRecommendationKey(sId, recommendation.id);
      await this.cloudflareKv.put(recKey, JSON.stringify({
        ...recommendation,
        schemaVersion: 1,
        updatedAt: new Date().toISOString()
      }));

      const listKey = `student:${sId}:recommendations`;
      const list = JSON.parse(await this.cloudflareKv.get(listKey) || "[]") as AdaptiveRecommendation[];
      const index = list.findIndex(r => r.id === recommendation.id);
      if (index >= 0) {
        list[index] = recommendation;
      } else {
        list.push(recommendation);
      }
      await this.cloudflareKv.put(listKey, JSON.stringify(list));
      return;
    }

    if (this.mode === "production") {
      throw new Error("Silent fallback to local files or memory is forbidden in production!");
    }
    await this.memoryStore.saveRecommendation(recommendation);
    if (this.mode === "development") {
      this.saveToLocalFile();
    }
  }

  public async listRecommendations(studentId: string, status?: string): Promise<AdaptiveRecommendation[]> {
    if (this.mode === "production" && !this.cloudflareKv) {
      throw new Error("Missing production persistence binding.");
    }

    if (this.cloudflareKv) {
      const listKey = `student:${studentId}:recommendations`;
      const list = JSON.parse(await this.cloudflareKv.get(listKey) || "[]") as AdaptiveRecommendation[];
      if (status) {
        return list.filter(r => r.status === status);
      }
      return list;
    }

    if (this.mode === "production") {
      throw new Error("Silent fallback to local files or memory is forbidden in production!");
    }
    return this.memoryStore.listRecommendations(studentId, status);
  }
}
