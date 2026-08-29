export type SubjectId = 'chemistry' | 'physics' | 'mathematics' | 'biology' | 'english';
export type GradeLevel = 7 | 8 | 9 | 10 | 11 | 12;

export interface CurriculumTopic {
  id: string;
  title: string; // Sorani Kurdish title
  description?: string;
  learningObjectives: string[];
  sourceUrl?: string;
}

export interface CurriculumUnit {
  id: string;
  title: string;
  topics: CurriculumTopic[];
}

export interface CurriculumContext {
  grade: GradeLevel;
  subject: SubjectId;
  units: CurriculumUnit[];
  providerId: string;
  lastSyncedAt: string;
}

export interface ICurriculumProvider {
  getProviderId(): string;
  fetchSubjectContext(grade: GradeLevel, subject: SubjectId): Promise<CurriculumContext | null>;
  fetchTopicDetails(topicId: string): Promise<CurriculumTopic | null>;
}
