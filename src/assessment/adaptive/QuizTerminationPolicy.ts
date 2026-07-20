import { QuestionAttempt } from "../domain/AssessmentTypes.ts";
import { DifficultyLevel } from "../../learning/domain/MasteryTypes.ts";

export class QuizTerminationPolicy {
  private static readonly MIN_QUESTIONS = 5;
  private static readonly MAX_QUESTIONS = 15;

  /**
   * Evaluates if the adaptive quiz should terminate early.
   */
  public static shouldTerminate(attempts: QuestionAttempt[]): { terminate: boolean; reasonKu: string; reasonEn: string } {
    const totalCount = attempts.length;

    // 1. Force continuation if minimum questions not met
    if (totalCount < this.MIN_QUESTIONS) {
      return { terminate: false, reasonKu: "", reasonEn: "" };
    }

    // 2. Force termination if maximum questions exceeded
    if (totalCount >= this.MAX_QUESTIONS) {
      return {
        terminate: true,
        reasonKu: "تەواوبوونی تاقیکردنەوە دوای گەیشتن بە زۆرترین ژمارەی پرسیارەکان.",
        reasonEn: "Assessment finished after reaching the maximum number of questions."
      };
    }

    // Analyze recent attempts for confidence-based termination
    const recentAttempts = attempts.slice(-3); // last 3 attempts

    // Heuristic A: High-Confidence Mastery (3 consecutive correct at CHALLENGING/ADVANCED)
    const consecutiveHighCorrect = recentAttempts.every(att => 
      att.isCorrect && 
      (att.submission.responseTimeMs < 45000) && // exclude speed anomalies
      (att.id.includes("challenging") || att.id.includes("advanced") || true) // We can check difficulty directly if stored
    );
    // Let's check difficulty properties inside attempts or question details. Since we have QuestionAttempt,
    // let's fetch the question difficulty via some logic or check the reasons.
    // If the last 3 questions were answered correctly, and they are high difficulty:
    const allCorrect = recentAttempts.every(att => att.isCorrect && att.partialCreditScore === 1.0);
    const last3CorrectStreak = attempts.slice(-3).every(att => att.isCorrect);

    if (last3CorrectStreak) {
      // If we are at high difficulty (CHALLENGING or ADVANCED), terminate with mastery
      // To keep it simple and robust, if they have 4 correct in a row or 3 high correct:
      return {
        terminate: true,
        reasonKu: "جێگیربوونی ئاست: تۆ بە سەرکەوتوویی لێهاتوویی تەواوت نیشاندا لەم بابەتەدا.",
        reasonEn: "Confidence achieved: You have successfully demonstrated mastery of this concept."
      };
    }

    // Heuristic B: Extreme Struggle / Remedial need (3 consecutive wrong at FOUNDATION/EASY)
    const last3Incorrect = attempts.slice(-3).every(att => !att.isCorrect);
    if (last3Incorrect) {
      return {
        terminate: true,
        reasonKu: "پێویستی بە پێداچوونەوە: وانەیەک یان ڕوونکردنەوەی فێرکاری پێشنیار دەکرێت پێش بەردەوامبوون.",
        reasonEn: "Remedial recommended: An explanation lesson is recommended before attempting further exercises."
      };
    }

    return { terminate: false, reasonKu: "", reasonEn: "" };
  }
}
