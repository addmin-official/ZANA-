import { LearningRecommendation, WeaknessState, ConceptMastery, RecommendationType } from "./types.ts";

export class RecommendationEngine {
  private recommendations: LearningRecommendation[] = [];

  public getSnapshot(): LearningRecommendation[] {
    return [...this.recommendations];
  }

  public generateRecommendations(
    weaknessState: WeaknessState,
    masteryMap: Record<string, ConceptMastery>,
    activeSubject: string
  ): LearningRecommendation[] {
    const list: LearningRecommendation[] = [];
    const nowStr = new Date().toISOString();

    // 1. Analyze critical concept weaknesses first (wrongAttemptsCount >= 3)
    const criticalWeaknesses = Object.values(weaknessState.conceptWeaknesses)
      .filter((w) => w.wrongAttemptsCount >= 2);

    for (const w of criticalWeaknesses) {
      list.push({
        id: `rec_weak_${w.conceptId}_${Date.now()}`,
        type: "ReviewConcept",
        titleKu: "پێداچوونەوەی چڕ بۆ لاوازییەکان",
        descriptionKu: `ئاستت لە تێگەیشتنی چەمکی گرنگ پاشەکشەی کردووە. پێویستە بابەتەکە بخوێنیتەوە و پرسیارەکانی دووبارە بکەیتەوە.`,
        priority: "high",
        targetNodeId: w.conceptId,
        generatedAt: nowStr
      });
    }

    // 2. Recommend practicing active concepts that are currently in "Learning" or "Practicing" phase
    const practiceNeeded = Object.values(masteryMap)
      .filter((m) => m.status === "Learning" || m.status === "Practicing" || m.status === "Review Needed");

    for (const m of practiceNeeded) {
      let title = "ڕاهێنانی زیاتری چەمک";
      let desc = "بۆ گەیشتن بە ئاستی نایاب و لێهاتوویی تەواو، چەند پرسیارێکی ڕاهێنان ئەنجام بدە.";
      let type: RecommendationType = "PracticeTopic";

      if (m.status === "Review Needed") {
        title = "پێداچوونەوەی دوێنێ یان ڕابردوو";
        desc = "چەمکە کۆنەکان لە بیر مەکە! کاتێکی کەم تەرخان بکە بۆ دووبارەکردنەوەی ئەم بابەتە.";
        type = "ReviewYesterday";
      }

      list.push({
        id: `rec_mast_${m.conceptId}_${Date.now()}`,
        type,
        titleKu: title,
        descriptionKu: desc,
        priority: m.status === "Review Needed" ? "high" : "medium",
        targetNodeId: m.conceptId,
        generatedAt: nowStr
      });
    }

    // 3. Fallback / Default recommendation if list is too small
    if (list.length === 0) {
      list.push({
        id: `rec_default_${Date.now()}`,
        type: "ContinueChapter",
        titleKu: "بەردەوامبوون لە بەشی چالاک",
        descriptionKu: "تۆ زۆر بە باشی هەنگاو دەنێیت! بڕۆ لاپەڕەی بابەتەکان و وانەی داهاتوو دەست پێ بکە بۆ پاراستنی ڕیتمەکەت.",
        priority: "medium",
        targetNodeId: activeSubject === "math" ? "ch_calculus" : "ch_mechanics",
        generatedAt: nowStr
      });
      list.push({
        id: `rec_quiz_${Date.now()}`,
        type: "TakeMiniQuiz",
        titleKu: "ئەنجامدانی کورتە تاقیکردنەوە",
        descriptionKu: "ئاستی خۆت لەم بابەتانەی ئەم دواییە تاقی بکەرەوە بە کورتە تاقیکردنەوەیەکی ٥ پرسیاری خێرا.",
        priority: "low",
        targetNodeId: activeSubject,
        generatedAt: nowStr
      });
    }

    // Sort by priority (high > medium > low) and slice to top 3
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    this.recommendations = list
      .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority])
      .slice(0, 3);

    return [...this.recommendations];
  }
}
