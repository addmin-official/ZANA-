import { StudentIdentity } from "./types.ts";
import { StudentProfile } from "../features/student/studentTypes.ts";

export class StudentIdentityEngine {
  private identity: StudentIdentity;

  constructor(profile: StudentProfile) {
    this.identity = {
      studentId: profile.id || "default-guest",
      createdAt: profile.createdAt || new Date().toISOString(),
      grade: profile.grade,
      stream: profile.stream,
      name: profile.name || "خوێندکار",
      activeSubject: profile.activeSubject,
      learningLevel: profile.level
    };
  }

  public getSnapshot(): StudentIdentity {
    return { ...this.identity };
  }

  public updateProfile(profile: StudentProfile): void {
    this.identity = {
      studentId: profile.id,
      createdAt: profile.createdAt || this.identity.createdAt,
      grade: profile.grade,
      stream: profile.stream,
      name: profile.name,
      activeSubject: profile.activeSubject,
      learningLevel: profile.level
    };
  }
}
