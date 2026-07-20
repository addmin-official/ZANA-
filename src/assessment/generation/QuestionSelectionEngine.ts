import { AssessmentQuestion, AssessmentBlueprint, QuestionType } from "../domain/AssessmentTypes.ts";
import { DifficultyLevel } from "../../learning/domain/MasteryTypes.ts";
import { QuestionBankProvider } from "../providers/QuestionBankProvider.ts";

export class QuestionSelectionEngine {
  /**
   * Intelligently selects questions from the QuestionBankProvider that match
   * the specified blueprint, while considering student history to prevent duplicates.
   */
  public static selectQuestionsForBlueprint(
    blueprint: AssessmentBlueprint,
    recentAttemptedQuestionIds: string[] = []
  ): AssessmentQuestion[] {
    const provider = QuestionBankProvider.getInstance();
    const result: AssessmentQuestion[] = [];
    const usedIds = new Set<string>();

    // 1. Fetch all candidate questions matching the curriculum and scope of the blueprint
    let candidates = provider.queryQuestions({
      curriculumId: blueprint.curriculumId,
      unitId: blueprint.unitId
    });

    // If lessonIds or conceptIds are specified in blueprint, filter candidates
    if (blueprint.lessonIds && blueprint.lessonIds.length > 0) {
      candidates = candidates.filter(q => q.lessonId && blueprint.lessonIds?.includes(q.lessonId));
    }
    if (blueprint.conceptIds && blueprint.conceptIds.length > 0) {
      candidates = candidates.filter(q => q.conceptId && blueprint.conceptIds?.includes(q.conceptId));
    }
    if (blueprint.skillIds && blueprint.skillIds.length > 0) {
      candidates = candidates.filter(q => q.skillId && blueprint.skillIds?.includes(q.skillId));
    }

    // Sort candidates to prioritize:
    // 1. Questions NOT in student's recent history
    // 2. High-quality curated questions
    candidates.sort((a, b) => {
      const aRecent = recentAttemptedQuestionIds.includes(a.id) ? 1 : 0;
      const bRecent = recentAttemptedQuestionIds.includes(b.id) ? 1 : 0;
      if (aRecent !== bRecent) return aRecent - bRecent; // prioritize non-recent
      return b.version - a.version; // prioritize newer version
    });

    // 2. Attempt to satisfy difficulty distribution from blueprint
    const targetCounts = this.calculateTargetCounts(blueprint);

    for (const [diffStr, count] of Object.entries(targetCounts)) {
      const diff = diffStr as DifficultyLevel;
      let diffMatched = candidates.filter(q => q.difficulty === diff && !usedIds.has(q.id));

      // Pick up to count questions
      const picked = diffMatched.slice(0, count);
      for (const q of picked) {
        result.push(q);
        usedIds.add(q.id);
      }
    }

    // 3. Fallback: If we don't have enough questions matching the distribution, fill with any other unused candidate questions
    if (result.length < blueprint.totalQuestions) {
      const remainingUnused = candidates.filter(q => !usedIds.has(q.id));
      const needed = blueprint.totalQuestions - result.length;
      const extra = remainingUnused.slice(0, needed);
      for (const q of extra) {
        result.push(q);
        usedIds.add(q.id);
      }
    }

    // 4. Final safety guard: if still not enough questions, we can repeat from history (or we have whatever we found)
    if (result.length < blueprint.totalQuestions) {
      const remainingUsed = candidates.filter(q => !result.some(r => r.id === q.id));
      const needed = blueprint.totalQuestions - result.length;
      const extra = remainingUsed.slice(0, needed);
      for (const q of extra) {
        result.push(q);
      }
    }

    // Respect randomization / shuffling rules
    if (blueprint.randomizationRules.shuffleQuestions) {
      this.shuffleArray(result);
    }

    return result;
  }

  /**
   * Translates percentages in blueprint distributions into discrete question counts.
   */
  private static calculateTargetCounts(blueprint: AssessmentBlueprint): Record<DifficultyLevel, number> {
    const targets: Record<DifficultyLevel, number> = {
      [DifficultyLevel.FOUNDATION]: 0,
      [DifficultyLevel.EASY]: 0,
      [DifficultyLevel.STANDARD]: 0,
      [DifficultyLevel.CHALLENGING]: 0,
      [DifficultyLevel.ADVANCED]: 0,
    };

    let allocated = 0;
    const diffEntries = Object.entries(blueprint.difficultyDistribution) as [DifficultyLevel, number][];

    // Sort by largest percentage first to avoid rounding issues
    diffEntries.sort((a, b) => b[1] - a[1]);

    for (const [diff, pct] of diffEntries) {
      const targetCount = Math.round(pct * blueprint.totalQuestions);
      targets[diff] = targetCount;
      allocated += targetCount;
    }

    // Reconcile rounding discrepancy
    let diffIndex = 0;
    while (allocated < blueprint.totalQuestions && diffEntries.length > 0) {
      const diff = diffEntries[diffIndex % diffEntries.length][0];
      targets[diff]++;
      allocated++;
      diffIndex++;
    }
    while (allocated > blueprint.totalQuestions) {
      const diff = diffEntries[diffIndex % diffEntries.length][0];
      if (targets[diff] > 0) {
        targets[diff]--;
        allocated--;
      }
      diffIndex++;
    }

    return targets;
  }

  private static shuffleArray(array: any[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
