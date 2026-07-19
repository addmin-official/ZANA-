import { Grade } from "../domain/CurriculumTypes.ts";

export class GradeRegistry {
  private static instance: GradeRegistry | null = null;
  private grades: Map<string, Grade> = new Map();

  private constructor() {
    this.register({ id: "9", code: "9", title: "Grade 9" });
    this.register({ id: "10", code: "10", title: "Grade 10" });
    this.register({ id: "11", code: "11", title: "Grade 11" });
    this.register({ id: "12", code: "12", title: "Grade 12" });
  }

  public static getInstance(): GradeRegistry {
    if (!this.instance) {
      this.instance = new GradeRegistry();
    }
    return this.instance;
  }

  public register(grade: Grade): void {
    this.grades.set(grade.code, grade);
  }

  public getGrade(code: string): Grade | undefined {
    return this.grades.get(code);
  }

  public getAllGrades(): Grade[] {
    return Array.from(this.grades.values());
  }
}
