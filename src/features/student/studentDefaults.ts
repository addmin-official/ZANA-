import { StudentGrade, AcademicStream, SubjectKey, StudentLevel } from "./studentTypes.ts";

export const GRADE_LABELS: Record<StudentGrade, string> = {
  "9": "پۆلی ٩",
  "10": "پۆلی ١٠",
  "11": "پۆلی ١١",
  "12": "پۆلی ١٢"
};

export const STREAM_LABELS: Record<AcademicStream, string> = {
  scientific: "زانستی",
  literary: "وێژەیی",
  general: "گشتی"
};

export const SUBJECT_LABELS: Record<SubjectKey, string> = {
  math: "بیرکاری",
  physics: "فیزیا",
  chemistry: "کیمیا",
  english: "ئینگلیزی"
};

export const LEVEL_LABELS: Record<StudentLevel, string> = {
  beginner: "سەرەتا",
  intermediate: "مامناوەند",
  advanced: "پێشکەوتوو"
};

// Conversions to maintain backward compatibility with old database strings
export const LEVEL_MAP_TO_EN: Record<string, StudentLevel> = {
  "سەرەتا": "beginner",
  "مامناوەند": "intermediate",
  "پێشکەوتوو": "advanced",
  "beginner": "beginner",
  "intermediate": "intermediate",
  "advanced": "advanced"
};

export const LEVEL_MAP_TO_KU: Record<StudentLevel, string> = {
  beginner: "سەرەتا",
  intermediate: "مامناوەند",
  advanced: "پێشکەوتوو"
};

// Validation helpers
export function isValidGrade(value: unknown): value is StudentGrade {
  return typeof value === "string" && ["9", "10", "11", "12"].includes(value);
}

export function isValidStream(value: unknown): value is AcademicStream {
  return typeof value === "string" && ["scientific", "literary", "general"].includes(value);
}

export function isValidSubject(value: unknown): value is SubjectKey {
  return typeof value === "string" && ["math", "physics", "chemistry", "english"].includes(value);
}

export function isValidLevel(value: unknown): value is StudentLevel {
  return typeof value === "string" && ["beginner", "intermediate", "advanced"].includes(value);
}

export function sanitizeStudentName(name: string | null | undefined): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (trimmed.length > 60) {
    return trimmed.substring(0, 60);
  }
  return trimmed;
}

export function getValidatedGrade(value: unknown): StudentGrade {
  return isValidGrade(value) ? value : "12";
}

export function getValidatedStream(value: unknown): AcademicStream {
  return isValidStream(value) ? value : "general";
}

export function getValidatedSubject(value: unknown): SubjectKey {
  return isValidSubject(value) ? value : "math";
}

export function getValidatedLevel(value: unknown): StudentLevel {
  if (typeof value === "string") {
    const mapped = LEVEL_MAP_TO_EN[value];
    if (mapped) return mapped;
  }
  return isValidLevel(value) ? value : "beginner";
}
