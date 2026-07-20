import { AssessmentAttempt, AssessmentBlueprint, AssessmentQuestion, PublicQuestion, AssessmentStatus } from "../domain/AssessmentTypes.ts";
import { DifficultyLevel } from "../../learning/domain/MasteryTypes.ts";
import { DifficultySelector } from "./DifficultySelector.ts";
import { QuizTerminationPolicy } from "./QuizTerminationPolicy.ts";
import { QuestionBankProvider } from "../providers/QuestionBankProvider.ts";
import { QuestionSelectionEngine } from "../generation/QuestionSelectionEngine.ts";

export class AdaptiveQuizEngine {
  /**
   * Evaluates the active adaptive session, checks for termination, and decides the next question.
   */
  public static determineNextStep(
    attempt: AssessmentAttempt,
    blueprint: AssessmentBlueprint,
    studentMasteryScore: number = 0.0
  ): {
    shouldStop: boolean;
    nextQuestion?: PublicQuestion;
    terminationReasonKu?: string;
    terminationReasonEn?: string;
  } {
    const attemptsArray = Object.values(attempt.questionAttempts);
    const totalAnswered = attemptsArray.length;

    // 1. Check for termination policy
    const termDecision = QuizTerminationPolicy.shouldTerminate(attemptsArray);
    if (termDecision.terminate) {
      return {
        shouldStop: true,
        terminationReasonKu: termDecision.reasonKu,
        terminationReasonEn: termDecision.reasonEn
      };
    }

    // Get candidate pool of questions matching the blueprint
    const bank = QuestionBankProvider.getInstance();
    const candidatePool = QuestionSelectionEngine.selectQuestionsForBlueprint(blueprint);
    
    if (candidatePool.length === 0) {
      return {
        shouldStop: true,
        terminationReasonKu: "هیچ پرسیارێک لە سەرچاوەدا نییە بۆ تاقیکردنەوە.",
        terminationReasonEn: "No questions available in the pool."
      };
    }

    // 2. Decide next difficulty
    let nextDifficulty = DifficultyLevel.STANDARD;
    
    if (totalAnswered === 0) {
      // First question: base on current concept mastery
      nextDifficulty = DifficultySelector.selectInitialDifficulty(studentMasteryScore);
    } else {
      // Subsequent questions: adapt based on the last attempt
      const lastAttempt = attemptsArray[attemptsArray.length - 1];
      const lastQuestion = bank.getQuestion(lastAttempt.questionId);
      
      const lastDifficulty = lastQuestion?.difficulty || DifficultyLevel.STANDARD;
      const lastIsCorrect = lastAttempt.isCorrect;
      
      // Calculate streak
      let streak = 0;
      for (let i = attemptsArray.length - 1; i >= 0; i--) {
        if (attemptsArray[i].isCorrect === lastIsCorrect) {
          streak++;
        } else {
          break;
        }
      }

      nextDifficulty = DifficultySelector.selectNextDifficulty(lastDifficulty, lastIsCorrect, streak);
    }

    // 3. Select an unused question of the targeted difficulty
    const usedQuestionIds = new Set(attemptsArray.map(a => a.questionId));
    let nextQuestionObj = this.findQuestionOfDifficulty(candidatePool, nextDifficulty, usedQuestionIds);

    // If no unused questions exist at the adapted difficulty, pick adjacent difficulty
    if (!nextQuestionObj) {
      const adjacentDifficulties = [
        DifficultyLevel.STANDARD,
        DifficultyLevel.CHALLENGING,
        DifficultyLevel.EASY,
        DifficultyLevel.ADVANCED,
        DifficultyLevel.FOUNDATION
      ];
      for (const adjDiff of adjacentDifficulties) {
        nextQuestionObj = this.findQuestionOfDifficulty(candidatePool, adjDiff, usedQuestionIds);
        if (nextQuestionObj) break;
      }
    }

    // If still no unused questions, terminate early
    if (!nextQuestionObj) {
      return {
        shouldStop: true,
        terminationReasonKu: "تاقیکردنەوە کۆتایی هات چونکە هەموو پرسیارە بەردەستەکان شیکارکران.",
        terminationReasonEn: "Assessment finished: All available questions in the pool have been answered."
      };
    }

    // Strip answer keys and return public question
    const nextQuestionPublic = bank.toPublicQuestion(nextQuestionObj);

    return {
      shouldStop: false,
      nextQuestion: nextQuestionPublic
    };
  }

  private static findQuestionOfDifficulty(
    pool: AssessmentQuestion[],
    difficulty: DifficultyLevel,
    usedIds: Set<string>
  ): AssessmentQuestion | undefined {
    return pool.find(q => q.difficulty === difficulty && !usedIds.has(q.id));
  }
}
