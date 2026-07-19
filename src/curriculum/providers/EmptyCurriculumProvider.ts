import { CurriculumProvider } from "./CurriculumProvider.ts";
import { Curriculum, Grade, Subject, Unit, CurriculumLesson } from "../domain/CurriculumTypes.ts";

export class EmptyCurriculumProvider implements CurriculumProvider {
  public async getCurriculum(id: string): Promise<Curriculum | undefined> {
    return undefined;
  }

  public async listGrades(): Promise<Grade[]> {
    return [];
  }

  public async listSubjects(): Promise<Subject[]> {
    return [];
  }

  public async listUnits(curriculumId: string, grade: string, subject: string): Promise<Unit[]> {
    return [];
  }

  public async listLessons(unitId: string): Promise<CurriculumLesson[]> {
    return [];
  }

  public async getLesson(id: string): Promise<CurriculumLesson | undefined> {
    return undefined;
  }

  public async searchLessons(query: string, limit?: number): Promise<CurriculumLesson[]> {
    return [];
  }

  public async retrieveContext(
    grade: string,
    subject: string,
    lessonTitle?: string,
    conceptTitle?: string,
    query?: string
  ): Promise<CurriculumLesson[]> {
    return [];
  }
}
