import { CurriculumSubject, CurriculumStream } from "../types.ts";

export const SUBJECT_LABELS: Record<CurriculumSubject, string> = {
  math: "بیرکاری",
  physics: "فیزیا",
  chemistry: "کیمیا",
  english: "ئینگلیزی"
};

export const LITERARY_AVAILABLE_SUBJECTS: CurriculumSubject[] = ["math", "english"];
export const SCIENTIFIC_AVAILABLE_SUBJECTS: CurriculumSubject[] = ["math", "physics", "chemistry", "english"];

export function getAvailableSubjectsForStream(stream?: CurriculumStream): CurriculumSubject[] {
  if (stream === "literary") {
    return ["math", "english"];
  }
  return ["math", "physics", "chemistry", "english"];
}
