import { Curriculum, CurriculumLesson, Unit } from "../domain/CurriculumTypes.ts";
import { seedDemoCurriculum } from "./demoCurriculum.ts";

export class CurriculumRegistry {
  private static instance: CurriculumRegistry | null = null;
  
  private curricula: Map<string, Curriculum> = new Map();
  private units: Map<string, Unit> = new Map();
  private lessons: Map<string, CurriculumLesson> = new Map();

  private constructor() {
    CurriculumRegistry.instance = this;
    // Register ZANA default open curriculum
    this.registerCurriculum({
      id: "curriculum-zana-default",
      name: "ZANA Default Open Curriculum",
      description: "ZANA proprietary open-license school curriculum.",
      region: "Kurdistan",
      version: "1.0.0"
    });
    seedDemoCurriculum();
  }

  public static getInstance(): CurriculumRegistry {
    if (!this.instance) {
      new CurriculumRegistry();
    }
    return this.instance!;
  }

  public registerCurriculum(curriculum: Curriculum): void {
    this.curricula.set(curriculum.id, curriculum);
  }

  public getCurriculum(id: string): Curriculum | undefined {
    return this.curricula.get(id);
  }

  public registerUnit(unit: Unit): void {
    this.units.set(unit.id, unit);
  }

  public getUnit(id: string): Unit | undefined {
    return this.units.get(id);
  }

  public getAllUnits(): Unit[] {
    return Array.from(this.units.values());
  }

  public registerLesson(lesson: CurriculumLesson): void {
    this.lessons.set(lesson.id, lesson);
  }

  public getLesson(id: string): CurriculumLesson | undefined {
    return this.lessons.get(id);
  }

  public getAllLessons(): CurriculumLesson[] {
    return Array.from(this.lessons.values());
  }

  public getLessonsByContext(grade: string, subject: string, stream?: string): CurriculumLesson[] {
    return this.getAllLessons().filter(lesson => {
      if (lesson.grade !== grade) return false;
      if (lesson.subject !== subject) return false;
      if (stream && lesson.stream && lesson.stream !== stream) return false;
      return true;
    });
  }

  public clear(): void {
    this.units.clear();
    this.lessons.clear();
  }
}
