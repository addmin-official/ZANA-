import { AssessmentAttempt, AssessmentResult, AssessmentStatus } from "../domain/AssessmentTypes.ts";

export interface AssessmentRecordProvider {
  saveAttempt(attempt: AssessmentAttempt): Promise<void>;
  getAttempt(attemptId: string): Promise<AssessmentAttempt | null>;
  listAttemptsByStudent(studentId: string): Promise<AssessmentAttempt[]>;
  saveResult(result: AssessmentResult): Promise<void>;
  getResult(attemptId: string): Promise<AssessmentResult | null>;
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
// In-Memory Implementation
// =========================================================================
export class InMemoryAssessmentRecordProvider implements AssessmentRecordProvider {
  private attempts: Map<string, AssessmentAttempt> = new Map();
  private results: Map<string, AssessmentResult> = new Map();

  public async saveAttempt(attempt: AssessmentAttempt): Promise<void> {
    this.attempts.set(attempt.id, JSON.parse(JSON.stringify(attempt)));
  }

  public async getAttempt(attemptId: string): Promise<AssessmentAttempt | null> {
    const attempt = this.attempts.get(attemptId);
    return attempt ? JSON.parse(JSON.stringify(attempt)) : null;
  }

  public async listAttemptsByStudent(studentId: string): Promise<AssessmentAttempt[]> {
    return Array.from(this.attempts.values())
      .filter(a => a.studentId === studentId)
      .map(a => JSON.parse(JSON.stringify(a)));
  }

  public async saveResult(result: AssessmentResult): Promise<void> {
    this.results.set(result.attemptId, JSON.parse(JSON.stringify(result)));
  }

  public async getResult(attemptId: string): Promise<AssessmentResult | null> {
    const r = this.results.get(attemptId);
    return r ? JSON.parse(JSON.stringify(r)) : null;
  }
}

// =========================================================================
// Browser LocalStorage Implementation (Fallback)
// =========================================================================
export class LocalStorageAssessmentRecordProvider implements AssessmentRecordProvider {
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

  public async saveAttempt(attempt: AssessmentAttempt): Promise<void> {
    this.safeSet(`zana:assessment:attempt:${attempt.id}`, attempt);
    const list = this.safeGet<string[]>(`zana:assessment:student_attempts:${attempt.studentId}`, []);
    if (!list.includes(attempt.id)) {
      list.push(attempt.id);
      this.safeSet(`zana:assessment:student_attempts:${attempt.studentId}`, list);
    }
  }

  public async getAttempt(attemptId: string): Promise<AssessmentAttempt | null> {
    return this.safeGet<AssessmentAttempt | null>(`zana:assessment:attempt:${attemptId}`, null);
  }

  public async listAttemptsByStudent(studentId: string): Promise<AssessmentAttempt[]> {
    const list = this.safeGet<string[]>(`zana:assessment:student_attempts:${studentId}`, []);
    const attempts: AssessmentAttempt[] = [];
    for (const id of list) {
      const a = await this.getAttempt(id);
      if (a) attempts.push(a);
    }
    return attempts;
  }

  public async saveResult(result: AssessmentResult): Promise<void> {
    this.safeSet(`zana:assessment:result:${result.attemptId}`, result);
  }

  public async getResult(attemptId: string): Promise<AssessmentResult | null> {
    return this.safeGet<AssessmentResult | null>(`zana:assessment:result:${attemptId}`, null);
  }
}

// =========================================================================
// Server Persistent & Cloudflare-Compatible Provider
// =========================================================================
export class PersistentAssessmentRecordProvider implements AssessmentRecordProvider {
  private memoryStore = new InMemoryAssessmentRecordProvider();
  private filePath = "assessment_records_db.json";
  private cloudflareKv: any = null;
  private mode: "production" | "development" | "test";

  constructor(kvInstance?: any, forceMode?: "production" | "development" | "test") {
    if (kvInstance) {
      this.cloudflareKv = kvInstance;
    }

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
      if (!this.cloudflareKv) {
        throw new Error(
          "CRITICAL CONFIGURATION ERROR: Persistent Cloudflare KV binding is missing for assessment persistence. ZANA is failing closed."
        );
      }
    } else if (this.mode === "development") {
      this.loadFromLocalFile();
    }
  }

  private loadFromLocalFile(): void {
    if (this.mode !== "development") return;
    const fs = getFs();
    if (fs) {
      try {
        if (fs.existsSync(this.filePath)) {
          const raw = fs.readFileSync(this.filePath, "utf-8");
          const data = JSON.parse(raw);
          if (data && typeof data === "object") {
            if (data.attempts) {
              for (const [k, v] of Object.entries(data.attempts)) {
                (this.memoryStore as any).attempts.set(k, v);
              }
            }
            if (data.results) {
              for (const [k, v] of Object.entries(data.results)) {
                (this.memoryStore as any).results.set(k, v);
              }
            }
          }
        }
      } catch (e) {
        console.warn("Could not load local assessment database file, using in-memory:", e);
      }
    }
  }

  private saveToLocalFile(): void {
    if (this.mode !== "development") return;
    const fs = getFs();
    if (fs) {
      try {
        const data = {
          attempts: Object.fromEntries((this.memoryStore as any).attempts),
          results: Object.fromEntries((this.memoryStore as any).results)
        };
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf-8");
      } catch (e) {
        console.warn("Could not save to local assessment database file:", e);
      }
    }
  }

  private getAttemptKey(attemptId: string): string {
    return `assessment:attempt:${attemptId}`;
  }

  private getResultKey(attemptId: string): string {
    return `assessment:result:${attemptId}`;
  }

  private getStudentAttemptsKey(studentId: string): string {
    return `assessment:student:${studentId}:attempts`;
  }

  public async saveAttempt(attempt: AssessmentAttempt): Promise<void> {
    if (this.mode === "production" && !this.cloudflareKv) {
      throw new Error("Missing production persistence binding.");
    }

    if (this.cloudflareKv) {
      const key = this.getAttemptKey(attempt.id);
      await this.cloudflareKv.put(key, JSON.stringify(attempt));

      // Append to student's list of attempts
      const studentKey = this.getStudentAttemptsKey(attempt.studentId);
      const list = JSON.parse(await this.cloudflareKv.get(studentKey) || "[]") as string[];
      if (!list.includes(attempt.id)) {
        list.push(attempt.id);
        await this.cloudflareKv.put(studentKey, JSON.stringify(list));
      }
      return;
    }

    if (this.mode === "production") {
      throw new Error("Silent fallback to local files or memory is forbidden in production!");
    }

    await this.memoryStore.saveAttempt(attempt);
    if (this.mode === "development") {
      this.saveToLocalFile();
    }
  }

  public async getAttempt(attemptId: string): Promise<AssessmentAttempt | null> {
    if (this.mode === "production" && !this.cloudflareKv) {
      throw new Error("Missing production persistence binding.");
    }

    if (this.cloudflareKv) {
      const key = this.getAttemptKey(attemptId);
      const val = await this.cloudflareKv.get(key);
      if (val) {
        return JSON.parse(val) as AssessmentAttempt;
      }
      return null;
    }

    if (this.mode === "production") {
      throw new Error("Silent fallback is forbidden in production!");
    }

    return this.memoryStore.getAttempt(attemptId);
  }

  public async listAttemptsByStudent(studentId: string): Promise<AssessmentAttempt[]> {
    if (this.mode === "production" && !this.cloudflareKv) {
      throw new Error("Missing production persistence binding.");
    }

    if (this.cloudflareKv) {
      const studentKey = this.getStudentAttemptsKey(studentId);
      const list = JSON.parse(await this.cloudflareKv.get(studentKey) || "[]") as string[];
      const attempts: AssessmentAttempt[] = [];
      for (const id of list) {
        const a = await this.getAttempt(id);
        if (a) attempts.push(a);
      }
      return attempts;
    }

    if (this.mode === "production") {
      throw new Error("Silent fallback is forbidden in production!");
    }

    return this.memoryStore.listAttemptsByStudent(studentId);
  }

  public async saveResult(result: AssessmentResult): Promise<void> {
    if (this.mode === "production" && !this.cloudflareKv) {
      throw new Error("Missing production persistence binding.");
    }

    if (this.cloudflareKv) {
      const key = this.getResultKey(result.attemptId);
      await this.cloudflareKv.put(key, JSON.stringify(result));
      return;
    }

    if (this.mode === "production") {
      throw new Error("Silent fallback is forbidden in production!");
    }

    await this.memoryStore.saveResult(result);
    if (this.mode === "development") {
      this.saveToLocalFile();
    }
  }

  public async getResult(attemptId: string): Promise<AssessmentResult | null> {
    if (this.mode === "production" && !this.cloudflareKv) {
      throw new Error("Missing production persistence binding.");
    }

    if (this.cloudflareKv) {
      const key = this.getResultKey(attemptId);
      const val = await this.cloudflareKv.get(key);
      if (val) {
        return JSON.parse(val) as AssessmentResult;
      }
      return null;
    }

    if (this.mode === "production") {
      throw new Error("Silent fallback is forbidden in production!");
    }

    return this.memoryStore.getResult(attemptId);
  }
}
