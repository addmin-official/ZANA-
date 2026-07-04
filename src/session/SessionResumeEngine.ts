import { StudentSession } from "./types.ts";

export class SessionResumeEngine {
  private memoryStore: Record<string, string> = {};

  private isLocalStorageAvailable(): boolean {
    try {
      return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
    } catch {
      return false;
    }
  }

  public saveResumeState(session: StudentSession): void {
    const key = `zana_resume_${session.studentId}`;
    const dataStr = JSON.stringify(session);
    
    if (this.isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(key, dataStr);
      } catch {
        // Fallback to memory store if localStorage fails
        this.memoryStore[key] = dataStr;
      }
    } else {
      this.memoryStore[key] = dataStr;
    }
  }

  public getResumeState(studentId: string): StudentSession | null {
    const key = `zana_resume_${studentId}`;
    let dataStr: string | null = null;

    if (this.isLocalStorageAvailable()) {
      try {
        dataStr = window.localStorage.getItem(key);
      } catch {
        dataStr = this.memoryStore[key] || null;
      }
    } else {
      dataStr = this.memoryStore[key] || null;
    }

    if (!dataStr) return null;

    try {
      return JSON.parse(dataStr) as StudentSession;
    } catch {
      return null;
    }
  }

  public clearResumeState(studentId: string): void {
    const key = `zana_resume_${studentId}`;
    
    if (this.isLocalStorageAvailable()) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        delete this.memoryStore[key];
      }
    } else {
      delete this.memoryStore[key];
    }
  }
}
