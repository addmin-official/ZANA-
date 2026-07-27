import { CurriculumProvider } from "./CurriculumProvider.ts";
import { Curriculum, Grade, Subject, Unit, CurriculumLesson } from "../domain/CurriculumTypes.ts";

export class EmptyCurriculumProvider implements CurriculumProvider {
  public async getCurriculum(_id: string): Promise<Curriculum | undefined> {
    return undefined;
  }

  public async listGrades(): Promise<Grade[]> {
    return [];
  }

  public async listSubjects(): Promise<Subject[]> {
    return [];
  }

  public async listUnits(_curriculumId: string, _grade: string, _subject: string): Promise<Unit[]> {
    return [];
  }

  public async listLessons(_unitId: string): Promise<CurriculumLesson[]> {
    return [];
  }

  public async getLesson(_id: string): Promise<CurriculumLesson | undefined> {
    return undefined;
  }

  public async searchLessons(_query: string, _limit?: number): Promise<CurriculumLesson[]> {
    return [];
  }

  public async retrieveContext(
    _grade: string,
    _subject: string,
    _lessonTitle?: string,
    _conceptTitle?: string,
    _query?: string
  ): Promise<CurriculumLesson[]> {
    return [];
  }
}
