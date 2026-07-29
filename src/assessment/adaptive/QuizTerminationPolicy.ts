import { QuestionAttempt } from "../domain/AssessmentTypes.ts";

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

    // Heuristic A: High-Confidence Mastery
    const last3CorrectStreak = attempts.slice(-3).every(att => att.isCorrect);

    if (last3CorrectStreak) {
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
