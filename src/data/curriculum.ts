import { SUBJECTS_DATA, CurriculumSubject, Chapter, Lesson } from "./subjects.ts";

export { SUBJECTS_DATA };
export type { CurriculumSubject, Chapter, Lesson };

export function getSubjectById(id: string): CurriculumSubject | undefined {
  return SUBJECTS_DATA.find((sub) => sub.id === id);
}

export function getChaptersForGrade(subjectId: string, grade: string): Chapter[] {
  const subject = getSubjectById(subjectId);
  if (!subject) return [];
  return subject.grades[grade] || [];
}
