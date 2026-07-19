import {
  StudentMasteryProfile,
  ConceptMasteryState,
  LearningEvent,
  AdaptiveRecommendation,
  MisconceptionState,
  LearningSession,
  ExerciseAttempt,
  MasteryStatus
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
// Browser LocalStorage Implementation (Client-side production persistence)
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
