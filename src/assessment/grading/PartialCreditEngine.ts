import { QuestionType, CorrectAnswerDefinition, AnswerSubmission } from "../domain/AssessmentTypes.ts";

export class PartialCreditEngine {
  /**
   * Evaluates the partial credit score (0.0 to 1.0) for a submission.
   */
  public static calculateCredit(
    type: QuestionType,
    correctDef: CorrectAnswerDefinition,
    submission: AnswerSubmission,
    optionsCount: number = 4
  ): { score: number; reasonCodes: string[] } {
    const reasonCodes: string[] = [];

    switch (type) {
      case QuestionType.MULTIPLE_CHOICE_SINGLE: {
        const correctId = correctDef.singleOptionId;
        const submittedId = submission.selectedOptionIds?.[0];
        if (correctId && submittedId === correctId) {
          return { score: 1.0, reasonCodes: ["MC_SINGLE_CORRECT"] };
        }
        return { score: 0.0, reasonCodes: ["MC_SINGLE_INCORRECT"] };
      }

      case QuestionType.MULTIPLE_CHOICE_MULTIPLE: {
        const correctIds = correctDef.multipleOptionIds || [];
        const submittedIds = submission.selectedOptionIds || [];

        if (correctIds.length === 0) return { score: 0.0, reasonCodes: ["MC_MULTIPLE_NO_CORRECT_DEF"] };
        if (submittedIds.length === 0) return { score: 0.0, reasonCodes: ["MC_MULTIPLE_EMPTY"] };

        const truePositives = submittedIds.filter(id => correctIds.includes(id)).length;
        const falsePositives = submittedIds.filter(id => !correctIds.includes(id)).length;

        // Score: (TP - FP) / total correct answers, floored at 0
        const rawScore = (truePositives - falsePositives) / correctIds.length;
        const finalScore = Number(Math.max(0, Math.min(1.0, rawScore)).toFixed(3));

        if (finalScore === 1.0) {
          reasonCodes.push("MC_MULTIPLE_FULLY_CORRECT");
        } else if (finalScore > 0) {
          reasonCodes.push(`MC_MULTIPLE_PARTIAL_${Math.round(finalScore * 100)}`);
        } else {
          reasonCodes.push("MC_MULTIPLE_INCORRECT");
        }

        return { score: finalScore, reasonCodes };
      }

      case QuestionType.TRUE_FALSE: {
        const correctVal = correctDef.trueFalseValue;
        const submittedVal = submission.trueFalseValue;
        if (correctVal !== undefined && submittedVal === correctVal) {
          return { score: 1.0, reasonCodes: ["TF_CORRECT"] };
        }
        return { score: 0.0, reasonCodes: ["TF_INCORRECT"] };
      }

      case QuestionType.NUMERIC: {
        const correctVal = correctDef.numericValue;
        const submittedVal = submission.numericValue;
        const tolerance = correctDef.numericTolerance || 0;

        if (correctVal === undefined || submittedVal === undefined) {
          return { score: 0.0, reasonCodes: ["NUMERIC_MISSING"] };
        }

        const diff = Math.abs(submittedVal - correctVal);
        if (diff <= tolerance) {
          return { score: 1.0, reasonCodes: ["NUMERIC_CORRECT"] };
        }
        return { score: 0.0, reasonCodes: ["NUMERIC_INCORRECT"] };
      }

      case QuestionType.SHORT_ANSWER: {
        const patterns = correctDef.shortAnswerPatterns || [];
        const text = submission.shortAnswerText || "";
        const normalizedInput = text.trim().toLowerCase();

        if (patterns.length === 0) return { score: 0.0, reasonCodes: ["SA_NO_PATTERNS"] };

        // Normalize Kurdish or general text matching: check if any pattern is subset or matches
        const matches = patterns.some(pattern => {
          const normPattern = pattern.trim().toLowerCase();
          return normalizedInput === normPattern || normalizedInput.includes(normPattern) || normPattern.includes(normalizedInput);
        });

        if (matches) {
          return { score: 1.0, reasonCodes: ["SA_CORRECT"] };
        }
        return { score: 0.0, reasonCodes: ["SA_INCORRECT"] };
      }

      case QuestionType.ORDERING: {
        const correctOrder = correctDef.orderedIds || [];
        const submittedOrder = submission.orderedIds || [];

        if (correctOrder.length === 0) return { score: 0.0, reasonCodes: ["ORDERING_NO_DEF"] };
        if (submittedOrder.length !== correctOrder.length) {
          return { score: 0.0, reasonCodes: ["ORDERING_LENGTH_MISMATCH"] };
        }

        // Compute correctly placed positions
        let correctPositions = 0;
        for (let i = 0; i < correctOrder.length; i++) {
          if (submittedOrder[i] === correctOrder[i]) {
            correctPositions++;
          }
        }

        const rawScore = correctPositions / correctOrder.length;
        const finalScore = Number(Math.max(0, Math.min(1.0, rawScore)).toFixed(3));

        if (finalScore === 1.0) {
          reasonCodes.push("ORDERING_FULLY_CORRECT");
        } else if (finalScore > 0) {
          reasonCodes.push(`ORDERING_PARTIAL_${Math.round(finalScore * 100)}`);
        } else {
          reasonCodes.push("ORDERING_INCORRECT");
        }

        return { score: finalScore, reasonCodes };
      }

      case QuestionType.MATCHING: {
        const correctPairs = correctDef.matchingPairs || {};
        const submittedPairs = submission.matchingPairs || {};

        const totalPairs = Object.keys(correctPairs).length;
        if (totalPairs === 0) return { score: 0.0, reasonCodes: ["MATCHING_NO_DEF"] };

        let correctCount = 0;
        for (const [leftId, rightId] of Object.entries(correctPairs)) {
          if (submittedPairs[leftId] === rightId) {
            correctCount++;
          }
        }

        const rawScore = correctCount / totalPairs;
        const finalScore = Number(Math.max(0, Math.min(1.0, rawScore)).toFixed(3));

        if (finalScore === 1.0) {
          reasonCodes.push("MATCHING_FULLY_CORRECT");
        } else if (finalScore > 0) {
          reasonCodes.push(`MATCHING_PARTIAL_${Math.round(finalScore * 100)}`);
        } else {
          reasonCodes.push("MATCHING_INCORRECT");
        }

        return { score: finalScore, reasonCodes };
      }

      default:
        return { score: 0.0, reasonCodes: ["UNKNOWN_QUESTION_TYPE"] };
    }
  }
}
