import { describe, it } from "node:test";
import assert from "node:assert";
import { CurriculumIndexService, normalizeKurdishText, extractKeywords } from "./CurriculumIndexService";
import { CurriculumRetriever } from "./CurriculumRetriever";
import { chemistryGrade12IngestionRecord } from "../ingestion/chemistryGrade12Manifest";

describe("Patch 19.2 - Curriculum Index & Retrieval Engine", () => {
  const indexService = new CurriculumIndexService(chemistryGrade12IngestionRecord);

  it("builds structure-aware chunks with deterministic identifiers", () => {
    const chunks = indexService.getAllChunks();
    assert.strictEqual(chunks.length, chemistryGrade12IngestionRecord.detectedSections.length);

    const firstChunk = chunks[0];
    assert.ok(firstChunk.chunkId.startsWith("chk:doc_krd_chem_g12"));
    assert.strictEqual(firstChunk.chapterTitleKurdish, "گیراوەکان");
    assert.strictEqual(firstChunk.lessonTitleKurdish, "جۆرەکانی تێکەڵ");
    assert.strictEqual(firstChunk.pageStart, 8);
    assert.strictEqual(firstChunk.pageEnd, 14);

    // Provenance check
    assert.strictEqual(firstChunk.provenance.publisher, "حکومەتی هەرێمی کوردستان - وەزارەتی پەروەردە");
    assert.strictEqual(firstChunk.provenance.edition, "چاپی شەشەم");
    assert.strictEqual(firstChunk.provenance.publishedYear, "2015");
  });

  it("normalizes Sorani Kurdish text accurately", () => {
    assert.strictEqual(normalizeKurdishText("كيميای ئەندامی"), "کیمیای ئەندامی");
    assert.strictEqual(normalizeKurdishText("هاوسه‌نگی"), "هاوسەنگی");
  });

  it("extracts meaningful Kurdish keywords", () => {
    const keywords = extractKeywords("لە بەشی هاوسەنگی کیمیایی دا کارلێکەکان هەن");
    assert.ok(keywords.includes("هاوسەنگی"));
    assert.ok(keywords.includes("کیمیایی"));
    assert.ok(keywords.includes("کارلێکەکان"));
    assert.strictEqual(keywords.includes("لە"), false);
  });

  it("performs hybrid search returning ranked CurriculumEvidence objects", () => {
    const results = indexService.search("ترش و تفتەکان");
    assert.ok(results.length > 0);

    const topMatch = results[0];
    assert.ok(topMatch.evidenceId.startsWith("ev:chk:"));
    assert.strictEqual(topMatch.chapterTitleKurdish, "ترش و تفتەکان");
    assert.ok(topMatch.score > 0.5);
    assert.ok(topMatch.contentSnippet.includes("ترش و تفتەکان"));
    assert.ok(topMatch.pageNumberStart >= 66);
    assert.ok(topMatch.provenance.documentChecksum.length > 0);
  });

  it("applies metadata filters strictly (by chapter and lesson)", () => {
    // Filter strictly for Chapter 10 (کاربۆن و هایدرۆکاربۆنەکان)
    const filtered = indexService.search("", { chapterNumber: 10 });
    assert.strictEqual(filtered.length, 4); // 4 lessons in chapter 10
    assert.ok(filtered.every((f) => f.chapterNumber === 10));

    // Filter strictly for lesson 10-3
    const lessonFiltered = indexService.search("", { chapterNumber: 10, lessonNumber: "10-3" });
    assert.strictEqual(lessonFiltered.length, 1);
    assert.strictEqual(lessonFiltered[0].lessonTitleKurdish, "هایدرۆکاربۆنە تێرەکان");
    assert.strictEqual(lessonFiltered[0].pageNumberStart, 268);
  });

  it("handles duplicate chunk ingestion gracefully with coalescing", () => {
    const customService = new CurriculumIndexService(chemistryGrade12IngestionRecord);
    const initialCount = customService.getChunkCount();

    // Re-indexing the same record should detect duplicate chunk IDs and coalesce without inflating count
    customService.indexDocument(chemistryGrade12IngestionRecord);
    assert.strictEqual(customService.getChunkCount(), initialCount);
  });

  it("covers all filter dimensions including grade, subject, page ranges, and empty results", () => {
    // Subject and Grade filter
    const gradeResults = indexService.search("ترش", { grade: "12", subject: "chemistry" });
    assert.ok(gradeResults.length > 0);

    // Mismatched grade should return empty
    const nonExistentGrade = indexService.search("ترش", { grade: "9" });
    assert.strictEqual(nonExistentGrade.length, 0);

    // Page range filter (pages 100 to 150)
    const pageFiltered = indexService.search("", { pageStart: 100, pageEnd: 150 });
    assert.ok(pageFiltered.length > 0);
    assert.ok(pageFiltered.every((p) => p.pageNumberStart <= 150 && p.pageNumberEnd >= 100));

    // Empty result case for unknown query
    const emptyResults = indexService.search("وشەیەکی_نادیار_لەناو_کتێب_بوونی_نییە_xyz");
    assert.strictEqual(emptyResults.length, 0);
  });

  it("preserves chemical formulas, reaction arrows, and equation notation without corruption", () => {
    const rawFormula = "H3O+(aq) + OH-(aq) ⇌ 2H2O(l) | pH = -log[H+] | ΔH = -57.1 kJ/mol";
    const customRecord = {
      ...chemistryGrade12IngestionRecord,
      detectedSections: [
        {
          id: "chem-12-formula-test",
          unitNumber: 2,
          unitTitleKurdish: "هاوسەنگی و گەرمی",
          chapterNumber: 4,
          chapterTitleKurdish: "تێکشکانی ترش و تفتەکان",
          lessonNumber: "4-2",
          lessonTitleKurdish: `دیاریکردنی pH و هاوکێشەی هاوسەنگی: ${rawFormula}`,
          pageStart: 88,
          pageEnd: 94,
          isConfidenceLow: false,
        },
      ],
    };

    const formulaService = new CurriculumIndexService(customRecord);
    const results = formulaService.search("pH و هاوکێشەی هاوسەنگی");
    assert.ok(results.length > 0);

    const match = results[0];
    assert.ok(match.lessonTitleKurdish.includes(rawFormula));
    assert.strictEqual(match.pageNumberStart, 88);
    assert.strictEqual(match.pageNumberEnd, 94);

    // Verify Kurdish heading structure, formula symbols (⇌, ΔH, pH), and metadata integrity
    assert.ok(match.contentSnippet.includes("pH = -log[H+]"));
    assert.ok(match.contentSnippet.includes("ΔH = -57.1 kJ/mol"));
    assert.ok(match.contentSnippet.includes("⇌"));
    assert.ok(match.contentSnippet.includes("بەندی 4"));
  });

  it("integrates seamlessly into CurriculumRetriever returning evidence", async () => {
    const retriever = new CurriculumRetriever(undefined, indexService);
    const result = await retriever.retrieve({
      grade: "12",
      subject: "chemistry",
      query: "تیشکە لێکەهەڵوەشان و کیمیای ناوکی",
      maxResults: 2,
    });

    assert.strictEqual(result.groundingStatus, "GROUNDED");
    assert.ok(result.evidence);
    assert.ok(result.evidence.length > 0);

    const evidence = result.evidence[0];
    assert.ok(evidence.chapterTitleKurdish.includes("کیمیای ناوکی") || evidence.lessonTitleKurdish.includes("تیشک"));
    assert.ok(evidence.pageNumberStart >= 330);
  });
});
