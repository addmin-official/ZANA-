import { Subject } from "../domain/CurriculumTypes.ts";

export class SubjectRegistry {
  private static instance: SubjectRegistry | null = null;
  private subjects: Map<string, Subject> = new Map();

  private constructor() {
    this.register({ id: "math", code: "math", title: "Mathematics" });
    this.register({ id: "physics", code: "physics", title: "Physics" });
    this.register({ id: "chemistry", code: "chemistry", title: "Chemistry" });
    this.register({ id: "english", code: "english", title: "English" });
  }

  public static getInstance(): SubjectRegistry {
    if (!this.instance) {
      this.instance = new SubjectRegistry();
    }
    return this.instance;
  }

  public register(subject: Subject): void {
    this.subjects.set(subject.code, subject);
  }

  public getSubject(code: string): Subject | undefined {
    return this.subjects.get(code);
  }

  public getAllSubjects(): Subject[] {
    return Array.from(this.subjects.values());
  }
}
