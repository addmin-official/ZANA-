export interface RecommendationResult {
  nextAction:
    | "continue_learning"
    | "review_weakness"
    | "practice_more"
    | "advance_next_lesson";
  message: string;
  parentSummary: string;
  suggestedMode: "learn" | "practice" | "review";
}

/**
 * AssessmentRecommendationEngine: Generates high-quality pedagogical recommendations
 * and reports for students and parents in elegant Kurdish Sorani.
 */
export function generateAssessmentRecommendation(scorePercentage: number): RecommendationResult {
  if (scorePercentage < 50) {
    return {
      nextAction: "review_weakness",
      suggestedMode: "review",
      message: "ئاستت لەم بابەتەدا پێویستی بە کەمێک پێداچوونەوە و پاڵپشتی هەیە. مامۆستا زانا یارمەتیت دەدات بۆ تێگەیشتن لە چەمکە لاوازەکان بۆ ئەوەی لە داهاتوودا نمرەی بەرزتر بەدەستبهێنیت!",
      parentSummary: "منداڵەکەتان لە بەدەستهێنانی تێگەیشتنی بنەڕەتی بۆ ئەم چەمکانە پێویستی بە هاوکاری زیاترە. پێشنیاری پێداچوونەوەی سەرلەنوێ دەکەین بۆ بەهێزکردنی بناغەی زانستییان پێش چوونە پێشەوە.",
    };
  } else if (scorePercentage < 80) {
    return {
      nextAction: "practice_more",
      suggestedMode: "practice",
      message: "ئاستێکی زۆر باشە! لە چەمکە سەرەکییەکان تێگەیشتوویت، بەڵام بۆ جێگیربوونی زانیارییەکان و بەرزکردنەوەی نمرەکانت هێشتا پێویستت بە مەشق و ڕاهێنانی زیاتر هەیە.",
      parentSummary: "ئاستی منداڵەکەتان زۆر دڵخۆشکەرە و تێگەیشتنی باشیان هەیە. بەردەوامبوون لە چارەسەرکردنی پرسیاری زیاتر یارمەتی متمانەبەخۆبوونی تەواویان دەدات لە تاقیکردنەوەکاندا.",
    };
  } else {
    return {
      nextAction: "advance_next_lesson",
      suggestedMode: "learn",
      message: "بێوێنەیە! متمانە و لێهاتووییەکی زۆر بەرزت لەم وانەیەدا پێشاندا. تۆ بە تەواوی ئامادەیت بۆ دەستپێکردنی بابەت و وانەی نوێی داهاتوو.",
      parentSummary: "منداڵەکەتان نمرەیەکی نایاب و نیشانەی زیرەکی و ئامادەیی بەرز پیشاندا لەم هەڵسەنگاندنەدا. هیچ خاڵێکی لاوازی نییە و بە تەواوی ئامادەیە بچێتە پۆل یان بەشی نوێ.",
    };
  }
}
