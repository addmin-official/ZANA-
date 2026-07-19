import {
  ConceptMasteryState,
  MasteryStatus,
  MisconceptionState,
  AdaptiveRecommendation,
  RecommendationType,
  ExerciseAttempt,
  StudentMasteryProfile
} from "../domain/MasteryTypes.ts";
import { Concept, CurriculumLesson } from "../../curriculum/domain/CurriculumTypes.ts";
import { CurriculumRegistry } from "../../curriculum/registry/CurriculumRegistry.ts";

export class AdaptiveLearningEngine {
  /**
   * Calculate a new mastery state based on the previous state and an exercise attempt.
   * Employs progressive difficulty-weighted scoring with consecutive response multipliers.
   */
  public static calculateNewMastery(
    previous: ConceptMasteryState | null,
    attempt: { isCorrect: boolean; responseTimeMs: number; difficulty: number }
  ): ConceptMasteryState {
    const conceptId = previous?.conceptId || "unknown";
    const history = previous?.history ? [...previous.history] : [];
    
    // Limit history length for performance
    history.push({
      isCorrect: attempt.isCorrect,
      timestamp: new Date().toISOString(),
      responseTimeMs: attempt.responseTimeMs,
      difficulty: attempt.difficulty
    });
    if (history.length > 50) {
      history.shift();
    }

    const totalAttempts = (previous?.totalAttempts || 0) + 1;
    let consecutiveCorrect = previous?.consecutiveCorrect || 0;

    if (attempt.isCorrect) {
      consecutiveCorrect += 1;
    } else {
      consecutiveCorrect = 0;
    }

    let prevScore = previous?.masteryScore !== undefined ? previous.masteryScore : 0.0;
    let newScore = prevScore;

    // Base difficulty weights: Easy = 1.0, Medium = 1.5, Hard = 2.0
    const diffWeight = attempt.difficulty === 3 ? 2.0 : attempt.difficulty === 2 ? 1.5 : 1.0;
    
    // Time modifier: reward faster correct answers slightly, do not penalize slow ones excessively
    const timeModifier = attempt.isCorrect && attempt.responseTimeMs < 8000 ? 1.1 : 1.0;

    if (attempt.isCorrect) {
      // Progressive gain weighted by difficulty, streak, and speed
      const baseGain = 0.12 * diffWeight * timeModifier;
      const streakMultiplier = 1 + (Math.min(consecutiveCorrect, 5) * 0.05); // max 25% bonus for streaks
      newScore = Math.min(1.0, Number((prevScore + (baseGain * streakMultiplier)).toFixed(3)));
    } else {
      // Progressive decay weighted by difficulty (getting hard questions wrong decays less)
      const baseDecay = 0.15 / diffWeight;
      newScore = Math.max(0.0, Number((prevScore - baseDecay).toFixed(3)));
    }

    // Determine Status
    let status = MasteryStatus.NOT_STARTED;
    if (newScore === 0.0) {
      status = MasteryStatus.NOT_STARTED;
    } else if (newScore < 0.25) {
      status = MasteryStatus.INTRODUCED;
    } else if (newScore < 0.6) {
      status = MasteryStatus.DEVELOPING;
    } else if (newScore < 0.85) {
      status = MasteryStatus.PROFICIENT;
    } else {
      status = MasteryStatus.MASTERED;
    }

    // If previously Mastered/Proficient but dropped below 0.70 due to a wrong attempt, flag as Review Needed
    if (!attempt.isCorrect && previous && (previous.status === MasteryStatus.MASTERED || previous.status === MasteryStatus.PROFICIENT) && newScore < 0.75) {
      status = MasteryStatus.NEEDS_REVIEW;
    }

    return {
      conceptId,
      masteryScore: newScore,
      status,
      consecutiveCorrect,
      totalAttempts,
      lastAttemptedAt: new Date().toISOString(),
      history
    };
  }

  /**
   * Detect recurring misconceptions based on consecutive wrong answers and response content.
   */
  public static detectMisconception(
    attempt: ExerciseAttempt,
    currentMisconceptions: MisconceptionState[]
  ): MisconceptionState | null {
    // 1. Textual trigger parsing (checking common Kurdish math/science mistakes)
    let detectedId: string | null = null;
    let nameKu = "";

    const ans = attempt.studentResponse.trim().toLowerCase();
    const qText = attempt.questionText.trim().toLowerCase();

    // Check common algebraic sign flip misconception
    if (!attempt.isCorrect && (ans.includes("-") || ans.includes("+")) && qText.includes("هاوکێشە")) {
      detectedId = "misc_sign_flip";
      nameKu = "هەڵەی پێچەوانەکردنەوەی هێما لە گواستنەوەدا (Sign Flip)";
    } 
    // Check common division instead of multiplication misconception
    else if (!attempt.isCorrect && (ans.includes("/") || ans.includes("دابەش")) && qText.includes("جاران")) {
      detectedId = "misc_op_inverse";
      nameKu = "هەڵە تێکەڵکردنی کرداری لێکدان و دابەشکردنی پێچەوانە";
    }

    // 2. Fallback to repeated misconception if 3 wrong attempts on same concept happen
    if (!detectedId && !attempt.isCorrect && attempt.misconceptionDetected) {
      detectedId = "misc_" + attempt.conceptId;
      nameKu = attempt.misconceptionDetected;
    }

    if (detectedId) {
      const existing = currentMisconceptions.find(m => m.misconceptionId === detectedId && m.resolvedAt === null);
      if (existing) {
        return {
          ...existing,
          count: existing.count + 1,
          detectedAt: new Date().toISOString()
        };
      } else {
        return {
          conceptId: attempt.conceptId,
          misconceptionId: detectedId,
          nameKu,
          count: 1,
          detectedAt: new Date().toISOString(),
          resolvedAt: null
        };
      }
    }

    return null;
  }

  /**
   * Determine adaptation difficulty for the next exercise (1 = Easy, 2 = Medium, 3 = Hard).
   */
  public static adaptDifficulty(conceptId: string, history: { isCorrect: boolean }[]): number {
    if (history.length === 0) return 1; // default to Easy
    
    const recent = history.slice(-4); // last 4 attempts
    const correctCount = recent.filter(h => h.isCorrect).length;

    if (correctCount === recent.length && recent.length >= 3) {
      return 3; // Hard: mastered recent ones
    } else if (correctCount >= 2) {
      return 2; // Medium: doing fine
    } else {
      return 1; // Easy: struggling, reduce difficulty
    }
  }

  /**
   * Perform prerequisite checks and cycle prevention.
   * If concept A requires B, and B requires A, there is a cycle.
   */
  public static hasPrerequisiteCycle(
    prereqMap: Record<string, string[]>,
    startId: string
  ): boolean {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    function dfs(node: string): boolean {
      if (recStack.has(node)) return true; // cycle detected
      if (visited.has(node)) return false;

      visited.add(node);
      recStack.add(node);

      const neighbors = prereqMap[node] || [];
      for (const neighbor of neighbors) {
        if (dfs(neighbor)) return true;
      }

      recStack.delete(node);
      return false;
    }

    return dfs(startId);
  }

  /**
   * Generate highly personalized adaptive learning recommendations in Kurdish with pedagogical reasons.
   */
  public static generateRecommendation(
    studentId: string,
    conceptId: string,
    conceptTitleKu: string,
    profile: StudentMasteryProfile,
    prerequisites: string[] = []
  ): AdaptiveRecommendation {
    const masteryState = profile.conceptMasteries[conceptId];
    const score = masteryState?.masteryScore || 0.0;
    const status = masteryState?.status || MasteryStatus.NOT_STARTED;

    let type: RecommendationType = "PRACTICE_DRILL";
    let priority: "high" | "medium" | "low" = "medium";
    let titleKu = "";
    let explanationKu = "";
    let reasoningKu = "";

    // 1. Inspect Prerequisite Mastery first if prerequisites exist
    let weakPrereqId: string | null = null;
    for (const prereqId of prerequisites) {
      const pState = profile.conceptMasteries[prereqId];
      if (!pState || pState.masteryScore < 0.5) {
        weakPrereqId = prereqId;
        break;
      }
    }

    if (weakPrereqId && score < 0.6) {
      // Prerequisite review is recommended due to evidence of poor prerequisite mastery
      type = "PREREQUISITE_REVIEW";
      priority = "high";
      titleKu = `پێداچوونەوە بە پێویستیی یەکەم: فێربوونی چەمکی فۆندامێنتال`;
      explanationKu = `سەرەتا پێویستە پێداچوونەوە بە چەمکی بنەڕەتیی "${weakPrereqId}" بکەیت پێش ئەوەی بەردەوام بیت لەسەر "${conceptTitleKu}"، چونکە تێگەیشتن لەم بابەتە نوێیە پێویستی بە جێگیربوونی زانیارییە بنەڕەتییەکەیە.`;
      reasoningKu = `قوتابی لە چەمکی داهاتوودا تووشی کێشە بووە چونکە چەمکی بنچینەیی پێشینەی بە تەواوی جێگیر نەکردووە. پێشنیار کراوە بگەڕێتەوە بۆ بەهێزکردنی بابەتە بنەڕەتییەکە.`;
    } 
    // 2. Active Misconception Remedial Explanation
    else if (profile.activeMisconceptions.some(m => m.conceptId === conceptId && m.resolvedAt === null)) {
      const activeMisc = profile.activeMisconceptions.find(m => m.conceptId === conceptId && m.resolvedAt === null)!;
      type = "REMEDIAL_EXPLANATION";
      priority = "high";
      titleKu = `ڕوونکردنەوەی چارەسەری بۆ: ${activeMisc.nameKu}`;
      explanationKu = `تێبینی دەکەین کە لە کاتی کارکردن لەسەر "${conceptTitleKu}" هەڵەیەکی دووبارەبووەوەت هەیە دەربارەی: "${activeMisc.nameKu}". وەرە با پێکەوە ئەم ڕوونکردنەوە تایبەتە و نموونە سادەیە بخوێنینەوە بۆ چارەسەرکردنی ئەم لێکتێنەگەیشتنە.`;
      reasoningKu = `ئامێری ناسینەوەی تێنەگەیشتنەکان (Misconception Engine) چاودێری هەڵەیەکی دووبارەبووەوەی کردووە. بۆیە پێویستە فێربوونێکی چارەسەری (Remedial) پێشکەش بکرێت نەک تەنها ڕاهێنان.`;
    }
    // 3. Spaced Repetition or Needs Review
    else if (status === MasteryStatus.NEEDS_REVIEW) {
      type = "PREREQUISITE_REVIEW";
      priority = "high";
      titleKu = `پێداچوونەوەی ناوە بە ناوە (Spaced Repetition): ${conceptTitleKu}`;
      explanationKu = `پێشتر ئەم بابەتەت بە تەواوی خوێندبوو، بەڵام بۆ ئەوەی لە بیرت نەچێتەوە، کاتی ئەوە هاتووە پێداچوونەوەیەکی خێرا و ڕاهێنانێکی نوێی لەسەر بکەیتەوە.`;
      reasoningKu = `سیستەمی دووبارەکردنەوەی کاتی مێژوویی (Spaced Repetition) دەستنیشانی کردووە کە کاتی بیرهێنانەوەیە بۆ پاراستنی هەمیشەیی بابەتەکە لە مێشکدا.`;
    }
    // 4. Low score: Remedial Explanation
    else if (score < 0.4) {
      type = "REMEDIAL_EXPLANATION";
      priority = "medium";
      titleKu = `خوێندنی وانەی ڕوونکردنەوەی: ${conceptTitleKu}`;
      explanationKu = `پێشنیار دەکەین بابەتەکە لەسەرەتایەوە بە شێوازێکی نوێ و سادە بخوێنیتەوە. زانا ڕوونکردنەوەی ورد و ئاسان پێشکەش دەکات.`;
      reasoningKu = `ئاستی تێگەیشتنی قوتابی لە خوار ٤٠٪ دایە، پێویستە پێش ڕاهێنانی چڕ سەرەتا بنچینە تیۆرییەکە بە تەواوی فێربێت.`;
    }
    // 5. Ready to practice
    else if (score >= 0.4 && score < 0.85) {
      type = "PRACTICE_DRILL";
      priority = "medium";
      titleKu = `ڕاهێنانی چڕ لەسەر چەمکی: ${conceptTitleKu}`;
      explanationKu = `ئێستا متمانەت باشتر بووە! با کەمێک پرسیاری ئاست بەرزتر و فرە-هەڵبژاردن شیکار بکەین بۆ ئەوەی بگەیت بە متمانە و سەرکەوتنی تەواو.`;
      reasoningKu = `قوتابی لە ئاستی Developing/Proficient دایە، پێویستی بە پراکتیزەکردنی بەردەوامە بۆ جێگیرکردنی ئاستی و گەیشتن بە لێهاتوویی تەواو (Mastery).`;
    }
    // 6. Mastered: Advance!
    else {
      type = "ADVANCE_CONCEPT";
      priority = "low";
      titleKu = `پێشڕەوی بۆ بابەتی داهاتوو دوای تەواوکردنی: ${conceptTitleKu}`;
      explanationKu = `پیرۆزە! تۆ متمانە و لێهاتوویی نایابت بەدەستهێنا لەسەر ئەم چەمکە. ئێستا کاتی ئەوەیە بچین بەرەو خوێندنی وانە یان چەمکە نوێیەکانی داهاتوو.`;
      reasoningKu = `قوتابی نمرەی لێهاتوویی سەروو ٨٥٪ی بەدەستهێناوە و متمانەی تەواوە. سیستمەکە پێشنیاری جووڵەی دەکات بۆ بابەتی داهاتوو تا لە خاڵی خۆیدا چەق نەبەستێت.`;
    }

    return {
      id: "rec_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now(),
      studentId,
      conceptId,
      type,
      titleKu,
      explanationKu,
      priority,
      status: "ACTIVE",
      generatedAt: new Date().toISOString(),
      reasoningKu
    };
  }
}
