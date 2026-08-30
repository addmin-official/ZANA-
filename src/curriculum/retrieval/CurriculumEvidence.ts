/**
 * Curriculum Evidence & Chunking Types (Patch 19.2)
 * Structure-aware retrieval evidence with strict provenance tracking.
 */

export interface CurriculumProvenance {
  publisher: string;
  titleKurdish: string;
  edition: string;
  publishedYear: string;
  documentChecksum: string;
  documentId: string;
}

export interface CurriculumChunk {
  chunkId: string; // Deterministic: chk:<docId>:<sectionId>:<pageStart>_<pageEnd>
  curriculumId: string;
  documentId: string;
  sectionId: string;
  unitNumber?: number;
  unitTitleKurdish?: string;
  chapterNumber?: number;
  chapterTitleKurdish: string;
  lessonNumber: string;
  lessonTitleKurdish: string;
  pageStart: number;
  pageEnd: number;
  headingHierarchy: string[];
  snippet: string;
  keywords: string[];
  provenance: CurriculumProvenance;
}

export interface CurriculumEvidence {
  evidenceId: string;
  curriculumId: string;
  documentId: string;
  unitNumber?: number;
  unitTitleKurdish?: string;
  chapterNumber?: number;
  chapterTitleKurdish: string;
  lessonNumber: string;
  lessonTitleKurdish: string;
  pageNumberStart: number;
  pageNumberEnd: number;
  contentSnippet: string;
  keywords: string[];
  score: number; // Normalized relevance score (0.0 to 1.0)
  provenance: CurriculumProvenance;
}

export interface RetrievalFilter {
  curriculumId?: string;
  documentId?: string;
  grade?: string;
  subject?: string;
  unitNumber?: number;
  chapterNumber?: number;
  lessonNumber?: string;
  pageStart?: number;
  pageEnd?: number;
  limit?: number;
  minScore?: number;
}
