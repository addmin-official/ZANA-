import { CurriculumLesson, Unit } from "../domain/CurriculumTypes.ts";
import { CurriculumRegistry } from "./CurriculumRegistry.ts";
import { LICENSE_ZANA_OPEN_ID, CURRICULUM_ZANA_ID } from "../domain/CurriculumIdentifiers.ts";

export function seedDemoCurriculum(): void {
  const registry = CurriculumRegistry.getInstance();

  // Unit: Foundations of Algebra
  const unitId = "foundations-of-algebra";
  const algebraUnit: Unit = {
    id: unitId,
    curriculumId: CURRICULUM_ZANA_ID,
    grade: "9",
    subject: "math",
    title: "بنچینەکانی جەبر (Foundations of Algebra)",
    description: "فێربوونی سەرەتایی دەربڕینە جەبرییەکان، هاوکێشەکان و شیکارکردنیان.",
    order: 1,
  };
  registry.registerUnit(algebraUnit);

  // Lesson 1: Variables and expressions
  const lesson1: CurriculumLesson = {
    id: "g9-math-algebra-l1",
    curriculumId: CURRICULUM_ZANA_ID,
    grade: "9",
    subject: "math",
    unitId: unitId,
    title: "گۆڕدراوەکان و دەربڕینەکان (Variables and expressions)",
    concepts: ["گۆڕدراو", "دەربڕینی جەبری", "نەگۆڕ", "سەربەخۆ"],
    learningObjectives: [
      "تێگەیشتن لە چەمکی گۆڕدراو (Variable) وەک هێمایەک بۆ بەهایەکی نەزانراو.",
      "جیاکردنەوەی دەربڕینە جەبرییەکان لە هاوکێشەکان.",
      "نووسینی دەربڕینی جەبری لەسەر بنەمای دەقە زمانییەکان."
    ],
    skills: [
      "دروستکردنی دەربڕینی جەبری",
      "دەستنیشانکردنی گۆڕدراوەکان لەناو دەربڕیندا",
      "سادەکردنەوەی دەربڕینە سادەکان"
    ],
    sourceStatus: "OPEN_LICENSE",
    licenseId: LICENSE_ZANA_OPEN_ID,
    contentExcerpts: [
      "گۆڕدراو (Variable) بریتییە لە پیتێک یان هێمایەک (وەک x یان y) کە نوێنەرایەتی ژمارەیەکی نادیار دەکات.",
      "دەربڕینی جەبری (Algebraic Expression) کۆمەڵێک ژمارە و گۆڕدراو و کردارە بیرکارییەکانە (وەک کۆکردنەوە و لێدەرکردن)، بەبێ بوونی نیشانەی یەکسان (=). بۆ نموونە: 3x + 5.",
      "نموونەی نووسینی دەربڕین: 'سێ جار ژمارەیەک کۆی پێنج' دەبێتە: 3x + 5."
    ],
    metadata: {
      sourceMetadata: {
        publisher: "ZANA",
        author: "ZANA Educational Team",
        edition: "1st Edition",
        publishedYear: 2026,
        attributionText: "ناوەرۆکی فێرکاریی فەرمی زانا - مافی بڵاوکردنەوەی پارێزراوە بۆ گشت قوتابیان.",
      }
    }
  };
  registry.registerLesson(lesson1);

  // Lesson 2: Simple linear equations
  const lesson2: CurriculumLesson = {
    id: "g9-math-algebra-l2",
    curriculumId: CURRICULUM_ZANA_ID,
    grade: "9",
    subject: "math",
    unitId: unitId,
    title: "هاوکێشە هێڵییە سادەکان (Simple linear equations)",
    concepts: ["هاوکێشە", "هاوکێشەی هێڵی", "شیکار", "هاوسەنگی"],
    learningObjectives: [
      "تێگەیشتن لە چەمکی هاوکێشە (Equation) وەک دەربڕینێک کە نیشانەی یەکسان (=) لەخۆدەگرێت.",
      "شیکارکردنی هاوکێشە هێڵییە یەک هەنگاوی و دوو هەنگاویەکان.",
      "بەکاربردنی کردارە پێچەوانەکان بۆ دۆزینەوەی بەهای گۆڕدراو."
    ],
    skills: [
      "شیکارکردنی هاوکێشەی هێڵی",
      "بەکاربردنی کردارە پێچەوانەکان (لێدەرکردن بۆ کۆکردنەوە، دابەشکردن بۆ لێکدان)",
      "پاراستنی هاوسەنگی هاوکێشەکان"
    ],
    sourceStatus: "OPEN_LICENSE",
    licenseId: LICENSE_ZANA_OPEN_ID,
    contentExcerpts: [
      "هاوکێشە (Equation) ڕستەیەکی بیرکارییە کە دەڵێت دوو دەربڕین یەکسانن بە یەکدی، بە هێمای یەکسان (=). بۆ نموونە: 2x + 4 = 10.",
      "شیکارکردنی هاوکێشە واتە دۆزینەوەی ئەو بەهایەی کە هاوکێشەکە ڕاست دەکاتەوە.",
      "یاسای هاوسەنگی: هەر کردارێک لە لایەکی هاوکێشەکە دەکەیت، پێویستە لە لایەکەی تریش هەمان کردار ئەنجام بدەیت. بۆ نموونە لە هاوکێشەی x - 3 = 7، بۆ لادانی -3، لایەنی چەپ و ڕاست کۆی 3 دەکەین: x = 10."
    ],
    metadata: {
      sourceMetadata: {
        publisher: "ZANA",
        author: "ZANA Educational Team",
        edition: "1st Edition",
        publishedYear: 2026,
        attributionText: "ناوەرۆکی فێرکاریی فەرمی زانا - مافی بڵاوکردنەوەی پارێزراوە بۆ گشت قوتابیان.",
      }
    }
  };
  registry.registerLesson(lesson2);

  // Lesson 3: Substitution
  const lesson3: CurriculumLesson = {
    id: "g9-math-algebra-l3",
    curriculumId: CURRICULUM_ZANA_ID,
    grade: "9",
    subject: "math",
    unitId: unitId,
    title: "جێگرتنەوە و بەها دانان (Substitution)",
    concepts: ["جێگرتنەوە", "بەهای ژمارەیی", "هەڵسەنگاندنی دەربڕین"],
    learningObjectives: [
      "تێگەیشتن لە چەمکی جێگرتنەوە (Substitution) وەک دانانی ژمارەیەک لە شوێنی گۆڕدراوێک.",
      "دۆزینەوەی بەهای ژمارەیی دەربڕینە جەبرییەکان بۆ بەهایەکی دیاریکراوی گۆڕدراوەکە.",
      "پەیڕەکردنی ڕێزبەندی کردارە بیرکارییەکان لەکاتی هەڵسەنگاندندا."
    ],
    skills: [
      "بەها دانان لە شوێنی گۆڕدراو",
      "ئەنجامدانی ڕێزبەندی کردارە بیرکارییەکان (کەوانە، توان، لێکدان، دابەشکردن، کۆکردنەوە، لێدەرکردن)",
      "هەژمارکردنی بەهای ژمارەیی"
    ],
    sourceStatus: "OPEN_LICENSE",
    licenseId: LICENSE_ZANA_OPEN_ID,
    contentExcerpts: [
      "جێگرتنەوە (Substitution) بریتییە لە دانانی بەهایەکی ژمارەیی دیاریکراو لە شوێنی گۆڕدراوێک لەناو دەربڕین یان هاوکێشەیەکدا.",
      "بۆ هەڵسەنگاندنی دەربڕینی 3x - 2 کاتێک x = 4، ژمارە 4 دەخەینە شوێنی x: دەبێتە 3(4) - 2 = 12 - 2 = 10.",
      "هەمیشە دەبێت فەرمانی لێکدان یان دابەشکردن پێش کۆکردنەوە و لێدەرکردن ئەنجام بدرێت."
    ],
    metadata: {
      sourceMetadata: {
        publisher: "ZANA",
        author: "ZANA Educational Team",
        edition: "1st Edition",
        publishedYear: 2026,
        attributionText: "ناوەرۆکی فێرکاریی فەرمی زانا - مافی بڵاوکردنەوەی پارێزراوە بۆ گشت قوتابیان.",
      }
    }
  };
  registry.registerLesson(lesson3);

  // Lesson 4: Checking solutions
  const lesson4: CurriculumLesson = {
    id: "g9-math-algebra-l4",
    curriculumId: CURRICULUM_ZANA_ID,
    grade: "9",
    subject: "math",
    unitId: unitId,
    title: "پشکنینی وەڵامەکان (Checking solutions)",
    concepts: ["پشکنین", "ڕاستکردنەوە", "ناسنامە", "پەسندکردن"],
    learningObjectives: [
      "تێگەیشتن لە گرنگی پشکنین (Checking) بۆ پشتڕاستکردنەوەی دروستی وەڵامی هاوکێشەیەک.",
      "جێگیرکردنی وەڵامی دۆزراوە لە هاوکێشە ئەسڵییەکە بۆ پشکنینی ڕاستی یاسایی.",
      "دەستنیشانکردنی هەڵە حیسابییەکان لەکاتی شیکارکردندا."
    ],
    skills: [
      "جێگیرکردنی وەڵام لە هاوکێشەدا",
      "بەراوردکردنی لایەنی چەپ (LHS) و لایەنی ڕاست (RHS) بۆ دڵنیابوونەوە لە یەکسانی",
      "ڕاستکردنەوەی هەڵەکان"
    ],
    sourceStatus: "OPEN_LICENSE",
    licenseId: LICENSE_ZANA_OPEN_ID,
    contentExcerpts: [
      "پشکنینی وەڵام (Checking solutions) پڕۆسەیەکە کە تێیدا شیکاری دۆزراوە دەخەینەوە ناو هاوکێشە سەرەکییەکە بۆ دڵنیابوون لەوەی کە لایەنی چەپ یەکسانە بە لایەنی ڕاست.",
      "نموونە: ئەگەر هاوکێشەکەمان 2x + 5 = 15 بێت و شیکارییەکەمان x = 5 بێت، بۆ پشکنین 5 دەخەینە شوێنی x: لایەنی چەپ: 2(5) + 5 = 10 + 5 = 15. چونکە لایەنی چەپ (15) یەکسانە بە لایەنی ڕاست (15)، وەڵامەکەمان تەواوە.",
      "ئەگەر هەردوو لایەن یەکسان نەبوون، ئەمە نیشانەیە بۆ ئەوەی کە شیکارەکە یان پڕۆسەی پشکنینەکە هەڵەی تێدایە."
    ],
    metadata: {
      sourceMetadata: {
        publisher: "ZANA",
        author: "ZANA Educational Team",
        edition: "1st Edition",
        publishedYear: 2026,
        attributionText: "ناوەرۆکی فێرکاریی فەرمی زانا - مافی بڵاوکردنەوەی پارێزراوە بۆ گشت قوتابیان.",
      }
    }
  };
  registry.registerLesson(lesson4);
}
