export type StudentGrade = "9" | "10" | "11" | "12";

export type AcademicStream = "scientific" | "literary" | "general";

export type SubjectKey = "math" | "physics" | "chemistry" | "english";

export type StudentLevel = "beginner" | "intermediate" | "advanced";

export interface StudentProfile {
  id: string;
  name: string;
  grade: StudentGrade;
  stream: AcademicStream;
  activeSubject: SubjectKey;
  level: StudentLevel;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  authoritative: boolean;
  source: "guest-local" | "server-authoritative";
  isStale?: boolean;
}

export interface StudentProfileDraft {
  name: string;
  grade: StudentGrade;
  stream: AcademicStream;
  activeSubject: SubjectKey;
  level: StudentLevel;
}
