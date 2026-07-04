import { StudentProfile } from "../../student/studentTypes.ts";
import { CurriculumIntelligenceSnapshot } from "../../../curriculum/types.ts";
import { SessionSnapshot } from "../../../session/types.ts";
import { PracticeSnapshot, PracticeQuestion, PracticeAttempt } from "./practiceTypes.ts";
import { DomainClock } from "../../../domain/DomainClock.ts";

export interface PracticeModeInput {
  studentProfile: StudentProfile;
  curriculumSnapshot: CurriculumIntelligenceSnapshot;
  sessionSnapshot: SessionSnapshot;
  attempts?: PracticeAttempt[];
}

export function getDifficultyLabelKu(difficulty: string): string {
  switch (difficulty) {
    case "introductory":
    case "basic":
      return "ئاستی سەرەتا";
    case "intermediate":
      return "ئاستی مامناوەند";
    case "advanced":
      return "ئاستی پێشکەوتوو";
    case "exam_level":
      return "ئاستی وەزاری";
    default:
      return "ئاستی مامناوەند";
  }
}

// Fixed pedagogical database for the 4 core concepts
const DETAILED_QUESTIONS_DB: Record<string, PracticeQuestion[]> = {
  "12_sci_math_con1": [
    {
      id: "q_math_mcq",
      type: "multiple_choice",
      prompt: "بەهای سنووری lim (x -> 2) بۆ نەخشەی (x² - 4) / (x - 2) چەندە کاتێک کە لادانی دیارینەکراو ئەنجام بدەین؟",
      choices: ["2", "4", "0", "بوونی نییە"],
      correctAnswer: "4",
      explanation: "بە دابەشکردنی ڕاستەوخۆ دەبێتە 0/0 (دیارینەکراو). بە شیکردنەوەی سەرەوە: (x-2)(x+2)، پاشان کورتکردنەوەی (x-2)، تەنها x+2 دەمێنێتەوە. بە دانانی ٢، بەهاکە دەبێتە: 2 + 2 = 4.",
      difficultyLabel: "ئاستی مامناوەند",
      targetConceptId: "12_sci_math_con1"
    },
    {
      id: "q_math_short",
      type: "short_answer",
      prompt: "بەهای سنووری lim (x -> 5) بۆ نەخشەی ثابت f(x) = 12 چەندە؟ (تەنها ژمارەکە بنووسە)",
      correctAnswer: "12",
      explanation: "سنووری نەخشەی جێگیر (ثابت) هەمیشە یەکسانە بە خودی ژمارە جێگیرەکە، بێ گوێدانە ئەوەی کە x لە چ بەهایەک نزیک دەبێتەوە.",
      difficultyLabel: "ئاستی سەرەتا",
      targetConceptId: "12_sci_math_con1"
    },
    {
      id: "q_math_step",
      type: "step_by_step",
      prompt: "هەنگاوەکانی شیکارکردنی lim (x -> 3) بۆ (x² - 9)/(x-3) دیاریبکە. یەکەم هەنگاو چییە؟",
      choices: ["دابەشکردنی ڕاستەوخۆ", "شیکردنەوەی سەرەوە", "کورتکردنەوەی بەشە هاوبەشەکان", "سەیرکردنی وەڵام"],
      correctAnswer: "دابەشکردنی ڕاستەوخۆ",
      explanation: "هەمیشە، یەکەمین و گرنگترین هەنگاو لە دۆزینەوەی سنووردا بریتییە لە دابەشکردنی ڕاستەوخۆ (التعويض المباشر) بۆ دڵنیابوون لەوەی ئایا سنوورەکە حاڵەتی دیارینەکراو نیشان دەدات یان ڕاستەوخۆ چارەسەر دەبێت.",
      difficultyLabel: "ئاستی مامناوەند",
      targetConceptId: "12_sci_math_con1"
    }
  ],
  "12_sci_phys_con1": [
    {
      id: "q_phys_mcq",
      type: "multiple_choice",
      prompt: "تەنێک بارستاییەکەی 5 kgە، هێزێکی گشتی 20 N کاری تێدەکات. تاودانی ئەم تەنە چەندە بە یەکەی m/s²؟",
      choices: ["2", "4", "10", "100"],
      correctAnswer: "4",
      explanation: "بەپێی یاسای دووەمی نیوتن F = m * a، کەواتە تاودان دەکاتە a = F / m. لێرەدا a = 20 / 5 = 4 m/s².",
      difficultyLabel: "ئاستی مامناوەند",
      targetConceptId: "12_sci_phys_con1"
    },
    {
      id: "q_phys_short",
      type: "short_answer",
      prompt: "ئەگەر هێزی گشتی سەر تەنێک سفر بێت، بەپێی یاسای نیوتن تاودانی تەنەکە چەند دەبێت؟ (تەنها ژمارەکە بنووسە)",
      correctAnswer: "0",
      explanation: "کاتێک هێزی گشتی (F_net) سەر تەنێک یەکسان بێت بە سفر، بەپێی هاوکێشەی F = m * a، پێویستە تاودانیش (a) سفر بێت چونکە بارستایی تەنەکە ناتوانێت سفر بێت.",
      difficultyLabel: "ئاستی سەرەتا",
      targetConceptId: "12_sci_phys_con1"
    },
    {
      id: "q_phys_step",
      type: "step_by_step",
      prompt: "لە پرسیارێکی فیزیکدا ئەگەر هێز و بارستایی و لێکخشاندن درابێت، یەکەم کار پێش بەکارهێنانی یاسای a = F/m چییە؟",
      choices: [
        "ئەژمارکردنی هێزی گشتی (F_net) بە کەمکردنەوەی لێکخشاندن",
        "دابەشکردنی بارستایی بەسەر هێزەکەدا",
        "زیادکردنی تاودان",
        "پشتگوێخستنی لێکخشاندن بە تەواوی"
      ],
      correctAnswer: "ئەژمارکردنی هێزی گشتی (F_net) بە کەمکردنەوەی لێکخشاندن",
      explanation: "پێویستە هەمیشە پێش هەموو شتێک هێزی لێکخشاندن لە هێزی بزوێنەر کەم بکەینەوە بۆ دۆزینەوەی هێزی پوختە یان گشتی (F_net) کە هۆکاری تاودانەکەیە.",
      difficultyLabel: "ئاستی مامناوەند",
      targetConceptId: "12_sci_phys_con1"
    }
  ],
  "12_sci_chem_con1": [
    {
      id: "q_chem_mcq",
      type: "multiple_choice",
      prompt: "کامیان فۆرمۆلەی گەردی ڕاستی لێکدراوی 'پڕۆپان' (Propane) پیشان دەدات کە ٣ کاربۆنی هەیە؟",
      choices: ["C3H6", "C3H8", "C3H4", "C4H10"],
      correctAnswer: "C3H8",
      explanation: "یاسای گشتی ئەلکانەکان بریتییە لە C_n H_{2n+2}. بۆ ٣ کاربۆن (n=3)، ژمارەی هایدرۆجین دەبێتە 2(3) + 2 = 8، بۆیە C3H8 دروستی کیمیاییە.",
      difficultyLabel: "ئاستی مامناوەند",
      targetConceptId: "12_sci_chem_con1"
    },
    {
      id: "q_chem_short",
      type: "short_answer",
      prompt: "هایدرۆکاربۆنی تێر کە تەنها بەستەری یەکەمی تاکیان هەیە پێیان دەوترێت چی؟ (وەڵام بە کوردی بنووسە)",
      correctAnswer: "ئەلکان",
      explanation: "ئەلکانەکان (Alkanes) بە هایدرۆکاربۆنی تێر دادەنرێن چونکە سەرجەم بەستەرەکانی نێوان کاربۆنەکان لە جۆری سیگما (تاک)ن و بە زۆرترین ژمارەی هایدرۆجین بەستراونەتەوە.",
      difficultyLabel: "ئاستی سەرەتا",
      targetConceptId: "12_sci_chem_con1"
    },
    {
      id: "q_chem_step",
      type: "step_by_step",
      prompt: "کاتێک دەتەوێت ناوی ئەلکانێکی زنجیری لکدار دیاری بکەیت، یەکەم هەنگاو چییە؟",
      choices: [
        "دۆزینەوەی درێژترین زنجیرەی کاربۆنی بەردەوام",
        "ژمارەکردن لەلای ڕاستەوە هەمیشە",
        "لابردنی هایدرۆجینەکان لە زنجیرەکە",
        "ناونانی لقەکان سەرەتا بەبێ زنجیرەی سەرەکی"
      ],
      correctAnswer: "دۆزینەوەی درێژترین زنجیرەی کاربۆنی بەردەوام",
      explanation: "هەمیشە یەکەم و بنەڕەتیترین هەنگاو لە ناونانی لێکدراوە ئەندامییەکاندا بەپێی سیستەمی IUPAC، دیاریکردنی درێژترین زنجیرەی بەردەوامی کاربۆنەکانە بۆ ناسینی ناوی بنەڕەتی زنجیرەکە.",
      difficultyLabel: "ئاستی مامناوەند",
      targetConceptId: "12_sci_chem_con1"
    }
  ],
  "12_sci_eng_con1": [
    {
      id: "q_eng_mcq",
      type: "multiple_choice",
      prompt: "Which of the following is the correct Passive Voice for: 'Ahmad eats an apple every day'?",
      choices: [
        "An apple is eaten by Ahmad every day.",
        "An apple was eaten by Ahmad.",
        "An apple eats Ahmad.",
        "Ahmad is eaten by an apple."
      ],
      correctAnswer: "An apple is eaten by Ahmad every day.",
      explanation: "The object 'an apple' is singular, so we use 'is' + V3 form of 'eat' which is 'eaten'. The time expression 'every day' stays at the end.",
      difficultyLabel: "ئاستی مامناوەند",
      targetConceptId: "12_sci_eng_con1"
    },
    {
      id: "q_eng_short",
      type: "short_answer",
      prompt: "What is the Past Participle (V3) form of the irregular verb 'write'?",
      correctAnswer: "written",
      explanation: "The verb 'write' is irregular. V1 is 'write', V2 is 'wrote', and V3 (Past Participle) is 'written'. Spelling matters!",
      difficultyLabel: "ئاستی سەرەتا",
      targetConceptId: "12_sci_eng_con1"
    },
    {
      id: "q_eng_step",
      type: "step_by_step",
      prompt: "When converting an active sentence to Passive Voice, which element is moved to the very front of the new sentence?",
      choices: [
        "Object (بەردەرکار)",
        "Verb (کردار)",
        "Subject (بکەر)",
        "Adjective (ئاوەڵناو)"
      ],
      correctAnswer: "Object (بەردەرکار)",
      explanation: "The object (receiver of the action) always becomes the subject in the passive structure and takes the primary position at the beginning.",
      difficultyLabel: "ئاستی مامناوەند",
      targetConceptId: "12_sci_eng_con1"
    }
  ]
};

export class PracticeModeEngine {
  public static buildPracticeSnapshot(input: PracticeModeInput): PracticeSnapshot {
    const { studentProfile, curriculumSnapshot, sessionSnapshot, attempts = [] } = input;

    const availableNodes = curriculumSnapshot.resolution.availableNodes;
    const session = sessionSnapshot.currentSession;
    
    // Get the current active node
    const currentNodeId = session?.currentNodeId || "12_sci_math_con1";
    let activeNode = availableNodes.find(n => n.id === currentNodeId);
    
    const warnings: string[] = [];

    if (!activeNode) {
      activeNode = availableNodes[0] || {
        id: currentNodeId,
        type: "concept",
        title: "چەمکی خوێندن",
        description: "ڕاهێنان لەسەر تەوەرەکانی بابەتەکە.",
        grade: studentProfile.grade,
        stream: studentProfile.stream,
        subject: studentProfile.activeSubject,
        difficulty: "intermediate",
        prerequisiteIds: [],
        estimatedMinutes: 15,
        learningObjectives: [],
        tags: []
      };
      warnings.push("ئاگاداری: پلانی خوێندنی نوێ بەردەست نەبوو، پرسیارەکان بەپێی بابەتی جێگرەوە ئامادەکراون.");
    }

    const activeLesson = availableNodes.find(n => n.id === activeNode?.parentId) || activeNode;

    const subjectLabel = curriculumSnapshot.resolution.subjectLabel || "وانە";
    const gradeLabel = curriculumSnapshot.resolution.gradeLabel || "پۆل";
    const streamLabel = curriculumSnapshot.resolution.streamLabel || "لقی";

    // Load or generate questions
    let questions = DETAILED_QUESTIONS_DB[activeNode.id];

    if (!questions) {
      // Fallback dynamic generation based on node title
      const title = activeNode.title;
      questions = [
        {
          id: `q_${activeNode.id}_mcq`,
          type: "multiple_choice",
          prompt: `سەبارەت بە بابەت و تەوەری سەرەکی: '${title}'، کامیان وەڵامی ڕاست و گونجاوترینە بۆ گەیشتن بە چارەسەرێکی دروست؟`,
          choices: [
            "تێگەیشتنی بنەماکان و پەیڕەکردنی ڕێسای گشتی خوێندن",
            "پشتگوێخستنی بەشە بنەڕەتییەکان و تەنها لەبەرکردن",
            "چارەسەرکردن بەبێ وردبوونەوە لە زانیارییەکان",
            "گۆڕینی هاوکێشەکان بە شێوازی تاقیکردنەوەی هەڕەمەکی"
          ],
          correctAnswer: "تێگەیشتنی بنەماکان و پەیڕەکردنی ڕێسای گشتی خوێندن",
          explanation: `بۆ چەمکی ${title}، هەمیشە تێگەیشتنی تیۆری بنەڕەتی بنەمای سەرەکییە بۆ شیکارکردنی هەموو جۆرە پرسیارێک بە سەرکەوتوویی.`,
          difficultyLabel: "ئاستی مامناوەند",
          targetConceptId: activeNode.id
        },
        {
          id: `q_${activeNode.id}_short`,
          type: "short_answer",
          prompt: `بۆ فێربوونی دروست لە چەمکی '${title}'، ئایا گرنگە پێشتر چەمکە سەرەکی و بنچینەییە پێشینەییەکان بە باشی تێبگەین؟ (بنووسە: بەڵێ)`,
          correctAnswer: "بەڵێ",
          explanation: `بەڵێ، خوێندنی چەمکی ${title} پێویستی بە دڵنیابوونەوەیە لە تێگەیشتنی چەمکە سەرەتاییەکان چونکە زانیارییەکان تەواوکەری یەکترن.`,
          difficultyLabel: "ئاستی سەرەتا",
          targetConceptId: activeNode.id
        },
        {
          id: `q_${activeNode.id}_step`,
          type: "step_by_step",
          prompt: `لە بەدواداچوونی هەنگاو بە هەنگاو بۆ بابەتی '${title}'، کام کردار بە سەرەتایەکی پڕاکتیکی دروست دادەنرێت بۆ قوتابی؟`,
          choices: [
            "دیاریکردنی جۆری پرسیارەکە و دەرهێنانی زانیارییە دراوەکان",
            "ڕاستەوخۆ نووسینی هاوکێشەی کۆتایی بەبێ دۆزینەوەی گۆڕاوەکان",
            "تاقیکردنەوەی خێرا بەبێ خوێندنەوەی دەقی پرسیارەکە",
            "پشتگوێخستنی بەشە کردارەکییەکانی بابەتەکە"
          ],
          correctAnswer: "دیاریکردنی جۆری پرسیارەکە و دەرهێنانی زانیارییە دراوەکان",
          explanation: "یەکەم هەنگاو لە هەر بیرکاری، فیزیک، یان بابەتێکی زانستیدا خوێندنەوەی وردی بابەتەکە و دیاریکردنی زانیارییە دراوەکانە.",
          difficultyLabel: "ئاستی مامناوەند",
          targetConceptId: activeNode.id
        }
      ];
    }

    // Filter attempts to match only the active questions
    const activeQuestionIds = new Set(questions.map(q => q.id));
    const activeAttempts = attempts.filter(att => activeQuestionIds.has(att.questionId));

    // Calculate completion percentage
    const completedQuestionsCount = activeAttempts.length;
    const totalQuestionsCount = questions.length;
    const completionPercentage = totalQuestionsCount > 0 
      ? Math.round((completedQuestionsCount / totalQuestionsCount) * 100) 
      : 0;

    // Generate smart motivational feedback
    let feedbackMessage = "ئامادەی بۆ ڕاهێنان؟ دەست بکە بە وەڵامدانەوەی پرسیارەکانی خوارەوە بۆ جێگیرکردنی زانیارییەکانت.";
    if (completedQuestionsCount > 0) {
      const correctCount = activeAttempts.filter(att => att.isCorrect).length;
      if (completedQuestionsCount === totalQuestionsCount) {
        const score = (correctCount / totalQuestionsCount) * 100;
        if (score >= 70) {
          feedbackMessage = `ناوازەیە! توانیت بە سەرکەوتوویی سەرجەم پرسیارەکانی ئەم بەشە تەواو بکەیت بە نمرەی نایابی %${Math.round(score)}.`;
        } else {
          feedbackMessage = `هەوڵێکی باش بوو! تۆ %${Math.round(score)}ی پرسیارەکانت بە دروستی وەڵام دایەوە. دەتوانیت دووبارە تاقی بکەیتەوە بۆ نمرەی باڵاتر.`;
        }
      } else {
        feedbackMessage = `زۆر باشە! لە ئێستادا ${completedQuestionsCount} پرسیارت وەڵام داوە لە کۆی ${totalQuestionsCount} پرسیار. بەردەوام بە!`;
      }
    }

    return {
      generatedAt: DomainClock.nowIso(),
      lessonTitle: activeLesson.title,
      conceptTitle: activeNode.title,
      subjectLabel,
      gradeLabel,
      streamLabel,
      questions,
      attempts: activeAttempts,
      completionPercentage,
      feedbackMessage,
      warnings
    };
  }

  public static evaluatePracticeAnswer(
    question: PracticeQuestion,
    answer: string
  ): { isCorrect: boolean; feedback: string } {
    const sanitizedAnswer = answer.trim().toLowerCase();
    const sanitizedCorrect = (question.correctAnswer || "").trim().toLowerCase();

    const isCorrect = sanitizedAnswer === sanitizedCorrect;

    let feedback = "";
    if (isCorrect) {
      const positiveEncouragements = [
        "بژیت! وەڵامەکەت تەواو و دروستە. زۆر بە باشی تێگەیشتوویت.",
        "نایابە! بیرکردنەوەیەکی دروست و وەڵامێکی گونجاو.",
        "وەڵامێکی سەرکەوتوو! توانات لەم بەشەدا زۆر نایابە."
      ];
      const randomIndex = Math.floor(Math.random() * positiveEncouragements.length);
      feedback = positiveEncouragements[randomIndex];
    } else {
      feedback = `پێویستە کەمێک زیاتر سەرنج بدەیت. وەڵامی دروست بریتییە لە: "${question.correctAnswer}".`;
    }

    return {
      isCorrect,
      feedback
    };
  }
}
