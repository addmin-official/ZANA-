import {
  DocumentIngestionRecord,
  ExtractedPage,
  PageExtractionStatus,
} from "./DocumentIngestionTypes";

/**
 * Deterministic PDF Intake & Validation Service (Patch 19.1)
 *
 * Implements:
 * 1. MIME and signature validation (Magic bytes %PDF-).
 * 2. Immutable Document Manifest generation with stable SHA-256 derived IDs.
 * 3. Exact per-page extraction validation with strict status mapping.
 * 4. Structural heading and lesson/unit segmentation without guessed metadata.
 */
export class DocumentIntakeService {
  /**
   * Validate PDF signature from byte stream.
   */
  public static validatePdfSignature(bytes: Uint8Array): boolean {
    if (!bytes || bytes.length < 5) return false;
    // "%PDF-" in ASCII is [0x25, 0x50, 0x44, 0x46, 0x2D]
    return (
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2d
    );
  }

  /**
   * Derive deterministic SHA-256 hash or stable identifier.
   */
  public static generateDocumentId(curriculumId: string, checksum: string, version: string): string {
    return `doc:${curriculumId}:${checksum.substring(0, 12)}:v${version}`;
  }

  /**
   * Validate an ingestion record ensuring completeness, non-duplication, and structural continuity.
   */
  public static validateIngestionRecord(record: DocumentIngestionRecord): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!record.manifest) {
      errors.push("Missing document manifest.");
      return { valid: false, errors };
    }

    if (record.pages.length !== record.manifest.detectedTotalPages) {
      errors.push(
        `Mismatched page count: manifest detected ${record.manifest.detectedTotalPages} pages, but ${record.pages.length} pages were extracted.`
      );
    }

    const seenPages = new Set<number>();
    for (let i = 0; i < record.pages.length; i++) {
      const page = record.pages[i];
      if (page.pageNumber !== i + 1) {
        errors.push(`Page index mismatch at position ${i}: expected pageNumber ${i + 1}, got ${page.pageNumber}`);
      }
      if (seenPages.has(page.pageNumber)) {
        errors.push(`Duplicate page found for page number ${page.pageNumber}`);
      }
      seenPages.add(page.pageNumber);

      if (page.status === "extracted" && page.rawText.trim().length === 0) {
        errors.push(`Page ${page.pageNumber} marked as 'extracted' but contains empty text.`);
      }
    }

    // Verify sections have valid page boundaries
    for (const sec of record.detectedSections) {
      if (sec.pageStart < 1 || sec.pageEnd > record.manifest.detectedTotalPages || sec.pageStart > sec.pageEnd) {
        errors.push(`Invalid page range in section ${sec.id}: ${sec.pageStart}-${sec.pageEnd}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Parse extracted OCR/text page items and derive extraction statuses.
   */
  public static analyzePageText(pageNumber: number, text: string, hasVisuals = false): ExtractedPage {
    const trimmed = text ? text.trim() : "";
    let status: PageExtractionStatus = "extracted";
    let confidence = 0.95;

    if (trimmed.length === 0) {
      status = "empty";
      confidence = 1.0;
    } else if (trimmed.length < 40 && !hasVisuals) {
      status = "poor_quality";
      confidence = 0.5;
    }

    const headings: string[] = [];
    // Detect Kurdish Unit/Chapter/Lesson markers
    const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (
        line.startsWith("بەشی") ||
        line.startsWith("بەندی") ||
        line.startsWith("کەرتی") ||
        line.startsWith("پێداچوونەوەی") ||
        line.startsWith("ناوەڕۆک")
      ) {
        headings.push(line);
      }
    }

    return {
      pageNumber,
      status,
      rawText: trimmed,
      characterCount: trimmed.length,
      hasVisualsOrDiagrams: hasVisuals,
      headingsDetected: headings,
      extractionConfidence: confidence,
    };
  }
}
