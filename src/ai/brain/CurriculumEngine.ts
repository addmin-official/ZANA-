import { CurriculumContext, SubjectKey } from "../types/aiBrain.ts";

export interface CurriculumResolutionInput {
  grade: string;
  subject: SubjectKey;
  topicQuery?: string;
}

export class CurriculumEngine {
  // A clean Kurdish high-school level curriculum mapping for grades 9-12
  private curriculumDatabase: Record<string, Record<SubjectKey, string[]>> = {
    "9": {
      math: ["هاوکێشە هێڵییەکان", "ئەندازەی سادە", "شیکارکردنی هاوکێشەی دووجا"],
      physics: ["جووڵە و هێز", "فشار لە شلەکاندا", "کار و وزە"],
      chemistry: ["پێکهاتەی گەردیلە", "خشتەی خولی", "بەندە کیمیایییەکان"],
      english: ["Present Simple & Continuous", "Past Simple", "Comparative Adjectives"]
    },
    "10": {
      math: ["نەخشە ڕێژەیییەکان", "پەیوەندییە سێگۆشەیییەکان", "ئەندازەی تەختایی"],
      physics: ["میکانیکی کلاسیکی", "بەرگری کارەبایی", "خێرایی و تاودان"],
      chemistry: ["کیمیای ئەندامی سەرەتایی", "هاوسەنگی کیمیایی", "غازەکان"],
      english: ["Present Perfect", "Modals of Ability", "Relative Clauses"]
    },
    "11": {
      math: ["نەخشەی لۆگاریتمی و توانی", "هاوکێشەی بازنە", "ماتریکسەکان"],
      physics: ["موگناتیس", "شەپۆلەکان", "دینامیکی گەرمی"],
      chemistry: ["کیمیای گەرمی", "ترشەکان و تفتەکان سەرەتایی", "خێرایی کارلێکی کیمیایی"],
      english: ["Past Perfect", "Reported Speech", "Passive Voice"]
    },
    "12": {
      math: ["گرتە (داتاشراو)", "تەواوکاری (ئەمپێڕال)", "شیکاری نەخشەکان"],
      physics: ["کارەبای موگناتیسی", "فیزیا نوێ", "تیۆری ڕێژەیی سادە"],
      chemistry: ["کیمیای کارەبایی", "ترش و تفتە پێشکەوتووەکان", "تێکەڵەی کیمیایی و هایدرۆکاربۆنەکان"],
      english: ["Conditional Sentences (Type 0-3)", "Wish Clauses", "Phrasal Verbs & Collocations"]
    }
  };

  /**
   * Resolves the active curriculum context based on grade, subject, and student text input.
   * Exposes: resolveCurriculumContext(input)
   */
  public resolveCurriculumContext(input: CurriculumResolutionInput): CurriculumContext {
    const { grade, subject, topicQuery } = input;
    const gradeDb = this.curriculumDatabase[grade] || this.curriculumDatabase["12"];
    const topics = gradeDb[subject] || [];

    let matchedTopic = "وانەی گشتی";
    let matchedChapter = "بەشی سەرەکی";
    let warnings: string[] = [];
    let isWithinScope = true;

    if (topicQuery) {
      const query = topicQuery.toLowerCase();
      
      // Attempt heuristic keyword matching
      let found = false;
      for (const t of topics) {
        if (query.includes(t.toLowerCase()) || t.toLowerCase().includes(query)) {
          matchedTopic = t;
          found = true;
          break;
        }
      }

      if (!found) {
        // Broad validation of subjects to trigger out-of-scope warnings
        const generalOutofScopeAlerts = [
          "زانکۆ", "ماستەر", "تێزی کۆلێژ", "university level", "advanced thesis",
          "کۆدکردن", "بەرنامەسازی", "جاڤاسکریپت", "پایتۆن", "coding", "programming"
        ];
        
        const isAdvancedAcademic = generalOutofScopeAlerts.some(term => query.includes(term));
        if (isAdvancedAcademic) {
          isWithinScope = false;
          warnings.push("ئەم بابەتە ئاستێکی زۆر پێشکەوتووی زانکۆییە و لە دەرەوەی پرۆگرامی پۆلەکانی (٩-١٢)ی وەزارەتی پەروەردەیە.");
        }
      }
    }

    return {
      grade,
      subject,
      chapter: matchedChapter,
      lesson: "وانەی پەیوەندیدار",
      topic: matchedTopic,
      warnings: warnings.length > 0 ? warnings : undefined,
      isWithinScope
    };
  }
}
