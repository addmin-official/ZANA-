import { AssessmentQuestion, AnswerSubmission, QuestionType } from "../domain/AssessmentTypes.ts";

export class FeedbackGenerator {
  /**
   * Generates highly-contextual, supportive Kurdish feedback based on the correctness,
   * question details, and any detected misconceptions.
   */
  public static generateFeedback(
    question: AssessmentQuestion,
    submission: AnswerSubmission,
    isCorrect: boolean,
    partialCredit: number,
    misconceptionId?: string
  ): { feedbackKu: string; feedbackEn: string } {
    let feedbackKu = "";
    let feedbackEn = "";

    // 1. Fully Correct Case
    if (isCorrect && partialCredit === 1.0) {
      feedbackKu = "بژیت! وەڵامەکەت تەواو ڕاستە. تۆ بە تەواوی لەم تێگەیشتنە گەیشتوویت.";
      feedbackEn = "Excellent! Your answer is completely correct. You have fully grasped this concept.";
      return { feedbackKu, feedbackEn };
    }

    // 2. Misconception Remediation Case
    if (misconceptionId) {
      if (misconceptionId === "misc_sign_flip") {
        feedbackKu = "ئۆهـ! پێدەچێت کێشەیەکت لە گواستنەوەی نیشانەکان هەبێت. کاتێک ژمارەیەک دەگوازیتەوە بۆ لایەکەی تری یەکسانبوون (=)، پێویستە نیشانەکەی پێچەوانە بکەیتەوە (کۆکردنەوە دەبێتە لێدەرکردن، لێدەرکردن دەبێتە کۆکردنەوە). با دووبارە تاقی بکەینەوە!";
        feedbackEn = "Oops! It seems you might have flipped a mathematical sign. Remember, when you move a term to the other side of the equation (=), its sign must change (addition becomes subtraction, subtraction becomes addition). Let's try again!";
        return { feedbackKu, feedbackEn };
      }
      if (misconceptionId === "misc_op_inverse") {
        feedbackKu = "تێبینی دەکەین کرداری پێچەوانەت بە هەڵە بەکارهێناوە. بۆ لادانی لێکدان، دابەش دەکەین؛ بۆ لادانی دابەشکردن، لێکدان دەکەین. با سەرنج بدەینەوە سەر ڕووتێکردنی گۆڕدراوەکە.";
        feedbackEn = "We noticed you might have confused inverse operations. To undo multiplication, we divide; to undo division, we multiply. Let's look closer at isolating the variable.";
        return { feedbackKu, feedbackEn };
      }
    }

    // 3. Partial Correct Case
    if (partialCredit > 0 && partialCredit < 1.0) {
      feedbackKu = `هەوڵێکی باشە! تۆ بەشێکی زانیاریت ڕاستە (نمرەی بەشەکی: ${Math.round(partialCredit * 100)}٪). پێویستە کەمێک وردتر بیت لە هەڵبژاردنی هەموو خاڵە پەیوەندیدارەکاندا.`;
      feedbackEn = `Good attempt! You got some parts correct (Partial score: ${Math.round(partialCredit * 100)}%). Take a closer look to find all matching/relevant choices next time.`;
      return { feedbackKu, feedbackEn };
    }

    // 4. Incorrect Case (Generic fallback with helpful conceptual hints)
    feedbackKu = "وەڵامەکەت ڕاست نییە، بەڵام ئەمە هەلێکە بۆ فێربوون! " + (question.explanationKu || "سەیری ڕوونکردنەوەی فێربوونی بابەتەکە بکە بۆ پاڵپشتی.");
    feedbackEn = "That is not correct, but it is a great opportunity to learn! " + (question.explanationEn || "Please review the concept explanation for more help.");

    return { feedbackKu, feedbackEn };
  }
}
