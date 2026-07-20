import { AssessmentQuestion, AnswerSubmission, QuestionAttempt } from "../domain/AssessmentTypes.ts";
import { AssessmentValidation } from "../domain/AssessmentValidation.ts";
import { PartialCreditEngine } from "./PartialCreditEngine.ts";
import { FeedbackGenerator } from "./FeedbackGenerator.ts";
import { QuestionBankProvider } from "../providers/QuestionBankProvider.ts";

export class AnswerGrader {
  /**
   * Authoritatively grades a student answer submission.
   * Leverages server-side answer keys and prevents any client correctness injection.
   */
  public static gradeSubmission(
    question: AssessmentQuestion,
    submission: AnswerSubmission
  ): QuestionAttempt {
    const gradedAt = new Date().toISOString();
    const id = `att_q_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;

    // 1. Input Format & Sanity Verification
    if (!AssessmentValidation.validateSubmission(question, submission)) {
      return {
        id,
        questionId: question.id,
        conceptId: question.conceptId,
        skillId: question.skillId,
        submission,
        isCorrect: false,
        partialCreditScore: 0.0,
        maxScore: 1.0,
        gradedAt,
        reasonCodes: ["INVALID_SUBMISSION_FORMAT"],
        feedbackKu: "شێوازی ناردنی وەڵامەکە نادروستە. تکایە دووبارە هەوڵبدەرەوە.",
        feedbackEn: "Invalid submission format. Please try again with valid inputs."
      };
    }

    // 2. Fetch authoritative secure answer key from QuestionBankProvider
    const provider = QuestionBankProvider.getInstance();
    const answerKey = provider.getAnswerKey(question.id);

    if (!answerKey) {
      return {
        id,
        questionId: question.id,
        conceptId: question.conceptId,
        skillId: question.skillId,
        submission,
        isCorrect: false,
        partialCreditScore: 0.0,
        maxScore: 1.0,
        gradedAt,
        reasonCodes: ["MISSING_ANSWER_KEY_DEFINITION"],
        feedbackKu: "هەڵەیەک لە سەرچاوەی پرسیارەکەدا هەیە. تکایە پەیوەندی بکە بە پاڵپشتی زانا.",
        feedbackEn: "Question answer key missing. Please contact support."
      };
    }

    // 3. Compute deterministic score and partial credit
    const creditResult = PartialCreditEngine.calculateCredit(
      question.type,
      answerKey,
      submission,
      question.options?.length || 0
    );

    const partialCreditScore = creditResult.score;
    const isCorrect = partialCreditScore === 1.0;

    // 4. Misconception signature analysis
    let misconceptionDetectedId: string | undefined;

    // Check pre-coded signatures first
    if (!isCorrect && question.misconceptionSignatures && question.misconceptionSignatures.length > 0) {
      for (const sig of question.misconceptionSignatures) {
        if (sig.optionId && submission.selectedOptionIds?.includes(sig.optionId)) {
          misconceptionDetectedId = sig.misconceptionId;
          break;
        }
        if (sig.pattern && submission.shortAnswerText) {
          const regex = new RegExp(sig.pattern, "i");
          if (regex.test(submission.shortAnswerText)) {
            misconceptionDetectedId = sig.misconceptionId;
            break;
          }
        }
      }
    }

    // Secondary heuristic checks (e.g. math sign flips) if not already detected
    if (!isCorrect && !misconceptionDetectedId) {
      const respText = (submission.shortAnswerText || "").trim();
      const prompt = question.promptKu.toLowerCase();
      
      if (question.type === "NUMERIC" && submission.numericValue !== undefined) {
        // e.g. for 2x - 4 = 10, correct is 7. If student answered -3, 3, or something else
        if (question.id === "q_alg_l2_02") {
          if (submission.numericValue === 3) {
            // solved 2x = 6 (flipped -4 to -4 instead of adding 4: 10 - 4 = 6)
            misconceptionDetectedId = "misc_sign_flip";
          }
        }
      } else if (question.type === "SHORT_ANSWER" && respText.length > 0) {
        if (prompt.includes("هاوکێشە") && (respText.includes("-") || respText.includes("+"))) {
          misconceptionDetectedId = "misc_sign_flip";
        }
      }
    }

    // 5. Generate pedagogical Kurdish feedback
    const feedback = FeedbackGenerator.generateFeedback(
      question,
      submission,
      isCorrect,
      partialCreditScore,
      misconceptionDetectedId
    );

    return {
      id,
      questionId: question.id,
      conceptId: question.conceptId,
      skillId: question.skillId,
      submission,
      isCorrect,
      partialCreditScore,
      maxScore: 1.0,
      gradedAt,
      reasonCodes: creditResult.reasonCodes,
      misconceptionDetectedId,
      feedbackKu: feedback.feedbackKu,
      feedbackEn: feedback.feedbackEn
    };
  }
}
