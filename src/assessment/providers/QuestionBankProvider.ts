import { AssessmentQuestion, QuestionSource, QuestionType, GenerationReviewStatus, PublicQuestion } from "../domain/AssessmentTypes.ts";
import { DifficultyLevel } from "../../learning/domain/MasteryTypes.ts";

export interface QuestionBankFilter {
  curriculumId?: string;
  unitId?: string;
  lessonId?: string;
  conceptId?: string;
  skillId?: string;
  difficulty?: DifficultyLevel;
  type?: QuestionType;
}

export class QuestionBankProvider {
  private static instance: QuestionBankProvider | null = null;
  private questions: Map<string, AssessmentQuestion> = new Map();
  private answerKeys: Map<string, any> = new Map(); // Secure answer key store mapped by questionId

  private constructor() {
    this.seedCuratedQuestions();
  }

  public static getInstance(): QuestionBankProvider {
    if (!this.instance) {
      this.instance = new QuestionBankProvider();
    }
    return this.instance;
  }

  /**
   * Adds an approved question to the bank.
   */
  public addQuestion(question: AssessmentQuestion, correctAnswer: any): void {
    this.questions.set(question.id, question);
    this.answerKeys.set(question.id, correctAnswer);
  }

  /**
   * Retrieves a question by ID (with full answers for grading on server).
   */
  public getQuestion(id: string): AssessmentQuestion | undefined {
    return this.questions.get(id);
  }

  /**
   * Retrieves the secure answer key for a question.
   */
  public getAnswerKey(id: string): any | undefined {
    return this.answerKeys.get(id);
  }

  /**
   * Converts a full question into a secure client-facing PublicQuestion (stripping answers and keys).
   */
  public toPublicQuestion(question: AssessmentQuestion): PublicQuestion {
    return {
      id: question.id,
      difficulty: question.difficulty,
      type: question.type,
      promptKu: question.promptKu,
      promptAr: question.promptAr,
      promptEn: question.promptEn,
      options: question.options ? question.options.map(opt => ({
        id: opt.id,
        textKu: opt.textKu,
        textAr: opt.textAr,
        textEn: opt.textEn
      })) : undefined,
      estimatedDurationSeconds: question.estimatedDurationSeconds,
      conceptId: question.conceptId,
      skillId: question.skillId,
      lessonId: question.lessonId
    };
  }

  /**
   * Queries questions from the bank.
   */
  public queryQuestions(filter: QuestionBankFilter): AssessmentQuestion[] {
    return Array.from(this.questions.values()).filter(q => {
      if (filter.curriculumId && q.curriculumId !== filter.curriculumId) return false;
      if (filter.unitId && q.unitId !== filter.unitId) return false;
      if (filter.lessonId && q.lessonId !== filter.lessonId) return false;
      if (filter.conceptId && q.conceptId !== filter.conceptId) return false;
      if (filter.skillId && q.skillId !== filter.skillId) return false;
      if (filter.difficulty && q.difficulty !== filter.difficulty) return false;
      if (filter.type && q.type !== filter.type) return false;
      
      // Ensure only validated/curated questions are returned (no rejected ones)
      if (q.generationMetadata && q.generationMetadata.reviewStatus === GenerationReviewStatus.REJECTED) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Seeds highly polished, original Kurdistan-curriculum matched questions for Grade 9 Math Algebra.
   */
  private seedCuratedQuestions(): void {
    const l1_id = "g9-math-algebra-l1"; // Variables and expressions
    const l2_id = "g9-math-algebra-l2"; // Simple linear equations

    // Q1: MCQ Single (Variables and Expressions - Easy)
    const q1: AssessmentQuestion = {
      id: "q_alg_l1_01",
      source: QuestionSource.ZANA_ORIGINAL,
      licenseId: "ZANA-OWNED-2026",
      curriculumId: "curriculum-zana-default",
      unitId: "foundations-of-algebra",
      lessonId: l1_id,
      conceptId: "گۆڕدراو",
      difficulty: DifficultyLevel.EASY,
      type: QuestionType.MULTIPLE_CHOICE_SINGLE,
      promptKu: "کامیان بریتییە لە پێناسەی دروستی 'گۆڕدراو' لە بیرکاریدا؟",
      promptEn: "Which of the following is the correct definition of a 'variable' in mathematics?",
      options: [
        { id: "opt_a", textKu: "پیتێک یان هێمایەک کە گوزارشت لە بەهایەکی نەزانراو یان گۆڕاو دەکات." },
        { id: "opt_b", textKu: "ژمارەیەکی دیاریکراو کە هەرگیز بەهاکەی ناگۆڕێت وەک ٥ یان ١٠." },
        { id: "opt_c", textKu: "نیشانەی یەکسانبوون کە هاوکێشەیەک دابەش دەکات بۆ دوو لایەن." },
        { id: "opt_d", textKu: "کردارێکی جەبری وەک کۆکردنەوە یان لێدەرکردن." }
      ],
      explanationKu: "گۆڕدراو (Variable) هێمایەک یان پیتێکە (وەک x یان y) کە بۆ نیشاندانی بەهایەک بەکاردێت کە دەکرێت بگۆڕێت یان نەزانراو بێت.",
      estimatedDurationSeconds: 45,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.addQuestion(q1, { singleOptionId: "opt_a" });

    // Q2: MCQ Single (Variables and Expressions - Standard)
    const q2: AssessmentQuestion = {
      id: "q_alg_l1_02",
      source: QuestionSource.ZANA_ORIGINAL,
      licenseId: "ZANA-OWNED-2026",
      curriculumId: "curriculum-zana-default",
      unitId: "foundations-of-algebra",
      lessonId: l1_id,
      conceptId: "دەربڕینی جەبری",
      difficulty: DifficultyLevel.STANDARD,
      type: QuestionType.MULTIPLE_CHOICE_SINGLE,
      promptKu: "دەربڕینی زمانی 'سێ ئەوەندەی ژمارەیەک کۆی پێنج' بە چ شێوەیەکی جەبری دەنووسرێت؟",
      promptEn: "How is the verbal phrase 'three times a number plus five' written algebraically?",
      options: [
        { id: "opt_a", textKu: "3x - 5" },
        { id: "opt_b", textKu: "3x + 5" },
        { id: "opt_c", textKu: "x + 15" },
        { id: "opt_d", textKu: "3(x + 5)" }
      ],
      explanationKu: "سێ ئەوەندەی ژمارەیەک واتە 3x، کۆی پێنج واتە + 5، بۆیە دەربڕینی ڕاست بریتییە لە 3x + 5. ئاگاداربە 3(x+5) واتە سێ ئەوەندەی کۆی ژمارەیەک و پێنج.",
      estimatedDurationSeconds: 60,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.addQuestion(q2, { singleOptionId: "opt_b" });

    // Q3: True/False (Linear Equations - Easy)
    const q3: AssessmentQuestion = {
      id: "q_alg_l2_01",
      source: QuestionSource.ZANA_ORIGINAL,
      licenseId: "ZANA-OWNED-2026",
      curriculumId: "curriculum-zana-default",
      unitId: "foundations-of-algebra",
      lessonId: l2_id,
      conceptId: "هاوکێشە",
      difficulty: DifficultyLevel.EASY,
      type: QuestionType.TRUE_FALSE,
      promptKu: "جیاوازی سەرەکی نێوان 'دەربڕینی جەبری' و 'هاوکێشە' ئەوەیە کە هاوکێشە نیشانەی یەکسانبوونی (=) تێدایە.",
      promptEn: "The main difference between an 'algebraic expression' and an 'equation' is that an equation contains an equal sign (=).",
      explanationKu: "ئەمە ڕاستە. دەربڕینی جەبری (وەک 2x + 3) هیچ نیشانەیەکی یەکسانی تێدا نییە، لە کاتێکدا هاوکێشە (وەک 2x + 3 = 7) هەمیشە لایەنی ڕاست و چەپی یەکسانی هەیە.",
      estimatedDurationSeconds: 30,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.addQuestion(q3, { trueFalseValue: true });

    // Q4: Numeric (Linear Equations - Standard)
    const q4: AssessmentQuestion = {
      id: "q_alg_l2_02",
      source: QuestionSource.ZANA_ORIGINAL,
      licenseId: "ZANA-OWNED-2026",
      curriculumId: "curriculum-zana-default",
      unitId: "foundations-of-algebra",
      lessonId: l2_id,
      conceptId: "شیکار",
      difficulty: DifficultyLevel.STANDARD,
      type: QuestionType.NUMERIC,
      promptKu: "هاوکێشەی بەرامبەر شیکار بکە و بەهای x بنووسە:  2x - 4 = 10",
      promptEn: "Solve the equation for x: 2x - 4 = 10",
      explanationKu: "بۆ شیکارکردنی: \n1. سەرەتا ژمارە ٤ کۆ دەکەینەوە بۆ هەردوو لایەن: 2x = 10 + 4 => 2x = 14.\n2. پاشان دابەشی ٢ی دەکەین: x = 7.",
      estimatedDurationSeconds: 90,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.addQuestion(q4, { numericValue: 7, numericTolerance: 0 });

    // Q5: Short Answer (Linear Equations - Challenging)
    const q5: AssessmentQuestion = {
      id: "q_alg_l2_03",
      source: QuestionSource.ZANA_ORIGINAL,
      licenseId: "ZANA-OWNED-2026",
      curriculumId: "curriculum-zana-default",
      unitId: "foundations-of-algebra",
      lessonId: l2_id,
      conceptId: "هاوسەنگی",
      difficulty: DifficultyLevel.CHALLENGING,
      type: QuestionType.SHORT_ANSWER,
      promptKu: "بۆ شیکارکردنی هاوکێشەی  x + 8 = 15 ، چ کردارێکی بیرکاری لەسەر هەردوو لایەنی هاوکێشەکە ئەنجام دەدەیت تاوەکو x تەنها بمێنێتەوە؟",
      promptEn: "To solve the equation x + 8 = 15, what mathematical operation do you perform on both sides of the equation to isolate x?",
      explanationKu: "کرداری پێچەوانەی کۆکردنەوە بریتییە لە لێدەرکردن (دەرکردن یان کەمکردنەوە). بۆیە پێویستە ژمارە ٨ لە هەردوو لایەن کەم بکەینەوە (یان لێدەر بکەین).",
      estimatedDurationSeconds: 75,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.addQuestion(q5, { shortAnswerPatterns: ["لێدەرکردن", "کەمکردنەوە", "کەمکردنەوەی ٨", "لێدەرکردنی ٨", "subtract", "subtraction", "minus 8", "subtract 8"] });

    // Q6: MCQ Single with Misconception signatures (Sign flip on simple math - Challenging)
    const q6: AssessmentQuestion = {
      id: "q_alg_l2_04",
      source: QuestionSource.ZANA_ORIGINAL,
      licenseId: "ZANA-OWNED-2026",
      curriculumId: "curriculum-zana-default",
      unitId: "foundations-of-algebra",
      lessonId: l2_id,
      conceptId: "شیکار",
      difficulty: DifficultyLevel.CHALLENGING,
      type: QuestionType.MULTIPLE_CHOICE_SINGLE,
      promptKu: "بەهای x بدۆزەوە لە هاوکێشەی:  x - 7 = -12",
      promptEn: "Find the value of x in the equation: x - 7 = -12",
      options: [
        { id: "opt_correct", textKu: "x = -5" },
        { id: "opt_sign_error", textKu: "x = -19" },
        { id: "opt_add_error", textKu: "x = 5" },
        { id: "opt_mult_error", textKu: "x = 19" }
      ],
      misconceptionSignatures: [
        { optionId: "opt_sign_error", misconceptionId: "misc_sign_flip" },
        { optionId: "opt_add_error", misconceptionId: "misc_sign_flip" }
      ],
      explanationKu: "شیکارکردن: \nx = -12 + 7\nبەهۆی ئەوەی نیشانەکانیان جیاوازە، ژمارەکان کەم دەکەینەوە و نیشانەی گەورەکەیان دادەنێین (کە ١٢یە و نەرێنییە).\nx = -5.\nخوێندکارانی تووشبوو بە هەڵەی هێما لەوانەیە -12 و -7 کۆبکەنەوە یان گۆڕینی هێمایان بە هەڵە ئەنجام دابێت.",
      estimatedDurationSeconds: 90,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.addQuestion(q6, { singleOptionId: "opt_correct" });

    // Q7: MCQ Single (Substitution - Standard)
    const q7: AssessmentQuestion = {
      id: "q_alg_l1_03",
      source: QuestionSource.ZANA_ORIGINAL,
      licenseId: "ZANA-OWNED-2026",
      curriculumId: "curriculum-zana-default",
      unitId: "foundations-of-algebra",
      lessonId: l1_id,
      conceptId: "جێگرتنەوە",
      difficulty: DifficultyLevel.STANDARD,
      type: QuestionType.MULTIPLE_CHOICE_SINGLE,
      promptKu: "بەهای دەربڕینی جەبری 3x + 2y بدۆزەرەوە ئەگەر x = 4 و y = 3 بێت.",
      promptEn: "Find the value of the algebraic expression 3x + 2y if x = 4 and y = 3.",
      options: [
        { id: "opt_a", textKu: "14" },
        { id: "opt_b", textKu: "18" },
        { id: "opt_c", textKu: "20" },
        { id: "opt_d", textKu: "12" }
      ],
      explanationKu: "بۆ جێگرتنەوەی بەهاکان: 3(4) + 2(3) = 12 + 6 = 18.",
      estimatedDurationSeconds: 60,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.addQuestion(q7, { singleOptionId: "opt_b" });

    // Q8: MCQ Single (Checking solutions - Standard)
    const q8: AssessmentQuestion = {
      id: "q_alg_l2_05",
      source: QuestionSource.ZANA_ORIGINAL,
      licenseId: "ZANA-OWNED-2026",
      curriculumId: "curriculum-zana-default",
      unitId: "foundations-of-algebra",
      lessonId: l2_id,
      conceptId: "پشکنین",
      difficulty: DifficultyLevel.STANDARD,
      type: QuestionType.MULTIPLE_CHOICE_SINGLE,
      promptKu: "بۆ پشکنینی ڕاستی شیکاری هاوکێشەی 4x - 3 = 13، ئەگەر x = 4 بێت، ئایا ئەم شیکارە دروستە؟",
      promptEn: "To check the correct solution of the equation 4x - 3 = 13, if x = 4, is this solution correct?",
      options: [
        { id: "opt_a", textKu: "بەڵێ، چونکە 4(4) - 3 = 16 - 3 = 13 کە یەکسانە بۆ هەردوو لایەن." },
        { id: "opt_b", textKu: "نەخێر، چونکە لایەنی چەپ دەبێتە ١٢." },
        { id: "opt_c", textKu: "بەڵێ، بەڵام x دەبێت بەهای تری هەبێت." },
        { id: "opt_d", textKu: "نەخێر، چونکە شیکارەکە دروست نییە." }
      ],
      explanationKu: "بە جێگیرکردنی x = 4 لە لایەنی چەپ: 4(4) - 3 = 16 - 3 = 13، کە یەکسانە بە لایەنی ڕاست (13). بۆیە شیکارەکە دروستە.",
      estimatedDurationSeconds: 60,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.addQuestion(q8, { singleOptionId: "opt_a" });
  }
}
