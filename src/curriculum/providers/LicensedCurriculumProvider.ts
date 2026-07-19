import { CurriculumProvider } from "./CurriculumProvider.ts";
import { Curriculum, Grade, Subject, Unit, CurriculumLesson } from "../domain/CurriculumTypes.ts";
import { CurriculumRegistry } from "../registry/CurriculumRegistry.ts";
import { GradeRegistry } from "../registry/GradeRegistry.ts";
import { SubjectRegistry } from "../registry/SubjectRegistry.ts";

export class LicensedCurriculumProvider implements CurriculumProvider {
  private registry: CurriculumRegistry;
  private gradeRegistry: GradeRegistry;
  private subjectRegistry: SubjectRegistry;

  constructor() {
    this.registry = CurriculumRegistry.getInstance();
    this.gradeRegistry = GradeRegistry.getInstance();
    this.subjectRegistry = SubjectRegistry.getInstance();
  }

  public async getCurriculum(id: string): Promise<Curriculum | undefined> {
    return this.registry.getCurriculum(id);
  }

  public async listGrades(): Promise<Grade[]> {
    return this.gradeRegistry.getAllGrades();
  }

  public async listSubjects(): Promise<Subject[]> {
    return this.subjectRegistry.getAllSubjects();
  }

  public async listUnits(curriculumId: string, grade: string, subject: string): Promise<Unit[]> {
    return this.registry.getAllUnits().filter(
      (u) => u.curriculumId === curriculumId && u.grade === grade && u.subject === subject
    );
  }

  public async listLessons(unitId: string): Promise<CurriculumLesson[]> {
    return this.registry.getAllLessons().filter((l) => l.unitId === unitId);
  }

  public async getLesson(id: string): Promise<CurriculumLesson | undefined> {
    return this.registry.getLesson(id);
  }

  public async searchLessons(query: string, limit: number = 10): Promise<CurriculumLesson[]> {
    if (!query) return [];
    const q = query.toLowerCase();
    const results = this.registry.getAllLessons().filter((lesson) => {
      return (
        lesson.title.toLowerCase().includes(q) ||
        lesson.concepts.some((c) => c.toLowerCase().includes(q)) ||
        lesson.learningObjectives.some((o) => o.toLowerCase().includes(q)) ||
        lesson.skills.some((s) => s.toLowerCase().includes(q))
      );
    });
    return results.slice(0, limit);
  }

  public async retrieveContext(
    grade: string,
    subject: string,
    lessonTitle?: string,
    conceptTitle?: string,
    query?: string
  ): Promise<CurriculumLesson[]> {
    const lessons = this.registry.getLessonsByContext(grade, subject);
    
    // Score lessons for match relevance
    const scored = lessons.map((lesson) => {
      let score = 0;
      
      if (lessonTitle) {
        const lt = lessonTitle.toLowerCase();
        if (lesson.title.toLowerCase() === lt) {
          score += 50;
        } else if (lesson.title.toLowerCase().includes(lt) || lt.includes(lesson.title.toLowerCase())) {
          score += 30;
        }
      }
      
      if (conceptTitle) {
        const ct = conceptTitle.toLowerCase();
        if (lesson.concepts.some((c) => c.toLowerCase() === ct)) {
          score += 40;
        } else if (lesson.concepts.some((c) => c.toLowerCase().includes(ct) || ct.includes(c.toLowerCase()))) {
          score += 20;
        }
      }
      
      if (query) {
        const q = query.toLowerCase();
        if (lesson.title.toLowerCase().includes(q)) {
          score += 25;
        }
        const conceptMatches = lesson.concepts.filter((c) => c.toLowerCase().includes(q)).length;
        score += conceptMatches * 15;
        const objectiveMatches = lesson.learningObjectives.filter((o) => o.toLowerCase().includes(q)).length;
        score += objectiveMatches * 10;
        const skillMatches = lesson.skills.filter((s) => s.toLowerCase().includes(q)).length;
        score += skillMatches * 5;
      }
      
      return { lesson, score };
    });

    // Sort by score descending and filter out zero-score matches if filtering parameters were provided
    const filtered = (lessonTitle || conceptTitle || query)
      ? scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score)
      : scored.map(s => ({ lesson: s.lesson, score: 1 })); // return all if no query/filters

    return filtered.map((f) => f.lesson);
  }
}
