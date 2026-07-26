import {
  StudentMasteryProfile,
  ConceptMasteryState,
  LearningEvent,
  LearningEventType,
  AdaptiveRecommendation,
  MisconceptionState,
  LearningSession,
  ExerciseAttempt,
  DifficultyLevel,
  MasteryStatus,
  MisconceptionStatus,
  RecommendationPriority,
  RecommendationStatus,
  RecommendationType,
} from "../domain/MasteryTypes.ts";
import {
  CloudflareKvNamespace,
  isCloudflareKvNamespace,
  requireCloudflareKvNamespace,
} from "../../platform/CloudflareKv.ts";

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

type RuntimeMode = "production" | "development" | "test";
type Guard<T> = (value: unknown) => value is T;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isDifficultyLevel(value: unknown): value is DifficultyLevel {
  return Object.values(DifficultyLevel).includes(value as DifficultyLevel);
}

function isMasteryStatus(value: unknown): value is MasteryStatus {
  return Object.values(MasteryStatus).includes(value as MasteryStatus);
}

function isMisconceptionStatus(value: unknown): value is MisconceptionStatus {
  return Object.values(MisconceptionStatus).includes(value as MisconceptionStatus);
}

function isLearningEventType(value: unknown): value is LearningEventType {
  return [
    "EXERCISE_ATTEMPT",
    "LESSON_VIEW",
    "SESSION_START",
    "SESSION_END",
    "RECOMMENDATION_DECISION",
  ].includes(String(value));
}

function isRecommendationType(value: unknown): value is RecommendationType {
  return [
    "PREREQUISITE_REVIEW",
    "PRACTICE_DRILL",
    "ADVANCE_CONCEPT",
    "REMEDIAL_EXPLANATION",
  ].includes(String(value));
}

function isRecommendationPriority(value: unknown): value is RecommendationPriority {
  return value === "high" || value === "medium" || value === "low";
}

function isRecommendationStatus(value: unknown): value is RecommendationStatus {
  return value === "ACTIVE" || value === "ACCEPTED" || value === "COMPLETED" || value === "DISMISSED";
}

function isConceptHistoryEntry(value: unknown): boolean {
  return (
    isRecord(value) &&
    isBoolean(value.isCorrect) &&
    isString(value.timestamp) &&
    isFiniteNumber(value.responseTimeMs) &&
    isDifficultyLevel(value.difficulty)
  );
}

export function isConceptMasteryState(value: unknown): value is ConceptMasteryState {
  return (
    isRecord(value) &&
    isString(value.conceptId) &&
    isFiniteNumber(value.masteryScore) &&
    isMasteryStatus(value.status) &&
    isFiniteNumber(value.consecutiveCorrect) &&
    isFiniteNumber(value.totalAttempts) &&
    isNullableString(value.lastAttemptedAt) &&
    Array.isArray(value.history) &&
    value.history.every(isConceptHistoryEntry) &&
    (value.lastChangeExplanation === undefined || isString(value.lastChangeExplanation))
  );
}

export function isMisconceptionState(value: unknown): value is MisconceptionState {
  return (
    isRecord(value) &&
    isString(value.conceptId) &&
    isString(value.misconceptionId) &&
    isString(value.nameKu) &&
    isFiniteNumber(value.count) &&
    isMisconceptionStatus(value.status) &&
    (value.confidence === "low" || value.confidence === "medium" || value.confidence === "high") &&
    Array.isArray(value.evidenceAttempts) &&
    value.evidenceAttempts.every(isString) &&
    isString(value.firstDetectedAt) &&
    isString(value.lastDetectedAt) &&
    isNullableString(value.resolvedAt) &&
    isString(value.interventionKu)
  );
}

export function isStudentMasteryProfile(value: unknown): value is StudentMasteryProfile {
  if (!isRecord(value) || !isRecord(value.conceptMasteries)) return false;
  return (
    isString(value.studentId) &&
    isFiniteNumber(value.overallMasteryScore) &&
    Object.values(value.conceptMasteries).every(isConceptMasteryState) &&
    Array.isArray(value.activeMisconceptions) &&
    value.activeMisconceptions.every(isMisconceptionState) &&
    Array.isArray(value.recentRecommendedActions) &&
    value.recentRecommendedActions.every(isString) &&
    (value.updatedAt === undefined || isString(value.updatedAt)) &&
    (value.schemaVersion === undefined || isFiniteNumber(value.schemaVersion))
  );
}

export function isExerciseAttempt(value: unknown): value is ExerciseAttempt {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.studentId) &&
    isString(value.conceptId) &&
    isBoolean(value.isCorrect) &&
    isFiniteNumber(value.responseTimeMs) &&
    isDifficultyLevel(value.difficulty) &&
    isString(value.questionText) &&
    isString(value.studentResponse) &&
    (value.misconceptionDetected === undefined || isString(value.misconceptionDetected)) &&
    isString(value.timestamp)
  );
}

export function isLearningEvent(value: unknown): value is LearningEvent {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.studentId) &&
    isString(value.timestamp) &&
    isLearningEventType(value.type) &&
    isRecord(value.data)
  );
}

export function isLearningSession(value: unknown): value is LearningSession {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.studentId) &&
    isString(value.startTime) &&
    isNullableString(value.endTime) &&
    Array.isArray(value.events) &&
    value.events.every(isLearningEvent) &&
    isFiniteNumber(value.focusScore)
  );
}

export function isAdaptiveRecommendation(value: unknown): value is AdaptiveRecommendation {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.studentId) &&
    isString(value.conceptId) &&
    isRecommendationType(value.type) &&
    isString(value.titleKu) &&
    isString(value.explanationKu) &&
    isRecommendationPriority(value.priority) &&
    isRecommendationStatus(value.status) &&
    isString(value.generatedAt) &&
    isString(value.reasoningKu)
  );
}

function parseJson<T>(raw: string, guard: Guard<T>, label: string): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid persisted JSON for ${label}`);
  }
  if (!guard(parsed)) {
    throw new Error(`Invalid persisted data contract for ${label}`);
  }
  return parsed;
}

function parseJsonArray<T>(raw: string, guard: Guard<T>, label: string): T[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid persisted JSON for ${label}`);
  }
  if (!Array.isArray(parsed) || !parsed.every(guard)) {
    throw new Error(`Invalid persisted array contract for ${label}`);
  }
  return parsed;
}

function createEmptyProfile(studentId: string): StudentMasteryProfile {
  return {
    studentId,
    overallMasteryScore: 0,
    conceptMasteries: {},
    activeMisconceptions: [],
    recentRecommendedActions: [],
  };
}

function assertScopedStudentId(expectedStudentId: string, actualStudentId: string, label: string): void {
  if (expectedStudentId !== actualStudentId) {
    throw new Error(`Student scope mismatch in ${label}`);
  }
}

// =========================================================================
// Explicit in-memory implementation for tests and local development only.
// =========================================================================
export class InMemoryLearningRecordProvider implements LearningRecordProvider {
  public profiles = new Map<string, StudentMasteryProfile>();
  public events = new Map<string, LearningEvent[]>();
  public sessions = new Map<string, LearningSession>();
  public attempts = new Map<string, ExerciseAttempt[]>();
  public recommendations = new Map<string, AdaptiveRecommendation[]>();

  public async getStudentMasteryProfile(studentId: string): Promise<StudentMasteryProfile> {
    let profile = this.profiles.get(studentId);
    if (!profile) {
      profile = createEmptyProfile(studentId);
      this.profiles.set(studentId, profile);
    }
    return { ...profile, conceptMasteries: { ...profile.conceptMasteries } };
  }

  public async getConceptMastery(studentId: string, conceptId: string): Promise<ConceptMasteryState | null> {
    const profile = await this.getStudentMasteryProfile(studentId);
    return profile.conceptMasteries[conceptId] ?? null;
  }

  public async listConceptMasteries(studentId: string): Promise<ConceptMasteryState[]> {
    const profile = await this.getStudentMasteryProfile(studentId);
    return Object.values(profile.conceptMasteries);
  }

  public async saveMasteryChange(studentId: string, conceptId: string, masteryState: ConceptMasteryState): Promise<void> {
    if (masteryState.conceptId !== conceptId) {
      throw new Error("Concept scope mismatch in mastery update");
    }
    const profile = await this.getStudentMasteryProfile(studentId);
    profile.conceptMasteries[conceptId] = masteryState;
    const masteries = Object.values(profile.conceptMasteries);
    profile.overallMasteryScore = masteries.length
      ? Number((masteries.reduce((sum, state) => sum + state.masteryScore, 0) / masteries.length).toFixed(3))
      : 0;
    this.profiles.set(studentId, profile);
  }

  public async appendLearningEvent(studentId: string, event: LearningEvent): Promise<void> {
    assertScopedStudentId(studentId, event.studentId, "learning event");
    const list = this.events.get(studentId) ?? [];
    if (!list.some((existing) => existing.id === event.id)) list.push(event);
    this.events.set(studentId, list);

    if (event.type === "EXERCISE_ATTEMPT") {
      if (!isExerciseAttempt(event.data)) {
        throw new Error("Invalid exercise attempt event payload");
      }
      assertScopedStudentId(studentId, event.data.studentId, "exercise attempt");
      const attempts = this.attempts.get(studentId) ?? [];
      if (!attempts.some((existing) => existing.id === event.data.id)) attempts.unshift(event.data);
      this.attempts.set(studentId, attempts);
    }
  }

  public async createLearningSession(session: LearningSession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  public async updateLearningSession(session: LearningSession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  public async listRecentAttempts(studentId: string, limit = 20): Promise<ExerciseAttempt[]> {
    return (this.attempts.get(studentId) ?? []).slice(0, Math.max(0, limit));
  }

  public async listActiveMisconceptions(studentId: string): Promise<MisconceptionState[]> {
    const profile = await this.getStudentMasteryProfile(studentId);
    return profile.activeMisconceptions.filter((item) => item.resolvedAt === null);
  }

  public async saveRecommendation(recommendation: AdaptiveRecommendation): Promise<void> {
    const list = this.recommendations.get(recommendation.studentId) ?? [];
    const index = list.findIndex((item) => item.id === recommendation.id);
    if (index >= 0) list[index] = recommendation;
    else list.push(recommendation);
    this.recommendations.set(recommendation.studentId, list);
  }

  public async listRecommendations(studentId: string, status?: string): Promise<AdaptiveRecommendation[]> {
    const list = this.recommendations.get(studentId) ?? [];
    return status ? list.filter((item) => item.status === status) : [...list];
  }
}

// =========================================================================
// Browser localStorage implementation for non-authoritative offline learning.
// =========================================================================
export class LocalStorageLearningRecordProvider implements LearningRecordProvider {
  private readonly isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

  private read<T>(key: string, fallback: T, guard: Guard<T>): T {
    if (!this.isBrowser) return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      const parsed: unknown = JSON.parse(raw);
      return guard(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  private readArray<T>(key: string, guard: Guard<T>): T[] {
    if (!this.isBrowser) return [];
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.every(guard) ? parsed : [];
    } catch {
      return [];
    }
  }

  private write(key: string, value: unknown): void {
    if (!this.isBrowser) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  private profileKey(studentId: string): string {
    return `zana:learning:profile:${studentId}`;
  }

  private eventsKey(studentId: string): string {
    return `zana:learning:events:${studentId}`;
  }

  private attemptsKey(studentId: string): string {
    return `zana:learning:attempts:${studentId}`;
  }

  private recommendationsKey(studentId: string): string {
    return `zana:learning:recommendations:${studentId}`;
  }

  private sessionKey(studentId: string, sessionId: string): string {
    return `zana:learning:session:${studentId}:${sessionId}`;
  }

  public async getStudentMasteryProfile(studentId: string): Promise<StudentMasteryProfile> {
    const profile = this.read(this.profileKey(studentId), createEmptyProfile(studentId), isStudentMasteryProfile);
    return profile.studentId === studentId ? profile : createEmptyProfile(studentId);
  }

  public async getConceptMastery(studentId: string, conceptId: string): Promise<ConceptMasteryState | null> {
    return (await this.getStudentMasteryProfile(studentId)).conceptMasteries[conceptId] ?? null;
  }

  public async listConceptMasteries(studentId: string): Promise<ConceptMasteryState[]> {
    return Object.values((await this.getStudentMasteryProfile(studentId)).conceptMasteries);
  }

  public async saveMasteryChange(studentId: string, conceptId: string, masteryState: ConceptMasteryState): Promise<void> {
    const profile = await this.getStudentMasteryProfile(studentId);
    profile.conceptMasteries[conceptId] = masteryState;
    const masteries = Object.values(profile.conceptMasteries);
    profile.overallMasteryScore = masteries.length
      ? Number((masteries.reduce((sum, state) => sum + state.masteryScore, 0) / masteries.length).toFixed(3))
      : 0;
    this.write(this.profileKey(studentId), profile);
  }

  public async appendLearningEvent(studentId: string, event: LearningEvent): Promise<void> {
    assertScopedStudentId(studentId, event.studentId, "local learning event");
    const events = this.readArray(this.eventsKey(studentId), isLearningEvent);
    if (!events.some((existing) => existing.id === event.id)) events.push(event);
    this.write(this.eventsKey(studentId), events);

    if (event.type === "EXERCISE_ATTEMPT") {
      if (!isExerciseAttempt(event.data)) throw new Error("Invalid local exercise attempt payload");
      const attempts = this.readArray(this.attemptsKey(studentId), isExerciseAttempt);
      if (!attempts.some((existing) => existing.id === event.data.id)) attempts.unshift(event.data);
      this.write(this.attemptsKey(studentId), attempts);
    }
  }

  public async createLearningSession(session: LearningSession): Promise<void> {
    this.write(this.sessionKey(session.studentId, session.id), session);
  }

  public async updateLearningSession(session: LearningSession): Promise<void> {
    this.write(this.sessionKey(session.studentId, session.id), session);
  }

  public async listRecentAttempts(studentId: string, limit = 20): Promise<ExerciseAttempt[]> {
    return this.readArray(this.attemptsKey(studentId), isExerciseAttempt).slice(0, Math.max(0, limit));
  }

  public async listActiveMisconceptions(studentId: string): Promise<MisconceptionState[]> {
    return (await this.getStudentMasteryProfile(studentId)).activeMisconceptions.filter((item) => item.resolvedAt === null);
  }

  public async saveRecommendation(recommendation: AdaptiveRecommendation): Promise<void> {
    const list = this.readArray(this.recommendationsKey(recommendation.studentId), isAdaptiveRecommendation);
    const index = list.findIndex((item) => item.id === recommendation.id);
    if (index >= 0) list[index] = recommendation;
    else list.push(recommendation);
    this.write(this.recommendationsKey(recommendation.studentId), list);
  }

  public async listRecommendations(studentId: string, status?: string): Promise<AdaptiveRecommendation[]> {
    const list = this.readArray(this.recommendationsKey(studentId), isAdaptiveRecommendation);
    return status ? list.filter((item) => item.status === status) : list;
  }
}

// =========================================================================
// Persistent Cloudflare KV implementation. Production always fails closed.
// =========================================================================
export class PersistentLearningRecordProvider implements LearningRecordProvider {
  private readonly memoryStore = new InMemoryLearningRecordProvider();
  private readonly kv: CloudflareKvNamespace | null;
  private readonly mode: RuntimeMode;

  constructor(kvInstance?: unknown, forceMode?: RuntimeMode) {
    this.mode = forceMode ?? this.detectMode();
    this.kv = isCloudflareKvNamespace(kvInstance) ? kvInstance : null;
    if (this.mode === "production") {
      requireCloudflareKvNamespace(kvInstance, "LEARNING_RECORDS_KV");
    }
  }

  private detectMode(): RuntimeMode {
    const environment = typeof process !== "undefined" ? process.env?.ZANA_ENV ?? process.env?.NODE_ENV : undefined;
    if (environment === "production") return "production";
    if (environment === "test") return "test";
    return "development";
  }

  private requireKv(): CloudflareKvNamespace {
    if (this.kv) return this.kv;
    throw new Error("Persistent Cloudflare KV binding is required in production");
  }

  private async putJson(key: string, value: unknown): Promise<void> {
    const payload = JSON.stringify(value);
    if (payload.length > 131_072) throw new Error("Data model payload size limit exceeded");
    await this.requireKv().put(key, payload);
  }

  private profileKey(studentId: string): string {
    return `student:${studentId}:profile`;
  }

  private sessionKey(studentId: string, sessionId: string): string {
    return `student:${studentId}:session:${sessionId}`;
  }

  private eventKey(studentId: string, eventId: string): string {
    return `student:${studentId}:event:${eventId}`;
  }

  private attemptKey(studentId: string, attemptId: string): string {
    return `student:${studentId}:attempt:${attemptId}`;
  }

  private recommendationKey(studentId: string, recommendationId: string): string {
    return `student:${studentId}:recommendation:${recommendationId}`;
  }

  public async getStudentMasteryProfile(studentId: string): Promise<StudentMasteryProfile> {
    if (!this.kv) return this.memoryStore.getStudentMasteryProfile(studentId);
    const raw = await this.kv.get(this.profileKey(studentId));
    if (raw === null) return createEmptyProfile(studentId);
    const profile = parseJson(raw, isStudentMasteryProfile, "student mastery profile");
    assertScopedStudentId(studentId, profile.studentId, "student mastery profile");
    return profile;
  }

  public async getConceptMastery(studentId: string, conceptId: string): Promise<ConceptMasteryState | null> {
    return (await this.getStudentMasteryProfile(studentId)).conceptMasteries[conceptId] ?? null;
  }

  public async listConceptMasteries(studentId: string): Promise<ConceptMasteryState[]> {
    return Object.values((await this.getStudentMasteryProfile(studentId)).conceptMasteries);
  }

  public async saveMasteryChange(studentId: string, conceptId: string, masteryState: ConceptMasteryState): Promise<void> {
    if (!this.kv) return this.memoryStore.saveMasteryChange(studentId, conceptId, masteryState);
    if (masteryState.conceptId !== conceptId) throw new Error("Concept scope mismatch in mastery update");
    const profile = await this.getStudentMasteryProfile(studentId);
    profile.conceptMasteries[conceptId] = masteryState;
    const masteries = Object.values(profile.conceptMasteries);
    profile.overallMasteryScore = masteries.length
      ? Number((masteries.reduce((sum, state) => sum + state.masteryScore, 0) / masteries.length).toFixed(3))
      : 0;
    profile.updatedAt = new Date().toISOString();
    profile.schemaVersion = 1;
    await this.putJson(this.profileKey(studentId), profile);
  }

  public async appendLearningEvent(studentId: string, event: LearningEvent): Promise<void> {
    if (!this.kv) return this.memoryStore.appendLearningEvent(studentId, event);
    assertScopedStudentId(studentId, event.studentId, "learning event");
    const serialized = JSON.stringify(event);
    if (serialized.includes("GEMINI_API_KEY") || serialized.includes("JWT_SECRET")) {
      throw new Error("Security violation: secret marker detected in learning event");
    }

    const eventKey = this.eventKey(studentId, event.id);
    if ((await this.kv.get(eventKey)) !== null) return;
    await this.putJson(eventKey, { ...event, schemaVersion: 1, updatedAt: new Date().toISOString() });

    const listKey = `student:${studentId}:events`;
    const eventsRaw = await this.kv.get(listKey);
    const events = eventsRaw === null ? [] : parseJsonArray(eventsRaw, isLearningEvent, "learning events");
    events.push(event);
    await this.putJson(listKey, events);

    if (event.type === "EXERCISE_ATTEMPT") {
      if (!isExerciseAttempt(event.data)) throw new Error("Invalid exercise attempt event payload");
      assertScopedStudentId(studentId, event.data.studentId, "exercise attempt");
      const attemptKey = this.attemptKey(studentId, event.data.id);
      if ((await this.kv.get(attemptKey)) === null) {
        await this.putJson(attemptKey, { ...event.data, schemaVersion: 1, updatedAt: new Date().toISOString() });
        const attemptsKey = `student:${studentId}:attempts`;
        const attemptsRaw = await this.kv.get(attemptsKey);
        const attempts = attemptsRaw === null ? [] : parseJsonArray(attemptsRaw, isExerciseAttempt, "exercise attempts");
        attempts.unshift(event.data);
        await this.putJson(attemptsKey, attempts);
      }
    }
  }

  public async createLearningSession(session: LearningSession): Promise<void> {
    if (!this.kv) return this.memoryStore.createLearningSession(session);
    await this.putJson(this.sessionKey(session.studentId, session.id), {
      ...session,
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
    });
  }

  public async updateLearningSession(session: LearningSession): Promise<void> {
    if (!this.kv) return this.memoryStore.updateLearningSession(session);
    await this.putJson(this.sessionKey(session.studentId, session.id), {
      ...session,
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
    });
  }

  public async listRecentAttempts(studentId: string, limit = 20): Promise<ExerciseAttempt[]> {
    if (!this.kv) return this.memoryStore.listRecentAttempts(studentId, limit);
    const raw = await this.kv.get(`student:${studentId}:attempts`);
    if (raw === null) return [];
    return parseJsonArray(raw, isExerciseAttempt, "exercise attempts").slice(0, Math.max(0, limit));
  }

  public async listActiveMisconceptions(studentId: string): Promise<MisconceptionState[]> {
    return (await this.getStudentMasteryProfile(studentId)).activeMisconceptions.filter((item) => item.resolvedAt === null);
  }

  public async saveRecommendation(recommendation: AdaptiveRecommendation): Promise<void> {
    if (!this.kv) return this.memoryStore.saveRecommendation(recommendation);
    await this.putJson(this.recommendationKey(recommendation.studentId, recommendation.id), {
      ...recommendation,
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
    });
    const listKey = `student:${recommendation.studentId}:recommendations`;
    const raw = await this.kv.get(listKey);
    const list = raw === null ? [] : parseJsonArray(raw, isAdaptiveRecommendation, "recommendations");
    const index = list.findIndex((item) => item.id === recommendation.id);
    if (index >= 0) list[index] = recommendation;
    else list.push(recommendation);
    await this.putJson(listKey, list);
  }

  public async listRecommendations(studentId: string, status?: string): Promise<AdaptiveRecommendation[]> {
    if (!this.kv) return this.memoryStore.listRecommendations(studentId, status);
    const raw = await this.kv.get(`student:${studentId}:recommendations`);
    if (raw === null) return [];
    const list = parseJsonArray(raw, isAdaptiveRecommendation, "recommendations");
    return status ? list.filter((item) => item.status === status) : list;
  }
}
