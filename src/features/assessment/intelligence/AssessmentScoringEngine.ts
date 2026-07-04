import { AssessmentQuestion, AssessmentAnswer } from "./assessmentTypes.ts";

export interface ScoringResult {
  totalCorrect: number;
  scorePercentage: number;
  weakConceptIds: string[];
  strongConceptIds: string[];
  readinessLabel: string;
}

/**
 * AssessmentScoringEngine: Performs scientific scoring calculations based on
 * the student's answered questions, determining correctness, percentage,
 * weak concept IDs, strong concept IDs, and readiness labels.
 */
export function calculateAssessmentScore(
  questions: AssessmentQuestion[],
  answers: AssessmentAnswer[]
): ScoringResult {
  const totalQuestions = questions.length;
  if (totalQuestions === 0) {
    return {
      totalCorrect: 0,
      scorePercentage: 0,
      weakConceptIds: [],
      strongConceptIds: [],
      readinessLabel: "پێویستی بە پێداچوونەوە هەیە"
    };
  }

  const totalCorrect = answers.filter(a => a.isCorrect).length;
  const scorePercentage = Math.round((totalCorrect / totalQuestions) * 100);

  // Analyze correctness by conceptId
  const conceptStats: Record<string, { total: number; correct: number }> = {};

  answers.forEach(ans => {
    const q = questions.find(item => item.id === ans.questionId);
    if (q && q.conceptId) {
      const cid = q.conceptId;
      if (!conceptStats[cid]) {
        conceptStats[cid] = { total: 0, correct: 0 };
      }
      conceptStats[cid].total += 1;
      if (ans.isCorrect) {
        conceptStats[cid].correct += 1;
      }
    }
  });

  const weakConceptIds: string[] = [];
  const strongConceptIds: string[] = [];

  Object.entries(conceptStats).forEach(([cid, stats]) => {
    const successRatio = stats.correct / stats.total;
    if (successRatio >= 0.8) {
      strongConceptIds.push(cid);
    } else {
      weakConceptIds.push(cid);
    }
  });

  let readinessLabel = "پێویستی بە پێداچوونەوە هەیە";
  if (scorePercentage >= 80) {
    readinessLabel = "ئامادەی چوونە وانەی داهاتوویت";
  } else if (scorePercentage >= 50) {
    readinessLabel = "باشە، بەڵام پێویستی بە ڕاهێنانی زیاترە";
  }

  return {
    totalCorrect,
    scorePercentage,
    weakConceptIds,
    strongConceptIds,
    readinessLabel
  };
}
