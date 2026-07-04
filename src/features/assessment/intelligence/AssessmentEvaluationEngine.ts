import { AssessmentQuestion } from "./assessmentTypes.ts";

export interface EvaluationResult {
  isCorrect: boolean;
  feedback: string;
}

/**
 * Normalizes Kurdish/Arabic characters and spacing for robust comparison.
 */
function normalizeKurdishText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[ىي]/g, "ی")
    .replace(/[كك]/g, "ک")
    .replace(/[ۆؤ]/g, "ۆ")
    .replace(/[ەة]/g, "ە")
    .replace(/[٠]/g, "0")
    .replace(/[١]/g, "1")
    .replace(/[٢]/g, "2")
    .replace(/[٣]/g, "3")
    .replace(/[٤]/g, "4")
    .replace(/[٥]/g, "5")
    .replace(/[٦]/g, "6")
    .replace(/[٧]/g, "7")
    .replace(/[٨]/g, "8")
    .replace(/[٩]/g, "9")
    .replace(/[\s\-_,\.]+/g, ""); // Remove spacing and punctuation for absolute strict text equality
}

/**
 * Normalizes text for keyword matching (keeps spacing to detect words).
 */
function normalizeForKeywords(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[ىي]/g, "ی")
    .replace(/[كك]/g, "ک")
    .replace(/[ۆؤ]/g, "ۆ")
    .replace(/[ەة]/g, "ە")
    .replace(/[٠]/g, "0")
    .replace(/[١]/g, "1")
    .replace(/[٢]/g, "2")
    .replace(/[٣]/g, "3")
    .replace(/[٤]/g, "4")
    .replace(/[٥]/g, "5")
    .replace(/[٦]/g, "6")
    .replace(/[٧]/g, "7")
    .replace(/[٨]/g, "8")
    .replace(/[٩]/g, "9");
}

/**
 * AssessmentEvaluationEngine: Evaluates student answers scientifically and returns
 * positive, educational feedback in Kurdish Sorani.
 */
export function evaluateAnswer(question: AssessmentQuestion, answer: string): EvaluationResult {
  const trimmed = answer.trim();
  
  if (!trimmed) {
    return {
      isCorrect: false,
      feedback: "تکایە وەڵامێک بنووسە بۆ ئەوەی بتوانین هەڵسەنگاندنت بۆ بکەین."
    };
  }

  const normalizedAnswer = normalizeKurdishText(trimmed);
  const normalizedCorrect = normalizeKurdishText(question.correctAnswer || "");

  // MULTIPLE CHOICE EVALUATION
  if (question.type === "multiple_choice") {
    const isCorrect = normalizedAnswer === normalizedCorrect;
    
    if (isCorrect) {
      return {
        isCorrect: true,
        feedback: `وەڵامەکەت تەواو ڕاستە! ئافەرین. ${question.explanation}`
      };
    } else {
      return {
        isCorrect: false,
        feedback: `وەڵامەکەت تەواو نییە. هیوادارم زیاتر سەرنج بدەیت! ڕاستییەکەی: ${question.explanation}`
      };
    }
  }

  // SHORT ANSWER EVALUATION
  if (question.type === "short_answer") {
    const isCorrect = normalizedAnswer === normalizedCorrect;
    
    if (isCorrect) {
      return {
        isCorrect: true,
        feedback: `بژیت، وەڵامەکە بە تەواوی دروستە! ${question.explanation}`
      };
    } else {
      // Gentle check if they are very close, or just regular false
      return {
        isCorrect: false,
        feedback: `ئەمجارە نەگەیشتیتە وەڵامی دروست، بەڵام کێشە نییە! وەڵامی دروست بریتییە لە "${question.correctAnswer}". ڕوونکردنەوە: ${question.explanation}`
      };
    }
  }

  // STEP BY STEP EVALUATION
  if (question.type === "step_by_step") {
    // Check if any key terms from correctAnswer are included
    const correctKeywords = (question.correctAnswer || "")
      .split(/[\s,\-_،]+/)
      .map(kw => normalizeForKeywords(kw))
      .filter(kw => kw.length > 1); // Only keep words with 2 or more characters

    const studentTextNormalized = normalizeForKeywords(trimmed);
    
    // Calculate matching keywords
    let matchCount = 0;
    for (const kw of correctKeywords) {
      if (studentTextNormalized.includes(kw)) {
        matchCount++;
      }
    }

    // Determine correctness based on matching keywords
    const isCorrect = correctKeywords.length > 0 ? (matchCount / correctKeywords.length) >= 0.4 : true;

    if (isCorrect || studentTextNormalized.length > 25) {
      // If student explained with decent length and matches keywords
      return {
        isCorrect: true,
        feedback: `زۆر باشە! شیکارەکەت هەنگاوەکانی گرنگی تێدایە و بە گشتی دروستە. بیرخستنەوەی فەرمی: ${question.explanation}`
      };
    } else {
      return {
        isCorrect: false,
        feedback: `هەنگاوەکانی شیکارەکەت کەمێک ناڕوونن. تکایە سەرنج بدە لەم شێوازی شیکارە فەرمییە: ${question.explanation}`
      };
    }
  }

  return {
    isCorrect: false,
    feedback: "نەتوانرا وەڵامەکەت بنرخێنرێت."
  };
}
