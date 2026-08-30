import { describe, it } from "node:test";
import assert from "node:assert";
import { DocumentIntakeService } from "./DocumentIntakeService";
import { chemistryGrade12IngestionRecord } from "./chemistryGrade12Manifest";

describe("Patch 19.1 - Chemistry Grade 12 Textbook Ingestion Foundation", () => {
  it("validates magic bytes PDF signature", () => {
    const validPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    const invalidBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);

    assert.strictEqual(DocumentIntakeService.validatePdfSignature(validPdfBytes), true);
    assert.strictEqual(DocumentIntakeService.validatePdfSignature(invalidBytes), false);
  });

  it("verifies detected total page count matches exact 372 pages from attached PDF", () => {
    assert.strictEqual(chemistryGrade12IngestionRecord.manifest.detectedTotalPages, 372);
    assert.strictEqual(chemistryGrade12IngestionRecord.pages.length, 372);
    assert.strictEqual(chemistryGrade12IngestionRecord.manifest.extractedPagesCount, 370);
    assert.strictEqual(chemistryGrade12IngestionRecord.manifest.emptyPagesCount, 2);
  });

  it("ensures immutable document record adheres to strict validation rules", () => {
    const result = DocumentIntakeService.validateIngestionRecord(chemistryGrade12IngestionRecord);
    assert.strictEqual(result.valid, true, `Validation failed with errors: ${result.errors.join(", ")}`);
    assert.strictEqual(result.errors.length, 0);
  });

  it("validates all 12 chapters and units are mapped with authentic Kurdish headings", () => {
    const sections = chemistryGrade12IngestionRecord.detectedSections;
    assert.strictEqual(sections.length >= 24, true);

    // Verify first lesson
    const firstLesson = sections[0];
    assert.strictEqual(firstLesson.unitTitleKurdish, "گیراوەکان و ڕەفتاریان");
    assert.strictEqual(firstLesson.chapterTitleKurdish, "گیراوەکان");
    assert.strictEqual(firstLesson.lessonNumber, "1-1");
    assert.strictEqual(firstLesson.lessonTitleKurdish, "جۆرەکانی تێکەڵ");
    assert.strictEqual(firstLesson.pageStart, 8);

    // Verify Chapter 7 (هاوسەنگی کیمیایی)
    const ch7Lesson = sections.find((s) => s.chapterNumber === 7 && s.lessonNumber === "7-1");
    assert.ok(ch7Lesson);
    assert.strictEqual(ch7Lesson.chapterTitleKurdish, "هاوسەنگی کیمیایی");
    assert.strictEqual(ch7Lesson.lessonTitleKurdish, "سروشتی هاوسەنگی کیمیایی");
    assert.strictEqual(ch7Lesson.pageStart, 176);

    // Verify Chapter 12 (کیمیای ناوکی)
    const ch12Lesson = sections.find((s) => s.chapterNumber === 12 && s.lessonNumber === "12-1");
    assert.ok(ch12Lesson);
    assert.strictEqual(ch12Lesson.chapterTitleKurdish, "کیمیای ناوکی");
    assert.strictEqual(ch12Lesson.lessonTitleKurdish, "ناووك");
    assert.strictEqual(ch12Lesson.pageStart, 330);
  });

  it("rejects malformed ingestion records with mismatched page lengths", () => {
    const malformedRecord = {
      ...chemistryGrade12IngestionRecord,
      pages: chemistryGrade12IngestionRecord.pages.slice(0, 100),
    };
    const result = DocumentIntakeService.validateIngestionRecord(malformedRecord);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("Mismatched page count")));
  });
});
