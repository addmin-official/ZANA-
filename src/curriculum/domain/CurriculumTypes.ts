export type SourceStatus = "NONE" | "OPEN_LICENSE" | "LICENSED";

export interface SourceMetadata {
  publisher?: string;
  author?: string;
  edition?: string;
  publishedYear?: number;
  url?: string;
  isbn?: string;
  attributionText?: string;
}

export interface LicenseMetadata {
  licenseId: string;
  licensee: string;
  grantedAt: string;
  expiresAt: string;
  allowedActions: string[];
}

export interface RetrievalMetadata {
  matchedAt: string;
  confidence: number;
  retrievedBy: string;
}

export interface Curriculum {
  id: string;
  name: string;
  description?: string;
  region: string;
  version: string;
}

export interface Grade {
  id: string;
  code: string; // e.g. "9", "10"
  title: string; // e.g. "Grade 9"
  description?: string;
}

export interface Stream {
  id: string;
  code: string; // e.g. "scientific", "literary"
  title: string;
}

export interface Subject {
  id: string;
  code: string; // e.g. "math", "physics"
  title: string;
}

export interface Unit {
  id: string;
  curriculumId: string;
  grade: string;
  stream?: string;
  subject: string;
  title: string;
  description?: string;
  order: number;
}

export interface CurriculumLesson {
  id: string;
  curriculumId: string;
  grade: string;
  stream?: string;
  subject: string;
  unitId: string;
  title: string;
  concepts: string[];
  learningObjectives: string[];
  skills: string[];
  sourceStatus: SourceStatus;
  licenseId: string | null;
  metadata?: Record<string, unknown>;
  contentExcerpts?: string[]; // for retrieval grounding
}

export interface Concept {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  examples?: string[];
}

export interface LearningObjective {
  id: string;
  lessonId: string;
  description: string;
}

export interface Skill {
  id: string;
  lessonId: string;
  name: string;
  description: string;
}
