import { DocumentIngestionRecord, DetectedSection } from "../ingestion/DocumentIngestionTypes";
import {
  CurriculumChunk,
  CurriculumEvidence,
  CurriculumProvenance,
  RetrievalFilter,
} from "./CurriculumEvidence";
import { chemistryGrade12IngestionRecord } from "../ingestion/chemistryGrade12Manifest";

/**
 * Normalizes Kurdish (Sorani) text for robust keyword matching.
 */
export function normalizeKurdishText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove arabic diacritics
    .replace(/ه\u200c/g, "ە") // Kurdish Ae typed as Heh+ZWNJ
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // remove zero-width spaces/joiners
    .replace(/ي/g, "ی") // Arabic Yeh to Kurdish Yeh
    .replace(/ى/g, "ی") // Alef Maksura to Kurdish Yeh
    .replace(/ك/g, "ک") // Arabic Kaf to Kurdish Kaf
    .replace(/هـ/g, "ه") // Arabic Heh Tatweel
    .replace(/[\s\t\n]+/g, " ")
    .trim();
}

/**
 * Extracts essential Kurdish terms for indexing.
 */
export function extractKeywords(text: string): string[] {
  const normalized = normalizeKurdishText(text);
  const rawTokens = normalized.split(/[^\p{L}\p{N}]+/u);
  const stopWords = new Set([
    "لە", "بە", "بۆ", "لەگەڵ", "وەک", "وە", "یان", "ئەم", "ئەو", "کە", "دا", "پێی", "دەبێت", "دەکرێت", "دەبن"
  ]);

  return Array.from(
    new Set(
      rawTokens.filter((t) => t.length > 1 && !stopWords.has(t))
    )
  );
}

/**
 * Curriculum Index & Retrieval Engine (Patch 19.2)
 *
 * Consumes immutable extraction manifests, segments into structure-aware chunks,
 * maintains deterministic chunk IDs, and provides hybrid scoring with traceable CurriculumEvidence.
 */
export class CurriculumIndexService {
  private chunks: CurriculumChunk[] = [];
  private static defaultInstance: CurriculumIndexService | null = null;

  constructor(record?: DocumentIngestionRecord) {
    const targetRecord = record || chemistryGrade12IngestionRecord;
    this.indexDocument(targetRecord);
  }

  public static getInstance(): CurriculumIndexService {
    if (!CurriculumIndexService.defaultInstance) {
      CurriculumIndexService.defaultInstance = new CurriculumIndexService();
    }
    return CurriculumIndexService.defaultInstance;
  }

  /**
   * Ingest and build structure-aware chunks from DocumentIngestionRecord.
   */
  public indexDocument(record: DocumentIngestionRecord): void {
    const { manifest, detectedSections } = record;

    const provenance: CurriculumProvenance = {
      publisher: manifest.sourceAttribution.publisher,
      titleKurdish: manifest.sourceAttribution.titleKurdish,
      edition: manifest.sourceAttribution.edition,
      publishedYear: manifest.sourceAttribution.publishedYear,
      documentChecksum: manifest.sha256,
      documentId: manifest.documentId,
    };

    for (const section of detectedSections) {
      const chunk = this.createChunkFromSection(manifest.curriculumId, manifest.documentId, section, provenance);
      // Duplicate detection & deduplication: coalesce/reject duplicate chunkId
      const existingIdx = this.chunks.findIndex((c) => c.chunkId === chunk.chunkId);
      if (existingIdx >= 0) {
        // Coalesce keywords and preserve earliest pageStart and latest pageEnd
        const existing = this.chunks[existingIdx];
        existing.pageStart = Math.min(existing.pageStart, chunk.pageStart);
        existing.pageEnd = Math.max(existing.pageEnd, chunk.pageEnd);
        existing.keywords = Array.from(new Set([...existing.keywords, ...chunk.keywords]));
      } else {
        this.chunks.push(chunk);
      }
    }
  }

  private createChunkFromSection(
    curriculumId: string,
    documentId: string,
    section: DetectedSection,
    provenance: CurriculumProvenance
  ): CurriculumChunk {
    const cleanDocId = documentId.replace(/[^a-zA-Z0-9]/g, "_");
    const cleanSecId = section.id.replace(/[^a-zA-Z0-9]/g, "_");
    const chunkId = `chk:${cleanDocId}:${cleanSecId}:p${section.pageStart}_${section.pageEnd}`;

    const headingHierarchy = [
      section.unitTitleKurdish ? `بەشی ${section.unitNumber || 1}: ${section.unitTitleKurdish}` : "",
      section.chapterTitleKurdish ? `بەندی ${section.chapterNumber || 1}: ${section.chapterTitleKurdish}` : "",
      section.lessonTitleKurdish ? `کەرتی ${section.lessonNumber || "1"}: ${section.lessonTitleKurdish}` : "",
    ].filter(Boolean);

    const fullDescriptor = `${headingHierarchy.join(" - ")} (لاپەڕە ${section.pageStart} - ${section.pageEnd})`;
    const keywords = extractKeywords(
      `${section.unitTitleKurdish || ""} ${section.chapterTitleKurdish || ""} ${section.lessonTitleKurdish || ""}`
    );

    return {
      chunkId,
      curriculumId,
      documentId,
      sectionId: section.id,
      unitNumber: section.unitNumber,
      unitTitleKurdish: section.unitTitleKurdish,
      chapterNumber: section.chapterNumber,
      chapterTitleKurdish: section.chapterTitleKurdish || "",
      lessonNumber: section.lessonNumber || "",
      lessonTitleKurdish: section.lessonTitleKurdish,
      pageStart: section.pageStart,
      pageEnd: section.pageEnd,
      headingHierarchy,
      snippet: fullDescriptor,
      keywords,
      provenance,
    };
  }

  /**
   * Search curriculum index using hybrid ranking and return structured CurriculumEvidence.
   */
  public search(query: string, filter?: RetrievalFilter): CurriculumEvidence[] {
    const normalizedQuery = normalizeKurdishText(query);
    const queryKeywords = extractKeywords(normalizedQuery);

    const hasFilter = Boolean(
      filter &&
      (filter.chapterNumber !== undefined ||
       filter.lessonNumber !== undefined ||
       filter.unitNumber !== undefined ||
       filter.pageStart !== undefined ||
       filter.pageEnd !== undefined ||
       filter.grade !== undefined ||
       filter.subject !== undefined ||
       filter.curriculumId !== undefined ||
       filter.documentId !== undefined)
    );

    if (queryKeywords.length === 0 && !hasFilter) {
      return [];
    }

    const scoredResults: { chunk: CurriculumChunk; score: number }[] = [];

    for (const chunk of this.chunks) {
      // 1. Apply metadata filters
      if (filter?.curriculumId && chunk.curriculumId !== filter.curriculumId) continue;
      if (filter?.documentId && chunk.documentId !== filter.documentId) continue;
      if (filter?.grade && !chunk.curriculumId.includes(`g${filter.grade}`) && !chunk.documentId.includes(`g${filter.grade}`)) continue;
      if (filter?.subject) {
        const sub = filter.subject.toLowerCase();
        const subPrefix = sub.startsWith("chem") ? "chem" : sub.startsWith("phys") ? "phys" : sub.startsWith("bio") ? "bio" : sub;
        const matchesSubject = chunk.curriculumId.toLowerCase().includes(subPrefix) || chunk.documentId.toLowerCase().includes(subPrefix);
        if (!matchesSubject) continue;
      }
      if (filter?.unitNumber && chunk.unitNumber !== filter.unitNumber) continue;
      if (filter?.chapterNumber && chunk.chapterNumber !== filter.chapterNumber) continue;
      if (filter?.lessonNumber && chunk.lessonNumber !== filter.lessonNumber) continue;
      if (filter?.pageStart && chunk.pageEnd < filter.pageStart) continue;
      if (filter?.pageEnd && chunk.pageStart > filter.pageEnd) continue;

      // 2. Compute relevance score
      let score = 0;

      const normalizedLessonTitle = normalizeKurdishText(chunk.lessonTitleKurdish);
      const normalizedChapterTitle = normalizeKurdishText(chunk.chapterTitleKurdish);

      // Exact substring boost
      if (normalizedQuery.length > 0 && normalizedLessonTitle.includes(normalizedQuery)) {
        score += 0.6;
      }
      if (normalizedQuery.length > 0 && normalizedChapterTitle.includes(normalizedQuery)) {
        score += 0.4;
      }

      // Keyword overlap scoring
      let matchedCount = 0;
      for (const qk of queryKeywords) {
        if (chunk.keywords.includes(qk)) {
          matchedCount++;
        } else if (chunk.keywords.some((k) => k.includes(qk) || qk.includes(k))) {
          matchedCount += 0.5;
        }
      }

      if (queryKeywords.length > 0) {
        const keywordScore = (matchedCount / queryKeywords.length) * 0.4;
        score += keywordScore;
      } else {
        // If query was empty but filter matched (e.g. browsing a chapter)
        score = 1.0;
      }

      // Cap score at 1.0
      const finalScore = Math.min(1.0, Number(score.toFixed(3)));

      if (finalScore >= (filter?.minScore ?? 0.15)) {
        scoredResults.push({ chunk, score: finalScore });
      }
    }

    // 3. Rank descending by score
    scoredResults.sort((a, b) => b.score - a.score);

    // 4. Limit results
    const limit = filter?.limit ?? 5;
    const topResults = scoredResults.slice(0, limit);

    // 5. Convert to traceable CurriculumEvidence
    return topResults.map(({ chunk, score }, idx) => ({
      evidenceId: `ev:${chunk.chunkId}:${idx + 1}`,
      curriculumId: chunk.curriculumId,
      documentId: chunk.documentId,
      unitNumber: chunk.unitNumber,
      unitTitleKurdish: chunk.unitTitleKurdish,
      chapterNumber: chunk.chapterNumber,
      chapterTitleKurdish: chunk.chapterTitleKurdish,
      lessonNumber: chunk.lessonNumber,
      lessonTitleKurdish: chunk.lessonTitleKurdish,
      pageNumberStart: chunk.pageStart,
      pageNumberEnd: chunk.pageEnd,
      contentSnippet: `${chunk.snippet} - پڕۆگرامی فەرمی وەزارەتی پەروەردەی هەرێمی کوردستان`,
      keywords: chunk.keywords,
      score,
      provenance: chunk.provenance,
    }));
  }

  /**
   * Get total indexed chunk count.
   */
  public getChunkCount(): number {
    return this.chunks.length;
  }

  /**
   * Retrieve all indexed chunks.
   */
  public getAllChunks(): CurriculumChunk[] {
    return [...this.chunks];
  }
}
