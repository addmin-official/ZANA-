import { SafetyResult } from "../types/aiBrain.ts";

export class SafetyEngine {
  private blockedKeywords = [
    "crypto", "bitcoin", "blockchain", "ethereum", "dogecoin",
    "politics", "election", "parliament", "government", "وزارەت", "پەرلەمان", "حکومەت", "سیاسەت",
    "casino", "gambling", "poker", "betting", "تۆپی پێی گرەو", "گرەوکردن", "کازینۆ", "قومار",
    "dating", "tinder", "grindr", "romance", "ژوان", "دڵداری", "خۆشەویستی فیزیکی",
    "adult", "porn", "xxx", "sex", "نەشیاو", "سێکس", "ڕووت",
    "hack", "crack", "exploit", "ddos", "هەککردن", "هەک", "تێکدان",
    "suicide", "self-harm", "kill", "خۆکوشتن", "ئازاردانی خۆ", "کوشتن"
  ];

  /**
   * Evaluates if a student's input is safe, educational, and falls within ZANA's educational mission boundaries.
   * Exposes: evaluateStudentRequest(input)
   */
  public evaluateStudentRequest(request: string): SafetyResult {
    const cleaned = request.trim().toLowerCase();

    if (!cleaned) {
      return {
        isEducational: false,
        refusalReason: "empty-request",
        refusalMessage: "تکایە پرسیارەکەت بنووسە بۆ ئەوەی بتوانم یارمەتیت بدەم."
      };
    }

    // Check against blocked keyword database
    for (const kw of this.blockedKeywords) {
      if (cleaned.includes(kw)) {
        return {
          isEducational: false,
          refusalReason: "out-of-scope-or-unsafe",
          refusalMessage: "ببوورە، من تەنها دەتوانم لە بابەتە زانستییەکانی پۆلەکانی (٩-١٢) یارمەتیت بدەم، وەک بیرکاری، فیزیا، کیمیا، و زمانی ئینگلیزی. تکایە پرسیارێکی پەیوەندیدار بە وانەکانت ئاڕاستە بکە."
        };
      }
    }

    // Basic heuristic to check if request is too brief and unrelated to education
    const words = cleaned.split(/\s+/);
    const educationalTerms = [
      "solve", "explain", "formula", "equation", "what is", "how", "math", "physics", "chemistry", "english", "grade",
      "شیکار", "ڕوونبکەرەوە", "یاسا", "هاوکێشە", "چییە", "چۆن", "بیرکاری", "فیزیا", "کیمیا", "ئینگلیزی", "پۆلی",
      "وانە", "تاقیکردنەوە", "هەڵسەنگاندن", "پرسیار", "کێشە", "پێناسە", "مامۆستا", "زانا", "یارمەتی", "دەرئەنجام",
      "سەلماندن", "نەخشە", "گرتە", "تەواوکاری", "ماددە", "گەردیلە", "هێز"
    ];

    // If it is a generic conversation (like greeting), let it pass as educational/safe to maintain conversational flow.
    const greetings = [
      "سڵاو", "باشیت", "چۆنیت", "بەیانیت باش", "ڕۆژت باش", "ئێوارەت باش", "سوپاس", "دەستخۆش",
      "hello", "hi", "hey", "thanks", "thank you", "good morning", "good day"
    ];

    const isGreeting = words.some(w => greetings.some(g => w.includes(g)));
    if (isGreeting) {
      return {
        isEducational: true
      };
    }

    // Otherwise check for educational keywords
    const hasEducationalContext = words.some(w => educationalTerms.some(term => w.includes(term)));
    
    // If the query is long enough, we can treat it as safe unless blocked keywords matched
    if (words.length >= 4 || hasEducationalContext) {
      return {
        isEducational: true
      };
    }

    // Catch short, ambiguous queries that are not greetings or educational terms
    return {
      isEducational: false,
      refusalReason: "ambiguous-non-educational",
      refusalMessage: "ببوورە، پرسیارەکەت ڕوون نییە یان لە دەرەوەی بازنەی خوێندنە. تکایە پرسیارەکەت زیاتر ڕوون بکەرەوە یان پرسیارێکی زانستی بکە تا هاوکاریت بکەم."
    };
  }
}
