import { Curriculum, Grade, Subject, Unit, CurriculumLesson } from "../domain/CurriculumTypes.ts";

export interface CurriculumProvider {
  getCurriculum(id: string): Promise<Curriculum | undefined>;
  listGrades(): Promise<Grade[]>;
  listSubjects(): Promise<Subject[]>;
  listUnits(curriculumId: string, grade: string, subject: string): Promise<Unit[]>;
  listLessons(unitId: string): Promise<CurriculumLesson[]>;
  getLesson(id: string): Promise<CurriculumLesson | undefined>;
  searchLessons(query: string, limit?: number): Promise<CurriculumLesson[]>;
  retrieveContext(
    grade: string,
    subject: string,
    lessonTitle?: string,
    conceptTitle?: string,
    query?: string
  ): Promise<CurriculumLesson[]>;
}
