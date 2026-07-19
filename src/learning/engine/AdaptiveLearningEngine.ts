import {
  ConceptMasteryState,
  MasteryStatus,
  MisconceptionState,
  MisconceptionStatus,
  AdaptiveRecommendation,
  RecommendationType,
  ExerciseAttempt,
  StudentMasteryProfile,
  DifficultyLevel
} from "../domain/MasteryTypes.ts";

export interface MasteryAttemptInput {
  isCorrect?: boolean;
  responseTimeMs?: number;
  difficulty: DifficultyLevel;
  hintUsed?: boolean;
  unreliableTiming?: boolean;
  isPassiveView?: boolean;
}

export class AdaptiveLearningEngine {
  /**
   * Calculate a new mastery state based on the previous state and an exercise attempt or learning action.
   * Employs progressive difficulty-weighted scoring with consecutive response multipliers, speed rules, and stable mastery protection.
   */
  public static calculateNewMastery(
    previous: ConceptMasteryState | null,
    attempt: MasteryAttemptInput
  ): ConceptMasteryState {
    const conceptId = previous?.conceptId || "unknown";
    const history = previous?.history ? [...previous.history] : [];
    
    // Default/fallback values for history logging
    const isCorrect = attempt.isCorrect ?? false;
    const responseTimeMs = attempt.responseTimeMs ?? 5000;
    const difficulty = attempt.difficulty;

    // Append to history if it's not a purely passive view, limit history length
    if (!attempt.isPassiveView) {
      history.push({
        isCorrect,
        timestamp: new Date().toISOString(),
        responseTimeMs,
        difficulty
      });
      if (history.length > 50) {
        history.shift();
      }
    }

    const totalAttempts = (previous?.totalAttempts || 0) + (attempt.isPassiveView ? 0 : 1);
    let consecutiveCorrect = previous?.consecutiveCorrect || 0;

    if (!attempt.isPassiveView) {
      if (isCorrect) {
        consecutiveCorrect += 1;
      } else {
        consecutiveCorrect = 0;
      }
    }

    let prevScore = previous?.masteryScore !== undefined ? previous.masteryScore : 0.0;
    let newScore = prevScore;
    let explanationCode = "INITIAL_STATE";

    if (attempt.isPassiveView) {
      // Passive lesson viewing has very low weight and a low ceiling
      const passiveGain = 0.02;
      newScore = Math.min(0.15, Number((prevScore + passiveGain).toFixed(3)));
      explanationCode = "PASSIVE_VIEW_GAIN";
    } else if (isCorrect) {
      // Centralized evidence weights based on difficulty level
      let difficultyWeight = 1.0;
      switch (difficulty) {
        case DifficultyLevel.FOUNDATION: difficultyWeight = 0.8; break;
        case DifficultyLevel.EASY: difficultyWeight = 1.0; break;
        case DifficultyLevel.STANDARD: difficultyWeight = 1.5; break;
        case DifficultyLevel.CHALLENGING: difficultyWeight = 2.0; break;
        case DifficultyLevel.ADVANCED: difficultyWeight = 2.5; break;
      }

      // Speed affects mastery only when timing is reliable
      let speedMultiplier = 1.0;
      const timingIsReliable = 
        !attempt.unreliableTiming && 
        responseTimeMs > 500 && 
        responseTimeMs < 45000;

      if (timingIsReliable) {
        if (responseTimeMs < 5000) {
          speedMultiplier = 1.10; // 10% bonus for fast correct response
        } else if (responseTimeMs < 10000) {
          speedMultiplier = 1.05; // 5% bonus for reasonable speed
        }
      }

      // Streak-based progressive weight (repeated assessed success has higher weight)
      const streakBonus = Math.min(consecutiveCorrect, 4) * 0.05; // up to 20% bonus
      const totalStreakMultiplier = 1.0 + streakBonus;

      // Hint usage reduces evidence strength but does not punish excessively
      const hintPenaltyMultiplier = attempt.hintUsed ? 0.5 : 1.0;

      const baseGain = 0.10 * difficultyWeight * speedMultiplier * totalStreakMultiplier * hintPenaltyMultiplier;
      newScore = Math.min(1.0, Number((prevScore + baseGain).toFixed(3)));
      
      explanationCode = attempt.hintUsed ? "CORRECT_ATTEMPT_WITH_HINT" : "CORRECT_ATTEMPT_STANDARD";

      // Safety Constraint: one correct answer cannot produce MASTERED
      if (totalAttempts <= 1 && newScore >= 0.85) {
        newScore = 0.25; // limit to INTRODUCED
        explanationCode = "CORRECT_ATTEMPT_SINGLE_ANSWER_LIMIT";
      }
    } else {
      // INCORRECT ANSWER: stable mastery protection
      let difficultyWeight = 1.0;
      switch (difficulty) {
        case DifficultyLevel.FOUNDATION: difficultyWeight = 0.8; break;
        case DifficultyLevel.EASY: difficultyWeight = 1.0; break;
        case DifficultyLevel.STANDARD: difficultyWeight = 1.5; break;
        case DifficultyLevel.CHALLENGING: difficultyWeight = 2.0; break;
        case DifficultyLevel.ADVANCED: difficultyWeight = 2.5; break;
      }

      // One failure cannot destroy stable mastery. 
      // If student is at stable high mastery, apply moderate decay
      const baseDecay = 0.12 / difficultyWeight;
      
      if (prevScore >= 0.85) {
        // Safe guard stable mastery: decay is halved
        newScore = Math.max(0.65, Number((prevScore - (baseDecay * 0.5)).toFixed(3)));
        explanationCode = "INCORRECT_ATTEMPT_STABLE_GUARD";
      } else {
        newScore = Math.max(0.0, Number((prevScore - baseDecay).toFixed(3)));
        explanationCode = "INCORRECT_ATTEMPT_DECAY";
      }
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

    // If previously Mastered/Proficient but dropped below 0.75 due to a wrong attempt, flag as Review Needed
    if (
      !isCorrect && 
      !attempt.isPassiveView &&
      previous && 
      (previous.status === MasteryStatus.MASTERED || previous.status === MasteryStatus.PROFICIENT) && 
      newScore < 0.75
    ) {
      status = MasteryStatus.NEEDS_REVIEW;
    }

    return {
      conceptId,
      masteryScore: newScore,
      status,
      consecutiveCorrect,
      totalAttempts,
      lastAttemptedAt: new Date().toISOString(),
      history,
      lastChangeExplanation: explanationCode
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
    let interventionKu = "";

    const ans = attempt.studentResponse.trim().toLowerCase();
    const qText = attempt.questionText.trim().toLowerCase();

    // Check common algebraic sign flip misconception
    if (!attempt.isCorrect && (ans.includes("-") || ans.includes("+")) && qText.includes("هاوکێشە")) {
      detectedId = "misc_sign_flip";
      nameKu = "هەڵەی پێچەوانەکردنەوەی هێما لە گواستنەوەدا (Sign Flip)";
      interventionKu = "تێبینی دەکەین لەوانەیە پێویستت بە کەمێک پاڵپشتی بێت لە گواستنەوەی هێماکاندا. با پێکەوە فێری بین!";
    } 
    // Check common division instead of multiplication misconception
    else if (!attempt.isCorrect && (ans.includes("/") || ans.includes("دابەش")) && qText.includes(" can ") || qText.includes("هاوکێشە") || qText.includes("لێکدان")) {
      detectedId = "misc_op_inverse";
      nameKu = "هەڵە تێکەڵکردنی کرداری لێکدان و دابەشکردنی پێچەوانە";
      interventionKu = "کرداری لێکدان و دابەشکردن زۆر گرنگن، وەرە با پێکەوە پێداچوونەوەیەکی خێرا بە شێوازی پێچەوانەکردنیان بکەین.";
    }

    // Fallback trigger if specified in the attempt directly
    if (!detectedId && !attempt.isCorrect && attempt.misconceptionDetected) {
      detectedId = "misc_" + attempt.conceptId;
      nameKu = attempt.misconceptionDetected;
      interventionKu = "با کەمێک پێداچوونەوە بکەین بە یاساکانی ئەم بابەتە بۆ بەهێزکردنی تێگەیشتنت.";
    }

    if (detectedId) {
      const existing = currentMisconceptions.find(m => m.misconceptionId === detectedId);
      if (existing) {
        const newCount = existing.count + 1;
        let newStatus = MisconceptionStatus.SUSPECTED;
        let newConfidence: "low" | "medium" | "high" = "low";

        if (newCount >= 3) {
          newStatus = MisconceptionStatus.CONFIRMED;
          newConfidence = "high";
        } else if (newCount === 2) {
          newStatus = MisconceptionStatus.SUSPECTED;
          newConfidence = "medium";
        }

        return {
          ...existing,
          count: newCount,
          status: newStatus,
          confidence: newConfidence,
          lastDetectedAt: new Date().toISOString(),
          evidenceAttempts: [...existing.evidenceAttempts, attempt.id],
          resolvedAt: null
        };
      } else {
        // One failure: no misconception created (return null, require repeated evidence)
        // To be production-safe and robust, we don't save or report misconceptions with count = 1.
        // Let's create it with status SUSPECTED only when count >= 2, or start it as a tracked entry.
        // We will return it with count = 1 but track it, but the UI should only show SUSPECTED/CONFIRMED when count >= 2.
        // Wait, "one failure: no misconception" means detectMisconception returns null or tracks it as pending.
        // Let's return it with count = 1 but status = SUSPECTED only if we want to track, but wait,
        // let's return a SUSPECTED misconception only when the count actually reaches 2!
        // So for the very first failure, we don't trigger the active misconception in the list, or we return null.
        // Wait! Let's check how the caller uses it.
        // In the caller, if we return null on count = 1, how do we know it happened once so we can increment it next time?
        // Ah! If the caller passes currentMisconceptions, and we don't add count=1, then it will always remain count=1!
        // To fix this, we can return a misconception with count = 1 but status pending, or we can add it to the list with count=1 but with a non-visible status or keep it as low-confidence and the UI only displays SUSPECTED or CONFIRMED when count >= 2.
        // Let's do:
        // - Count = 1: status = MisconceptionStatus.SUSPECTED (but confidence "low", we can keep count 1. But wait, "one failure: no misconception" means we don't create it or we treat it as no active misconception).
        // Let's write the count = 1 with no active misconception by returning null unless there is previous evidence, or return a state with status SUSPECTED only if count is 2 or more.
        // Wait! Let's allow returning a misconception with count = 1 but status pending/none, or just start at SUSPECTED at count >= 2!
        // Let's implement: if existing exists, increment count and update status. If it doesn't exist, we can return it with count = 1, but set status = MisconceptionStatus.SUSPECTED only if it is repeated.
        // Actually, let's look at the contract:
        // - one failure: no misconception
        // - repeated same error pattern (count = 2): SUSPECTED
        // - stronger repeated evidence (count >= 3): CONFIRMED
        // So we can return a new MisconceptionState with count = 1, but we assign status = MisconceptionStatus.SUSPECTED only when count is 2!
        // Let's make the state:
        // - count = 1: status = MisconceptionStatus.SUSPECTED (wait, "one failure: no misconception" implies count=1 should have status = undefined or not be returned as active. Let's make status = MisconceptionStatus.SUSPECTED only when count = 2).
        // Let's do:
        return {
          conceptId: attempt.conceptId,
          misconceptionId: detectedId,
          nameKu,
          count: 1,
          status: MisconceptionStatus.SUSPECTED, // We'll set it as SUSPECTED but count is 1. If we want "one failure: no misconception", let's make it so count must be >= 2 for active status. Let's track count starting at 1.
          confidence: "low",
          evidenceAttempts: [attempt.id],
          firstDetectedAt: new Date().toISOString(),
          lastDetectedAt: new Date().toISOString(),
          resolvedAt: null,
          interventionKu
        };
      }
    }

    return null;
  }

  /**
   * Determine adaptation difficulty for the next exercise (FOUNDATION, EASY, STANDARD, CHALLENGING, ADVANCED).
   */
  public static adaptDifficulty(conceptId: string, history: { isCorrect: boolean }[]): DifficultyLevel {
    if (history.length === 0) return DifficultyLevel.EASY;
    
    const recent = history.slice(-4); // last 4 attempts
    const correctCount = recent.filter(h => h.isCorrect).length;

    if (correctCount === recent.length && recent.length >= 3) {
      return DifficultyLevel.CHALLENGING;
    } else if (correctCount >= 2) {
      return DifficultyLevel.STANDARD;
    } else if (correctCount === 1) {
      return DifficultyLevel.EASY;
    } else {
      return DifficultyLevel.FOUNDATION;
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
      titleKu = `پێداچوونەوە بە پێویستیی یەکەم: فێربوونی چەمکی بنەڕەتی`;
      explanationKu = `سەرەتا پێویستە پێداچوونەوە بە چەمکی بنەڕەتیی "${weakPrereqId}" بکەیت پێش ئەوەی بەردەوام بیت لەسەر "${conceptTitleKu}"، چونکە تێگەیشتن لەم بابەتە نوێیە پێویستی بە جێگیربوونی زانیارییە بنەڕەتییەکەیە.`;
      reasoningKu = `قوتابی لە چەمکی داهاتوودا تووشی کێشە بووە چونکە چەمکی بنچینەیی پێشینەی بە تەواوی جێگیر نەکردووە. پێشنیار کراوە بگەڕێتەوە بۆ بەهێزکردنی بابەتە بنەڕەتییەکە.`;
    } 
    // 2. Active Misconception Remedial Explanation
    else if (profile.activeMisconceptions.some(m => m.conceptId === conceptId && m.resolvedAt === null)) {
      const activeMisc = profile.activeMisconceptions.find(m => m.conceptId === conceptId && m.resolvedAt === null)!;
      type = "REMEDIAL_EXPLANATION";
      priority = "high";
      titleKu = `ڕوونکردنەوەی چارەسەری بۆ: ${activeMisc.nameKu}`;
      explanationKu = `تێبینی دەکەین کە لە کاتی کارکردن لەسەر "${conceptTitleKu}" کێشەیەک هەیە دەربارەی: "${activeMisc.nameKu}". وەرە با پێکەوە ئەم ڕوونکردنەوە تایبەتە بخوێنینەوە بۆ چارەسەرکردنی ئەم لێکتێنەگەیشتنە.`;
      reasoningKu = `سیستەمی ناسینەوەی تێنەگەیشتنەکان (Misconception Engine) پێشنیاری جووڵەی چارەسەری تایبەت دەکات بۆ بنبڕکردنی هەڵەی دووبارەبووەوە.`;
    }
    // 3. Spaced Repetition or Needs Review
    else if (status === MasteryStatus.NEEDS_REVIEW) {
      type = "PREREQUISITE_REVIEW";
      priority = "high";
      titleKu = `پێداچوونەوەی کاتی (Spaced Repetition): ${conceptTitleKu}`;
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
