import { StudentProfile } from "../../student/studentTypes.ts";
import { CurriculumIntelligenceSnapshot, CurriculumNode } from "../../../curriculum/types.ts";
import { SessionSnapshot } from "../../../session/types.ts";
import { ExplainSnapshot, ExplainSection } from "./explainTypes.ts";
import { DomainClock } from "../../../domain/DomainClock.ts";

export interface ExplainModeInput {
  studentProfile: StudentProfile;
  curriculumSnapshot: CurriculumIntelligenceSnapshot;
  sessionSnapshot: SessionSnapshot;
  brainOutput?: string;
}

// Map difficulty labels to formal Kurdish Sorani
export function getDifficultyLabelKu(difficulty: string): string {
  switch (difficulty) {
    case "introductory":
    case "basic":
      return "سەرەتا";
    case "intermediate":
      return "مامناوەند";
    case "advanced":
      return "پێشکەوتوو";
    case "exam_level":
      return "ئاستی وەزاری";
    default:
      return "مامناوەند";
  }
}

// In-memory rich pedagogical curriculum content for key concepts
const DETAILED_CONCEPTS_DB: Record<string, {
  theory: string;
  steps: string;
  example: string;
  commonMistake: string;
  miniPractice: string;
  nextStep: string;
}> = {
  "12_sci_math_con1": {
    theory: "سنوور (Limit) لە بیرکاریدا بریتییە لە دیاریکردنی بەهایەک کە نەخشەکە تادێت لێی نزیک دەبێتەوە کاتێک گۆڕاوەکە لە ژمارەیەکی دیاریکراو نزیک بێتەوە. ئەمە بنەمای سەرەکی جیاکاری و تەواوکارییە.",
    steps: "بۆ دۆزینەوەی سنووری نەخشەیەک:\n١. یەکەمجار دابەشکردنی ڕاستەوخۆ بکە.\n٢. ئەگەر بەهاکە دیار بوو، ئەوا ئەوە وەڵامەکەیە.\n٣. ئەگەر گەیشتیتە حاڵەتی 0/0 (دیارینەکراو)، پێویستە بە شیکردنەوەی سەرەوە و خوارەوەی کورتەکە ئەو بەشە لابدەیت کە کێشەکە دروست دەکات، پاشان دووبارە دابەشکردنەکە بکەیتەوە.",
    example: "دۆزینەوەی سنووری lim (x -> 3) بۆ نەخشەی (x² - 9) / (x - 3):\n- بە دابەشکردنی ڕاستەوخۆ دەبێتە: (9 - 9) / (3 - 3) = 0/0.\n- شیکردنەوەی کەرتی سەرەوە: (x - 3)(x + 3).\n- لادانی (x - 3) لە سەرەوە و خوارەوە، دەمێنێتەوە: x + 3.\n- ئێستا ٣ دابەش بکە: 3 + 3 = 6.",
    commonMistake: "زۆرێک لە قوتابیان کاتێک لە دابەشکردنی ڕاستەوخۆدا دەگەنە 0/0، وا تێدەگەن کە سنوورەکە بوونی نییە یان وەڵامەکە سفرە. ئەمە هەڵەیە! 0/0 تەنها نیشانەی ئەوەیە کە دەبێت ڕێگایەکی تر وەک شیکردنەوە بەکاربهێنرێت بۆ لادانی دیارینەکراوی.",
    miniPractice: "سنووری lim (x -> 1) بۆ نەخشەی (x² - 1) / (x - 1) بدۆزەرەوە.\nڕێنوێنی: سەرەتا سەرەوەی کەرتەکە شیبکەرەوە پاشان تاقی بکەرەوە.",
    nextStep: "ئێستا کە فێری چەمکی سەرەکی سنوور بوویت، پێشنیار دەکەین سەردانی بەشی 'ڕاهێنان' بکەیت بۆ تاقیکردنەوەی تواناکانت لەسەر پرسیارە جۆراوجۆرەکان."
  },
  "12_sci_phys_con1": {
    theory: "یاسای دووەمی نیوتن دیاریدەکات کە کاتێک هێزێکی دەرەکی کارتێکەر کار بکاتە سەر تەنێک، تاودانێکی پێدەبەخشێت کە هاوڕێژەیە لەگەڵ هێزەکە و پێچەوانە هاوڕێژەیە لەگەڵ بارستایی تەنەکە.",
    steps: "بۆ شیکارکردنی پرسیارەکانی یاسای دووەمی نیوتن:\n١. هێزە دەرەکییەکان و بارستایی تەنەکە دیاری بکە.\n٢. هاوکێشەی F = m * a بەکار بهێنە.\n٣. ئەگەر لێکخشاندن یان بەربەستی هەوا هەبوو، پێشتر هێزی گشتی (F_net) ئەژمار بکە بە کەمکردنەوەی هێزە دژبەرەکان.",
    example: "تەنێک بارستاییەکەی 10 kgە، هێزێکی 30 N کاری تێدەکات لەگەڵ هێزی لێکخشاندنی 10 N کە دژی جووڵەکەیە. تاودانی تەنەکە چەندە؟\n- سەرەتا هێزی گشتی بدۆزەرەوە: F_net = 30 - 10 = 20 N.\n- بەکارهێنانی یاسا: a = F_net / m.\n- تاودان: a = 20 / 10 = 2 m/s².",
    commonMistake: "پێش بڕیاردان لەسەر تاودان، هەمیشە هێزی لێکخشاندن یان هێزە دژبەرەکان لەبیر مەکە! کەمکردنەوەی هێزەکان هەنگاوێکی زۆر گرنگە کە زۆرجار پشتگوێ دەخرێت.",
    miniPractice: "ئەگەر تەنێک بە هێزی 50 N تاودانێکی 5 m/s² وەرگرێت، بارستایی ئەم تەنە چەند کیلۆگرامە؟",
    nextStep: "یاساکە بە تەواوی ڕوونە! هەنگاوی داهاتوو سەیری بەشی 'یاساکان' بکە بۆ بینینی فۆرمۆلەی تەواو لەگەڵ یەکە جیاوازەکان."
  },
  "12_sci_chem_con1": {
    theory: "ئەلکانەکان (Alkanes) هایدرۆکاربۆنی تێرن کە تەنها لە بەستەری یەکەمی سیگما پێکهاتوون لە نێوان کاربۆن و هایدرۆجیندا. ئەمەش وا دەکات کەمتر چالاک بن لە ڕووی کیمیاییەوە.",
    steps: "بۆ ناسینەوە و ناونانی ئەلکانەکان:\n١. یاسای گشتی C_n H_{2n+2} جێبەجێ بکە.\n٢. زنجیرە کاربۆنییە درێژەکە دیاری بکە بۆ ناونانی بنەڕەتی.\n٣. ژمارەی کاربۆنەکان بدۆزەرەوە و پاشگری (ـان) بەکاربهێنە (بۆ نموونە: میسان، ئیسان، پڕۆپان).",
    example: "ئەگەر لێکدراوێکی ئەندامی 5 گەردیلەی کاربۆنی تێدابێت، ناوی چییە و چەند گەردیلەی هایدرۆجینی هەیە؟\n- کاربۆن n = 5.\n- ژمارەی هایدرۆجین: 2n + 2 = 2(5) + 2 = 12.\n- فۆرمۆلەی گەردی: C5H12.\n- ناوەکەی بریتییە لە: پێنتان (Pentane).",
    commonMistake: "تێکەڵکردنی ئەلکانەکان لەگەڵ ئەلکینەکان (ئەوانەی بەستەری دووجایان هەیە) هەڵەیەکی بەربڵاوە. لەبیرت بێت ئەلکانەکان تەنها بەستەری تاکیان هەیە و زۆرترین هایدرۆجینی ممکنیان بەستووە.",
    miniPractice: "فۆرمۆلەی گەردی لێکدراوی 'بۆتان' (Butane) بنووسە کە 4 کاربۆنی هەیە.",
    nextStep: "ناوازەیە! دەتوانیت لە بەشی 'پوختە' سەرجەم لێکەوتەکانی تری ئەلکان و تایبەتمەندییە فیزیکییەکانیان ببینی."
  },
  "12_sci_eng_con1": {
    theory: "In English, we use the Passive Voice when the action itself, or the receiver of the action, is more important than who did it. (لە زمانی ئینگلیزیدا، ڕاناوی نادیار بەکاردەهێنرێت کاتێک خودی کردارەکە یان وەرگری کردارەکە گرنگتر بێت لە ئەنجامدەری کردارەکە).",
    steps: "To change a sentence into present simple passive:\n1. Identify the Object and move it to the front.\n2. Choose 'is' (for singular objects) or 'are' (for plural objects).\n3. Change the main verb to its Past Participle (V3) form.\n4. Optionally, add 'by + subject' at the end.",
    example: "Active: 'He cleans the rooms every day.'\n- Step 1 (Object): 'The rooms'\n- Step 2 (Helping Verb): 'are' (plural)\n- Step 3 (V3): 'cleaned'\n- Passive: 'The rooms are cleaned every day.'",
    commonMistake: "Many students make the mistake of using the past tense (V2) instead of the past participle (V3) or forgetting to use 'is/are' completely. Always remember: is/are + V3!",
    miniPractice: "Rewrite in Present Passive: 'Zana writes the homework.'",
    nextStep: "Excellent work! Now jump into the 'Ask' tab to practice converting more irregular verbs into passive voice with Teacher Zana."
  }
};

export class ExplainModeEngine {
  public static buildExplainSnapshot(input: ExplainModeInput): ExplainSnapshot {
    const { studentProfile, curriculumSnapshot, sessionSnapshot } = input;

    const availableNodes = curriculumSnapshot.resolution.availableNodes;
    const session = sessionSnapshot.currentSession;
    
    // Determine active concept node
    const currentNodeId = session?.currentNodeId || "12_sci_math_con1";
    
    // Find matching curriculum node
    let activeNode = availableNodes.find(n => n.id === currentNodeId);
    
    const warnings: string[] = [];

    // Fallback if node is not found in CIP
    if (!activeNode) {
      activeNode = availableNodes[0] || {
        id: currentNodeId,
        type: "concept",
        title: "چەمکی خوێندن",
        description: "تێگەیشتن لەم بەشە بۆ سەرکەوتن لە تاقیکردنەوە.",
        grade: studentProfile.grade,
        stream: studentProfile.stream,
        subject: studentProfile.activeSubject,
        difficulty: "intermediate",
        prerequisiteIds: [],
        estimatedMinutes: 15,
        learningObjectives: [],
        tags: []
      };
      warnings.push("ئاگاداری: چەمکی داواکراو لە پلانی خوێندنی چالاکدا نەدۆزرایەوە، بابەتێکی نزیک پیشان دراوە.");
    }

    // Dynamic resolution of parent nodes
    const activeLesson = availableNodes.find(n => n.id === activeNode?.parentId) || activeNode;

    const subjectLabel = curriculumSnapshot.resolution.subjectLabel || "وانە";
    const gradeLabel = curriculumSnapshot.resolution.gradeLabel || "پۆل";
    const streamLabel = curriculumSnapshot.resolution.streamLabel || "لقی";
    const difficultyLabel = getDifficultyLabelKu(activeNode.difficulty);

    // Load rich concept content or generate default fallback content
    const conceptData = DETAILED_CONCEPTS_DB[activeNode.id] || {
      theory: activeNode.description || `لەم بەشەدا بە وردی تیشک دەخرێتە سەر بنەما تیۆرییەکانی چەمکی ${activeNode.title} بۆ گەیشتن بە ئاستێکی جێگیر.`,
      steps: `بۆ جێبەجێکردنی ئەم بابەتە:\n١. سەرەتا پێناسە سەرەکییەکە بە تەواوی بخوێنەوە.\n٢. تێبینی ڕێساکان و بەستەری هاوکێشەکان بکە.\n٣. چەند نموونەیەکی کرداری لەسەر بابەتەکە شی بکەرەوە.`,
      example: `لەم بابەتەدا یەکێک لە نموونە هەرە باوەکان بریتییە لە جێبەجێکردنی یاسا ڕاستەوخۆکان بۆ وەڵامدانەوەی خێرا بەپێی نەخشە و زانیارییە دراوەکان.`,
      commonMistake: "هەڵەی باو لەم چەمکەدا بریتییە لە تێکەڵکردنی یاسا لاوەکییەکان یان پەلەکردن لە لێکدانەوەی زانیارییەکانی پرسیارەکە بەبێ سەرنجدانی ورد.",
      miniPractice: `پەیوەست بە بابەتەکە، هەوڵبدە هاوکێشەی بنەڕەتی ${activeNode.title} بۆ پرسیارێکی کورت تاقی بکەیتەوە.`,
      nextStep: "ئێستا کە سەرجەم لایەنەکانت خوێندەوە، ئامادەی بۆ ئەوەی لە بەشی ڕاهێنان چەند پرسیارێکی سەرەکی تاقی بکەیتەوە."
    };

    // Construct the structured sections
    const sections: ExplainSection[] = [
      {
        id: "sec_theory",
        type: "theory",
        title: "تەوەر و سەرنجی سەرەکی (Theory)",
        body: conceptData.theory,
        order: 1
      },
      {
        id: "sec_steps",
        type: "steps",
        title: "هەنگاو بە هەنگاو بۆ شیکار (Steps)",
        body: conceptData.steps,
        order: 2
      },
      {
        id: "sec_example",
        type: "example",
        title: "نموونەی شیکارکراوی پڕاکتیکی (Worked Example)",
        body: conceptData.example,
        order: 3
      },
      {
        id: "sec_common_mistake",
        type: "common_mistake",
        title: "ئاگاداربە! هەڵەی باوی قوتابیان (Common Mistake)",
        body: conceptData.commonMistake,
        order: 4
      },
      {
        id: "sec_mini_practice",
        type: "mini_practice",
        title: "ڕاهێنانی کورت بۆ جێگیرکردن (Mini Practice)",
        body: conceptData.miniPractice,
        order: 5
      },
      {
        id: "sec_next_step",
        type: "next_step",
        title: "دواتر چی بکەم؟ (Next Recommendation)",
        body: conceptData.nextStep,
        order: 6
      }
    ];

    return {
      generatedAt: DomainClock.nowIso(),
      lessonTitle: activeLesson.title,
      conceptTitle: activeNode.title,
      subjectLabel,
      gradeLabel,
      streamLabel,
      difficultyLabel,
      estimatedMinutes: activeNode.estimatedMinutes || 15,
      sections,
      warnings
    };
  }
}
