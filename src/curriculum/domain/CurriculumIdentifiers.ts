export const CURRICULUM_ZANA_ID = "curriculum-zana-default";
export const LICENSE_ZANA_OPEN_ID = "license-zana-open-01";

export function generateLessonId(grade: string, subject: string, unitId: string, lessonTitle: string): string {
  const sanitizedTitle = lessonTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `grade-${grade}-${subject}-${unitId}-${sanitizedTitle}`;
}

export function generateConceptId(lessonId: string, conceptTitle: string): string {
  const sanitizedTitle = conceptTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${lessonId}-concept-${sanitizedTitle}`;
}

export function isValidGradeCode(code: string): boolean {
  return ["9", "10", "11", "12"].includes(code);
}

export function isValidSubjectCode(code: string): boolean {
  return ["math", "physics", "chemistry", "english"].includes(code);
}

export function isValidStreamCode(code: string): boolean {
  return ["scientific", "literary", "general"].includes(code);
}
