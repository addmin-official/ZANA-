/**
 * Curriculum Document Ingestion Types (Patch 19.1)
 * Immutable records, per-page extraction contracts, and heading detection data structures.
 */

export type DocumentSourceType = "pdf" | "epub" | "markdown" | "html";

export type PageExtractionStatus =
  | "extracted"
  | "empty"
  | "poor_quality"
  | "ocr_required";

export interface DocumentManifest {
  curriculumId: string;
  documentId: string;
  filename: string;
  sha256: string;
  fileSizeBytes: number;
  mimeType: string;
  detectedTotalPages: number;
  extractedPagesCount: number;
  emptyPagesCount: number;
  poorQualityPagesCount: number;
  ocrRequiredPagesCount: number;
  version: string;
  createdAt: string;
  sourceAttribution: {
    publisher: string;
    titleKurdish: string;
    grade: string;
    subject: string;
    edition: string;
    publishedYear: string;
  };
}

export interface ExtractedPage {
  pageNumber: number; // 1-indexed natural page number
  status: PageExtractionStatus;
  rawText: string;
  characterCount: number;
  hasVisualsOrDiagrams: boolean;
  headingsDetected: string[];
  extractionConfidence: number; // 0.0 - 1.0
  notes?: string;
}

export interface DetectedSection {
  id: string;
  unitNumber?: number;
  unitTitleKurdish?: string;
  chapterNumber?: number;
  chapterTitleKurdish?: string;
  lessonNumber?: string;
  lessonTitleKurdish: string;
  pageStart: number;
  pageEnd: number;
  isConfidenceLow: boolean;
}

export interface DocumentIngestionRecord {
  manifest: DocumentManifest;
  pages: ExtractedPage[];
  detectedSections: DetectedSection[];
}
