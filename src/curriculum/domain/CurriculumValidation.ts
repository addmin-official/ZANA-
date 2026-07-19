import { CurriculumLesson, Unit } from "./CurriculumTypes.ts";
import { isValidGradeCode, isValidSubjectCode, isValidStreamCode } from "./CurriculumIdentifiers.ts";

export function validateCurriculumLesson(lesson: CurriculumLesson): string[] {
  const errors: string[] = [];

  if (!lesson.id || typeof lesson.id !== "string") {
    errors.push("Lesson id must be a non-empty string.");
  }
  if (!lesson.curriculumId || typeof lesson.curriculumId !== "string") {
    errors.push("Lesson curriculumId must be a non-empty string.");
  }
  if (!lesson.grade || !isValidGradeCode(lesson.grade)) {
    errors.push(`Invalid or missing grade code: ${lesson.grade}. Must be one of 9, 10, 11, 12.`);
  }
  if (lesson.stream && !isValidStreamCode(lesson.stream)) {
    errors.push(`Invalid stream code: ${lesson.stream}. Must be scientific, literary, or general.`);
  }
  if (!lesson.subject || !isValidSubjectCode(lesson.subject)) {
    errors.push(`Invalid or missing subject code: ${lesson.subject}. Must be math, physics, chemistry, or english.`);
  }
  if (!lesson.unitId || typeof lesson.unitId !== "string") {
    errors.push("Lesson unitId must be a non-empty string.");
  }
  if (!lesson.title || typeof lesson.title !== "string") {
    errors.push("Lesson title must be a non-empty string.");
  }
  if (!Array.isArray(lesson.concepts)) {
    errors.push("Lesson concepts must be an array of strings.");
  }
  if (!Array.isArray(lesson.learningObjectives)) {
    errors.push("Lesson learningObjectives must be an array of strings.");
  }
  if (!Array.isArray(lesson.skills)) {
    errors.push("Lesson skills must be an array of strings.");
  }
  if (!["NONE", "OPEN_LICENSE", "LICENSED"].includes(lesson.sourceStatus)) {
    errors.push(`Invalid sourceStatus: ${lesson.sourceStatus}.`);
  }

  return errors;
}

export function validateUnit(unit: Unit): string[] {
  const errors: string[] = [];

  if (!unit.id || typeof unit.id !== "string") {
    errors.push("Unit id must be a non-empty string.");
  }
  if (!unit.curriculumId || typeof unit.curriculumId !== "string") {
    errors.push("Unit curriculumId must be a non-empty string.");
  }
  if (!unit.grade || !isValidGradeCode(unit.grade)) {
    errors.push(`Invalid or missing unit grade code: ${unit.grade}.`);
  }
  if (!unit.subject || !isValidSubjectCode(unit.subject)) {
    errors.push(`Invalid or missing unit subject code: ${unit.subject}.`);
  }
  if (!unit.title || typeof unit.title !== "string") {
    errors.push("Unit title must be a non-empty string.");
  }
  if (typeof unit.order !== "number") {
    errors.push("Unit order must be a number.");
  }

  return errors;
}
