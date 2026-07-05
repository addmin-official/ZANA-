import { AssessmentQuestion, AssessmentQuestionType } from "./assessmentTypes.ts";

export interface QuestionEngineInput {
  studentId: string;
  grade: string;
  stream: string;
  subject: string;
  level: string;
  activeConceptId?: string;
  activeConceptTitle?: string;
  activeLessonId?: string;
  activeLessonTitle?: string;
}

/**
 * AssessmentQuestionEngine: Generates exactly 5 structured curriculum-aligned questions
 * based on student grade, stream, active subject, active lesson, and concept context.
 * Uses formal Kurdish Sorani and contains 2 multiple choice, 2 short answer, and 1 step-by-step.
 */
export function generateAssessmentQuestions(input: QuestionEngineInput): AssessmentQuestion[] {
  const { grade, stream, subject, activeConceptId, activeConceptTitle, activeLessonTitle } = input;
  const cleanSubject = subject.toLowerCase();
  
  // Try to find matching predefined questions for selected curriculum concepts
  let questions: AssessmentQuestion[] = [];

  // =========================================================================
  // GRADE 12 SCIENTIFIC - MATH
  // =========================================================================
  if (grade === "12" && stream === "scientific" && cleanSubject === "math") {
    questions = [
      {
        id: "q_12_math_mc1",
        type: "multiple_choice",
        prompt: "سنووری نەخشەی f(x) = (x^2 - 4) / (x - 2) کاتێک x لە ٢ نزیک دەبێتەوە یەکسانە بە چەند؟",
        choices: ["2", "4", "0", "بوونی نییە"],
        correctAnswer: "4",
        explanation: "بە شیکردنەوەی کەرتی سەرەوە بۆ (x-2)(x+2) و لادانی (x-2)، نەخشەکە دەبێتە f(x) = x+2. بە دانانی ٢ لە جیاتی x، بەهای سنوورەکە دەبێتە ٤.",
        conceptId: activeConceptId || "12_sci_math_con1",
        difficulty: "basic",
        source: "curriculum_generated"
      },
      {
        id: "q_12_math_mc2",
        type: "multiple_choice",
        prompt: "کام لەم بژاردانە پێناسەی لێژی لێکەوتی چەماوەیەک لە خاڵێکدا دەکات؟",
        choices: [
          "تێکڕای لادانی ستوونی",
          "ڕاددەی تێکڕای گۆڕان کاتێک جیاوازییەکە بەرەو سفر دەچێت",
          "بەهای نەخشەکە لەو خاڵەدا",
          "لێکدانی دوو لادانی ئاسۆیی"
        ],
        correctAnswer: "ڕاددەی تێکڕای گۆڕان کاتێک جیاوازییەکە بەرەو سفر دەچێت",
        explanation: "بەپێی یاسای جیاکاری، لێژی لێکەوت لە خاڵێکدا یەکسانە بە سنووری گۆڕانی بەهای ستوونی دابەش بەسەر ئاسۆیی کاتێک گۆڕانی ئاسۆیی بەرەو سفر بچێت.",
        conceptId: activeConceptId || "12_sci_math_con1",
        difficulty: "intermediate",
        source: "curriculum_generated"
      },
      {
        id: "q_12_math_sa1",
        type: "short_answer",
        prompt: "بەپێی یاسای توان (Power Rule)، گرتەی نەخشەی f(x) = 5x^3 چییە؟",
        correctAnswer: "15x^2",
        explanation: "بەپێی یاسای توان، توانەکە دادەبەزێت و لێکدەدرێت بە هاوکۆلکەکە (3 * 5 = 15) و یەک لە توانەکە کەم دەبێتەوە، کەواتە وەڵام دەبێتە 15x^2.",
        conceptId: activeConceptId || "12_sci_math_con1",
        difficulty: "basic",
        source: "curriculum_generated"
      },
      {
        id: "q_12_math_sa2",
        type: "short_answer",
        prompt: "ئەگەر سنووری نەخشەیەک لە لای ڕاستەوە بەرەو ٥ بچێت و لە لای چەپەوە بەرەو ٥ بچێت، سنووری گشتی ئەو نەخشە لەو خاڵەدا چەندە؟",
        correctAnswer: "5",
        explanation: "کاتێک سنووری لای ڕاست و چەپ یەکسان بن، ئەوا سنووری گشتی هەیە و یەکسانە بە هەمان بەها کە لێرەدا ٥ـە.",
        conceptId: activeConceptId || "12_sci_math_con1",
        difficulty: "basic",
        source: "curriculum_generated"
      },
      {
        id: "q_12_math_sbs1",
        type: "step_by_step",
        prompt: "چۆن هاوکێشەی لێکەوتی نەخشەی y = x^2 لە خاڵی (1, 1) دەدۆزیتەوە؟ ڕوونی بکەرەوە.",
        correctAnswer: "گرتە، لێژ، هاوکێشە",
        explanation: "١. سەرەتا گرتە دەدۆزینەوە: y' = 2x. \n٢. بە دانانی x = 1 لێژی لێکەوتەکە دەدۆزینەوە کە دەکاتە m = 2. \n٣. هاوکێشەی لێکەوتەکە بە بەکارهێنانی y - y1 = m(x - x1) دەنووسین کە دەبێتە y - 1 = 2(x - 1) یان y = 2x - 1.",
        conceptId: activeConceptId || "12_sci_math_con1",
        difficulty: "advanced",
        source: "curriculum_generated"
      }
    ];
  }
  // =========================================================================
  // GRADE 12 SCIENTIFIC - PHYSICS
  // =========================================================================
  else if (grade === "12" && stream === "scientific" && cleanSubject === "physics") {
    questions = [
      {
        id: "q_12_phys_mc1",
        type: "multiple_choice",
        prompt: "بەپێی یاسای دووەمی نیوتن، ئەگەر هێزی گشتی سەر تەنێک دووجار زیاد بکات و بارستاییەکەی وەک خۆی بمێنێتەوە، تاودانەکەی چی بەسەر دێت؟",
        choices: ["نیوە دەبێت", "دووجار زیاد دەکات", "چوارجار زیاد دەکات", "بێگۆڕان دەمێنێتەوە"],
        correctAnswer: "دووجار زیاد دەکات",
        explanation: "تاودان (a = F/m) ڕاستەوانە گونجاوە لەگەڵ هێز. زیادبوونی هێز بە دووجار دەبێتە هۆی زیادبوونی تاودان بە دووجار.",
        conceptId: activeConceptId || "12_sci_phys_con1",
        difficulty: "intermediate",
        source: "curriculum_generated"
      },
      {
        id: "q_12_phys_mc2",
        type: "multiple_choice",
        prompt: "هێزێک بە بڕی ١٢ نیوتن کار دەکاتە سەر تەنێک بە بارستایی ٤ کگم. تاودانی تەنەکە چەندە؟",
        choices: ["3 m/s²", "48 m/s²", "8 m/s²", "1.5 m/s²"],
        correctAnswer: "3 m/s²",
        explanation: "یاسای دووەمی نیوتن دەڵێت F = m * a، کەواتە تاودان a = F / m = 12 / 4 = 3 m/s².",
        conceptId: activeConceptId || "12_sci_phys_con1",
        difficulty: "basic",
        source: "curriculum_generated"
      },
      {
        id: "q_12_phys_sa1",
        type: "short_answer",
        prompt: "یەکەی فەرمی پێوانەکردنی هێز لە سیستەمی نێودەوڵەتی یەکەکاندا (SI) چییە؟",
        correctAnswer: "نیوتن",
        explanation: "یەکەی نێودەوڵەتی بۆ هێز بریتییە لە نیوتن کە بە پیتی N هێما دەکرێت.",
        conceptId: activeConceptId || "12_sci_phys_con1",
        difficulty: "introductory",
        source: "curriculum_generated"
      },
      {
        id: "q_12_phys_sa2",
        type: "short_answer",
        prompt: "ئەگەر تەنێک بە بارستایی ٥ کگم بە تاودانی ٤ م/چرکە دووجا بجووڵێت، بڕی هێزی کارتێکەری گشتی چەندە بە نیوتن؟",
        correctAnswer: "20",
        explanation: "هێز F = m * a = 5 kg * 4 m/s² = 20 N.",
        conceptId: activeConceptId || "12_sci_phys_con1",
        difficulty: "basic",
        source: "curriculum_generated"
      },
      {
        id: "q_12_phys_sbs1",
        type: "step_by_step",
        prompt: "چۆن هێزی لێکخشاندنی تەنێک لەسەر ڕوویەکی لێژ دیاری دەکەیت؟ هەنگاوە سەرەکییەکان بنووسە.",
        correctAnswer: "کێش، هێزی ستوونی، هاوکۆلکەی لێکخشاندن",
        explanation: "١. کێشی تەنەکە تجزیە دەکەین بۆ سەر دوو تەوەرەی ستوونی و هاوتەریب بە ڕووەکە: Fg_y = m * g * cos(theta) و Fg_x = m * g * sin(theta). \n٢. هێزی ستوونی یەکسان دەکەین بە Fn = Fg_y. \n٣. هێزی لێکخشاندن ئەژمار دەکەین لە ڕێگەی Ff = mu * Fn.",
        conceptId: activeConceptId || "12_sci_phys_con1",
        difficulty: "advanced",
        source: "curriculum_generated"
      }
    ];
  }
  // =========================================================================
  // GRADE 12 SCIENTIFIC - CHEMISTRY
  // =========================================================================
  else if (grade === "12" && stream === "scientific" && cleanSubject === "chemistry") {
    questions = [
      {
        id: "q_12_chem_mc1",
        type: "multiple_choice",
        prompt: "کیمیای ئەندامی (Organic Chemistry) خوێندنی لێکدراوەکانی کام توخمە سەرەکییەیە؟",
        choices: ["هایدرۆجین", "ئۆکسجین", "کاربۆن", "نۆترۆجین"],
        correctAnswer: "کاربۆن",
        explanation: "کیمیای ئەندامی بریتییە لە کیمیای لێکدراوەکانی کاربۆن بەهۆی توانای ناوازەی کاربۆن بۆ بەستنی زنجیرە جۆراوجۆرەکان.",
        conceptId: activeConceptId || "12_sci_chem_con1",
        difficulty: "introductory",
        source: "curriculum_generated"
      },
      {
        id: "q_12_chem_mc2",
        type: "multiple_choice",
        prompt: "کام لەمانە فۆرمۆڵای گشتی ئەلکانەکان (Alkanes) نیشان دەدات؟",
        choices: ["CnH2n", "CnH2n+2", "CnH2n-2", "CnHn"],
        correctAnswer: "CnH2n+2",
        explanation: "ئەلکانەکان هایدرۆکاربۆنی تێرن و یاسای گشتی پێکهاتنیان بریتییە لە CnH2n+2.",
        conceptId: activeConceptId || "12_sci_chem_con1",
        difficulty: "intermediate",
        source: "curriculum_generated"
      },
      {
        id: "q_12_chem_sa1",
        type: "short_answer",
        prompt: "سادەترین هایدرۆکاربۆن کە تەنها یەک گەردیلەی کاربۆنی تێدایە ناوی چییە؟",
        correctAnswer: "میتان",
        explanation: "میتان (CH4) یەکەم و سادەترین ئەندامی زنجیرەی ئەلکانەکانە کە یەک کاربۆن و چوار هایدرۆجینی تێدایە.",
        conceptId: activeConceptId || "12_sci_chem_con1",
        difficulty: "basic",
        source: "curriculum_generated"
      },
      {
        id: "q_12_chem_sa2",
        type: "short_answer",
        prompt: "بەستەری نێوان کاربۆن-کاربۆن لە ئەلکینەکاندا (Alkenes) لە چ جۆرێکە؟ (تاک، دووجا یان سێجا)",
        correctAnswer: "دووجا",
        explanation: "ئەلکینەکان بەوە دەناسرێنەوە کە بەلایەنی کەمەوە خاوەنی یەک بەستەری هاوبەشی دووجا (Double Bond) بن لە نێوان گەردیلەکانی کاربۆندا.",
        conceptId: activeConceptId || "12_sci_chem_con1",
        difficulty: "basic",
        source: "curriculum_generated"
      },
      {
        id: "q_12_chem_sbs1",
        type: "step_by_step",
        prompt: "هەنگاوەکانی ناونانی هایدرۆکاربۆنێکی لقی بەپێی سیستەمی فەرمی IUPAC بنووسە.",
        correctAnswer: "دیاریکردنی درێژترین زنجیرە، ژمارەکردن، ناونانی لقەکان",
        explanation: "١. درێژترین زنجیرەی کاربۆنی بەردەوام دیاری دەکەین تا ببێتە ناوی بنچینەیی. \n٢. زنجیرەکە ژمارە دەکەین لەو لایەوەی کە لە لقەکانەوە نزیکترین بێت. \n٣. لقەکان بەپێی پیتە ئینگلیزییەکان لەپێش ناوی بنچینەیی دەنووسین لەگەڵ دیاریکردنی شوێنیان.",
        conceptId: activeConceptId || "12_sci_chem_con1",
        difficulty: "advanced",
        source: "curriculum_generated"
      }
    ];
  }
  // =========================================================================
  // GRADE 12 SCIENTIFIC - ENGLISH
  // =========================================================================
  else if (grade === "12" && stream === "scientific" && cleanSubject === "english") {
    questions = [
      {
        id: "q_12_eng_mc1",
        type: "multiple_choice",
        prompt: "Choose the correct Present Passive form: 'The homework ______ by the students every day.'",
        choices: ["is written", "writes", "is writing", "was written"],
        correctAnswer: "is written",
        explanation: "For present passive, we use 'is/are' + past participle (V3). Since 'homework' is singular, 'is written' is correct.",
        conceptId: activeConceptId || "12_sci_eng_con1",
        difficulty: "basic",
        source: "curriculum_generated"
      },
      {
        id: "q_12_eng_mc2",
        type: "multiple_choice",
        prompt: "What is the passive voice of: 'She cleans the room.'?",
        choices: [
          "The room is cleaned by her.",
          "The room cleans her.",
          "The room was cleaned by her.",
          "The room is cleaning by her."
        ],
        correctAnswer: "The room is cleaned by her.",
        explanation: "The object 'the room' becomes the subject, followed by 'is' (present simple passive helper) + V3 'cleaned' + 'by her'.",
        conceptId: activeConceptId || "12_sci_eng_con1",
        difficulty: "intermediate",
        source: "curriculum_generated"
      },
      {
        id: "q_12_eng_sa1",
        type: "short_answer",
        prompt: "Convert this active sentence to passive: 'Ali plays football.'",
        correctAnswer: "Football is played by Ali.",
        explanation: "The object 'Football' is singular, so we use 'is' + past participle of play which is 'played', followed by 'by Ali'.",
        conceptId: activeConceptId || "12_sci_eng_con1",
        difficulty: "basic",
        source: "curriculum_generated"
      },
      {
        id: "q_12_eng_sa2",
        type: "short_answer",
        prompt: "What is the past participle (V3) form of the verb 'write'?",
        correctAnswer: "written",
        explanation: "The verb 'write' is irregular: write (V1), wrote (V2), written (V3).",
        conceptId: activeConceptId || "12_sci_eng_con1",
        difficulty: "introductory",
        source: "curriculum_generated"
      },
      {
        id: "q_12_eng_sbs1",
        type: "step_by_step",
        prompt: "Explain the steps to convert a simple present active sentence to passive voice.",
        correctAnswer: "Identify object, choose is/are, past participle",
        explanation: "1. Find the object in the active sentence and put it at the start. \n2. Add 'is' or 'are' depending on whether the new subject is singular or plural. \n3. Change the main verb to its past participle (V3) form, and optionally add 'by + subject'.",
        conceptId: activeConceptId || "12_sci_eng_con1",
        difficulty: "advanced",
        source: "curriculum_generated"
      }
    ];
  }
  // =========================================================================
  // GRADE 9 GENERAL - MATH
  // =========================================================================
  else if (grade === "9" && cleanSubject === "math") {
    questions = [
      {
        id: "q_9_math_mc1",
        type: "multiple_choice",
        prompt: "لە هاوکێشەی ٣x = ١٢، بەهای x یەکسانە بە چەند؟",
        choices: ["3", "4", "9", "36"],
        correctAnswer: "4",
        explanation: "بۆ دۆزینەوەی بەهای x، هەردوو لایەنی هاوکێشەکە دابەشی ٣ دەکەین: x = 12 / 3 = 4.",
        conceptId: activeConceptId || "9_gen_math_con1",
        difficulty: "basic",
        source: "curriculum_generated"
      },
      {
        id: "q_9_math_mc2",
        type: "multiple_choice",
        prompt: "کاتێک ژمارەیەکی لێدەر (نێگەتیڤ) دەگوازینەوە بۆ ئەودیوی یەکسانە، نیشانەکەی چی لێدێت؟",
        choices: ["وەک خۆی دەمێنێتەوە", "دەبێتە کۆ (پۆزەتیڤ)", "دەبێتە لێکدان", "سفر دەبێتەوە"],
        correctAnswer: "دەبێتە کۆ (پۆزەتیڤ)",
        explanation: "لە کاتی گواستنەوەی ژمارەکان لە لایەکی هاوکێشە بۆ لایەکەی تر، نیشانەی کردارەکە پێچەوانە دەبێتەوە. لێدەر دەبێتە کۆ.",
        conceptId: activeConceptId || "9_gen_math_con1",
        difficulty: "introductory",
        source: "curriculum_generated"
      },
      {
        id: "q_9_math_sa1",
        type: "short_answer",
        prompt: "بەهای x بدۆزەوە لە هاوکێشەی: x + 7 = 15",
        correctAnswer: "8",
        explanation: "بە گواستنەوەی ٧ بۆ لایەکەی تر، دەبێتە لێدەر: x = 15 - 7 = 8.",
        conceptId: activeConceptId || "9_gen_math_con1",
        difficulty: "basic",
        source: "curriculum_generated"
      },
      {
        id: "q_9_math_sa2",
        type: "short_answer",
        prompt: "شیکاری هاوکێشەی 2x - 3 = 7 بریتییە لە چەند؟",
        correctAnswer: "5",
        explanation: "سەرەتا ٣ دەگوازینەوە: 2x = 7 + 3 کە دەکاتە 2x = 10. پاشان دابەشی ٢ دەکەین: x = 5.",
        conceptId: activeConceptId || "9_gen_math_con1",
        difficulty: "intermediate",
        source: "curriculum_generated"
      },
      {
        id: "q_9_math_sbs1",
        type: "step_by_step",
        prompt: "هەنگاوەکانی شیکارکردنی هاوکێشەی (3x + 4 = 19) بە ڕوونی بنووسە.",
        correctAnswer: "گواستنەوەی ٤، دابەشکردن بە ٣",
        explanation: "١. سەرەتا ژمارە ٤ دەگوازینەوە بۆ لای ڕاست بە پێچەوانەکردنی نیشانەکەی: 3x = 19 - 4 کە دەکاتە 3x = 15. \n٢. پاشان هەردوو لایەنی هاوکێشەکە دابەشی هاوکۆلکەی x دەکەین کە ٣ـە: x = 15 / 3. \n٣. وەڵامی کۆتایی دەبێتە x = 5.",
        conceptId: activeConceptId || "9_gen_math_con1",
        difficulty: "intermediate",
        source: "curriculum_generated"
      }
    ];
  }
  // =========================================================================
  // GRADE 10 GENERAL - MATH
  // =========================================================================
  else if (grade === "10" && cleanSubject === "math") {
    questions = [
      {
        id: "q_10_math_mc1",
        type: "multiple_choice",
        prompt: "یاسای مەمیز (Discriminant) لە هاوکێشەی دووجادا چییە؟",
        choices: ["b^2 - 4ac", "-b / 2a", "2a / b", "b^2 + 4ac"],
        correctAnswer: "b^2 - 4ac",
        explanation: "مەمیز بریتییە لە بەهای b^2 - 4ac کە دیاریکەری ژمارە و جۆری ڕەگەکانی هاوکێشەی دووجایە.",
        conceptId: activeConceptId || "10_gen_math_con1",
        difficulty: "basic",
        source: "curriculum_generated"
      },
      {
        id: "q_10_math_mc2",
        type: "multiple_choice",
        prompt: "ئەگەر بەهای مەمیز نێگەتیڤ بێت (بچووکتر لە سفر)، هاوکێشەکە چەند ڕەگی ڕاستەقینەی هەیە؟",
        choices: ["دوو ڕەگ", "یەک ڕەگ", "هیچ ڕەگێکی ڕاستەقینەی نییە", "سێ ڕەگ"],
        correctAnswer: "هیچ ڕەگێکی ڕاستەقینەی نییە",
        explanation: "کاتێک مەمیز کەمتر بێت لە سفر (نێگەتیڤ)، ناکرێت ڕەگی دووجا بۆ ژمارەی نێگەتیڤ لە ناو کۆمەڵەی ژمارە ڕاستەقینەکاندا دەربهێنرێت، بۆیە هیچ ڕەگێکی ڕاستەقینەی نییە.",
        conceptId: activeConceptId || "10_gen_math_con1",
        difficulty: "intermediate",
        source: "curriculum_generated"
      },
      {
        id: "q_10_math_sa1",
        type: "short_answer",
        prompt: "بەهای مەمیز بۆ هاوکێشەی x^2 - 4x + 4 = 0 چەندە؟",
        correctAnswer: "0",
        explanation: "لێرەدا a=1, b=-4, c=4. بە یاسای b^2 - 4ac: (-4)^2 - 4(1)(4) = 16 - 16 = 0.",
        conceptId: activeConceptId || "10_gen_math_con1",
        difficulty: "intermediate",
        source: "curriculum_generated"
      },
      {
        id: "q_10_math_sa2",
        type: "short_answer",
        prompt: "هاوکێشەی x^2 = 9 چەند ڕەگی ڕاستەقینەی هەیە؟",
        correctAnswer: "2",
        explanation: "بە دەرهێنانی ڕەگی دووجا بۆ لایەنی ڕاست، x دەبێتە +٣ یان -٣، کەواتە دوو ڕەگی جیاوازی هەیە.",
        conceptId: activeConceptId || "10_gen_math_con1",
        difficulty: "basic",
        source: "curriculum_generated"
      },
      {
        id: "q_10_math_sbs1",
        type: "step_by_step",
        prompt: "چۆن هاوکێشەی x^2 - 5x + 6 = 0 بە شێوازی شیکردنەوە بۆ هۆکارەکان چارەسەر دەکەیت؟",
        correctAnswer: "دۆزینەوەی دوو ژمارە، پێکهێنانی کەوانەکان",
        explanation: "١. دوو ژمارە دەدۆزینەوە کە لێکدانیان بکاتە ٦ و کۆکردنەوەیان بکاتە -٥. ئەو دوو ژمارەیە بریتین لە -٢ و -٣. \n٢. هاوکێشەکە دەکەینە دوو کەوانە: (x - 2)(x - 3) = 0. \n٣. کەواتە یان x - 2 = 0 کە لێیەوە x = 2، یان x - 3 = 0 کە لێیەوە x = 3. ڕەگەکان بریتین لە ٢ و ٣.",
        conceptId: activeConceptId || "10_gen_math_con1",
        difficulty: "advanced",
        source: "curriculum_generated"
      }
    ];
  }
  // =========================================================================
  // FALLBACK DYNAMIC SYSTEM (If matching curriculum is empty or not supported directly)
  // =========================================================================
  else {
    const conceptName = activeConceptTitle || "موضوعی وانە";
    const lessonName = activeLessonTitle || "وانەی فەرمی";
    const mappedSubject = cleanSubject === "math" ? "بیرکاری" : cleanSubject === "physics" ? "فیزیا" : cleanSubject === "chemistry" ? "کیمیا" : "ئینگلیزی";

    questions = [
      {
        id: `q_fb_mc1_${cleanSubject}`,
        type: "multiple_choice",
        prompt: `سەبارەت بە چەمکی “${conceptName}” لە بابەتەکانی پۆلی ${grade} ڕێڕەوی ${stream === "scientific" ? "زانستی" : (stream === "literary" ? "وێژەیی" : "گشتی")}، کام گوزارشت ڕاستە؟`,
        choices: [
          "ئەم بابەتە گرنگییەکی زۆری هەیە لە شیکارە وەزارییەکاندا",
          "ئەم چەمکە تەنها لە تاقیگەکاندا سوودی لێ دەبینرێت",
          "بایەخێکی زانستی کەمی هەیە لە پڕۆگرامەکەدا",
          "پێویست بە جێبەجێکردنی یاساکانی ناکات"
        ],
        correctAnswer: "ئەم بابەتە گرنگییەکی زۆری هەیە لە شیکارە وەزارییەکاندا",
        explanation: `چەمکی ${conceptName} یەکێکە لە گرنگترین بنەماکانی وانەی ${mappedSubject} بۆ پۆلی ${grade} کە هەمیشە بنەمای پرسیارە وەزارییەکانە.`,
        conceptId: activeConceptId,
        difficulty: "basic",
        source: "curriculum_generated"
      },
      {
        id: `q_fb_mc2_${cleanSubject}`,
        type: "multiple_choice",
        prompt: `ئەگەر بمانەوێت تێگەیشتنی تەواومان هەبێت لەسەر وانەی “${lessonName}”، یەکەمین هەنگاوی گونجاو چییە؟`,
        choices: [
          "تێگەیشتنی بنەما تیۆرییەکان و فۆرمۆڵەکان",
          "لەبەرکردنی پرسیارەکان بەبێ تێگەیشتن",
          "پشتگوێخستنی وانەکە و ڕۆشتن بۆ بەشی داهاتوو",
          "تەنها حەلکردنی تاقیکردنەوە فەرمییەکان"
        ],
        correctAnswer: "تێگەیشتنی بنەما تیۆرییەکان و فۆرمۆڵەکان",
        explanation: "تێگەیشتن لە بنەما تیۆرییەکان و شیکردنەوەی فۆرمۆڵەکان هەمیشە کلیلی بنەڕەتییە بۆ وەڵامدانەوەی سەرکەوتووانەی هەر پرسیارێکی زانستی.",
        conceptId: activeConceptId,
        difficulty: "intermediate",
        source: "curriculum_generated"
      },
      {
        id: `q_fb_sa1_${cleanSubject}`,
        type: "short_answer",
        prompt: `لە وانەی “${lessonName}”دا، ئایا تێگەیشتن لە لایەنە زانستییەکان گرنگترە یان تەنها لەبەرکردنی بێ تێگەیشتن؟ (وەڵام بدەوە بە: تێگەیشتن یان لەبەرکردن)`,
        correctAnswer: "تێگەیشتن",
        explanation: "مامۆستا زانا هەمیشە جەخت دەکاتەوە کە تێگەیشتنی لۆژیکی و زانستی زۆر گرنگترە لە لەبەرکردنی وشک بەبێ لێوردبوونەوە.",
        conceptId: activeConceptId,
        difficulty: "basic",
        source: "curriculum_generated"
      },
      {
        id: `q_fb_sa2_${cleanSubject}`,
        type: "short_answer",
        prompt: `پۆلێنی سەختی وانەی “${lessonName}” زیاتر سەر بە کام جۆرەیە؟ (سادە، ناوەندی یان قورس)`,
        correctAnswer: "ناوەندی",
        explanation: "ئەم بابەتە ئاستێکی ناوەندی مامناوەندی هەیە و بە کەمێک تەرکیز و مەشقکردنی گونجاو دەتوانیت نمرەی تەواوی تێدا بەدەستبهێنیت.",
        conceptId: activeConceptId,
        difficulty: "intermediate",
        source: "curriculum_generated"
      },
      {
        id: `q_fb_sbs1_${cleanSubject}`,
        type: "step_by_step",
        prompt: `هەنگاوە پێشنیارکراوەکانی مامۆستا زانا بۆ شیکارکردنی پرسیارە کردارییەکانی “${conceptName}” چییە؟`,
        correctAnswer: "خوێندنەوەی پرسیار، دەرهێنانی گۆڕاوەکان، بەکارهێنانی یاسا",
        explanation: "١. سەرەتا خوێندنەوەی وردی پرسیارەکە بۆ تێگەیشتنی مەبەست. \n٢. دەرهێنانی دروستی گۆڕاوە دراوەکان و نەزانراوەکان. \n٣. جێبەجێکردنی هاوکێشە یان یاسای زانستی گونجاو بۆ دەرخستنی وەڵامی کۆتایی.",
        conceptId: activeConceptId,
        difficulty: "advanced",
        source: "curriculum_generated"
      }
    ];
  }

  // Ensure exactly 5 questions are returned and formatted correctly
  return questions.slice(0, 5);
}
