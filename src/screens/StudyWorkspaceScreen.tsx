import { useState, useEffect } from "react";
import { StudentProfile } from "../features/student/studentTypes.ts";
import { useStudentProfile } from "../features/student/useStudentProfile.ts";
import { StudentIntelligenceEngine } from "../intelligence/StudentIntelligenceEngine.ts";
import { CurriculumIntelligenceEngine } from "../curriculum/CurriculumIntelligenceEngine.ts";
import { learningSessionEngineInstance } from "../session/LearningSessionEngine.ts";
import { CurriculumNode } from "../curriculum/types.ts";
import { LearningMode } from "../session/types.ts";
import { ZanaCard } from "../components/ZanaCard.tsx";
import { ZanaButton } from "../components/ZanaButton.tsx";
import { ExplainPanel } from "../features/study/explain/index.ts";
import { PracticePanel } from "../features/study/practice/index.ts";
import {
  ArrowLeft,
  BookOpen,
  Award,
  Sparkles,
  HelpCircle,
  FileText,
  Percent,
  Clock,
  BookMarked,
  Layers,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  Send,
  Check,
  Brain
} from "lucide-react";

// =========================================================================
// Kurdish Educational Content Database (Zero hardcoding fallback)
// =========================================================================
interface ExplanationStep {
  title: string;
  body: string;
}

interface PracticeQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface FormulaData {
  title: string;
  formula: string;
  variables: { symbol: string; meaning: string; unit?: string }[];
  usage: string;
}

interface WorkspaceContent {
  explainSteps: ExplanationStep[];
  practice: PracticeQuestion[];
  summary: string[];
  formula: FormulaData;
  smartQuestions: { q: string; a: string }[];
}

const WORKSPACE_CONTENT_DB: Record<string, WorkspaceContent> = {
  // MATH
  "12_sci_math_con1": {
    explainSteps: [
      {
        title: "سنوور (Limit) چییە؟",
        body: "سنوور بریتییە لە لێکۆڵینەوە لە ڕەفتاری نەخشەیەک کاتێک گۆڕاوەکەی (وەک x) لە بەهایەکی دیاریکراو نزیک دەبێتەوە، بەبێ مەرجی ئەوەی بگاتە خودی ئەو بەهایە."
      },
      {
        title: "نموونەی سادە بۆ سنوور",
        body: "سەیری نەخشەی f(x) = (x² - 1) / (x - 1) بکە لە کاتێکدا x دەبێتە ١. لەم خاڵەدا نەخشەکە دەبێتە 0/0 کە نەناسراوە، بەڵام بە نزیکبوونەوە لە ١، بەهای نەخشەکە لە ٢ نزیک دەبێتەوە. کەواتە سنوورەکەی یەکسانە بە ٢."
      },
      {
        title: "یاسای دابەشکردنی ڕاستەوخۆ",
        body: "یەکەم هەنگاو لە دۆزینەوەی سنووردا هەمیشە دابەشکردنی بەهای خاڵەکەیە لە نەخشەکەدا. ئەگەر ئەنجامەکە ژمارەیەکی ڕاستەقینە بوو، ئەوە سنوورەکەیە."
      }
    ],
    practice: [
      {
        question: "ئەگەر f(x) = 2x + 3 بێت، سنووری نەخشەکە کاتێک x نزیک دەبێتەوە لە ٢ چییە؟",
        options: ["٧", "٥", "٤", "٩"],
        correctIndex: 0,
        explanation: "بە دابەشکردنی ڕاستەوخۆ: f(2) = 2(2) + 3 = 4 + 3 = 7."
      },
      {
        question: "کاتێک دابەشکردنی ڕاستەوخۆی بەهایەک لە سنووردا بکاتە 0/0، دەبێت چی بکەین؟",
        options: ["نەخشەکە شی بکەینەوە بۆ لادانی دیارینەکراوی", "بڵێین سنوورەکە بوونی نییە", "ئەنجامەکە سفر دابنێین", "نەخشەکە پشتگوێ بخەین"],
        correctIndex: 0,
        explanation: "0/0 حاڵەتێکی دیارینەکراوە، بۆیە پێویستە بە شیکردنەوە (Factorization) یان لۆپیتاڵ دیارینەکراویەکە لابدەین."
      }
    ],
    summary: [
      "سنوور یارمەتیدەرە بۆ تێگەیشتن لەو خاڵانەی کە نەخشەی تێدا دیارینەکراوە.",
      "هەمیشە سەرەتا بە دابەشکردنی ڕاستەوخۆ دەست پێدەکەین بۆ دۆزینەوەی بەهای سنوور.",
      "سنووری لای ڕاست و لای چەپ دەبێت یەکسان بن بۆ ئەوەی سنوورەکە بوونی هەبێت."
    ],
    formula: {
      title: "یاسای سەرەکی جیاوازی دوو دووجا",
      formula: "a² - b² = (a - b)(a + b)",
      variables: [
        { symbol: "a", meaning: "تەرمی یەکەم" },
        { symbol: "b", meaning: "تەرمی دووەم" }
      ],
      usage: "ئەم یاسایە زۆر بەکار دێت بۆ سادەکردنەوەی سەرەوە و خوارەوەی کەرتەکان لە پرسیاری سنووردا بۆ لادانی دیارینەکراوی."
    },
    smartQuestions: [
      {
        q: "چی بکەم ئەگەر دابەشکردنی ڕاستەوخۆ ئەنجامەکەی بکاتە 0/0؟",
        a: "دەبێت نەخشەکە شیبکەینەوە (وەک بەکارهێنانی جیاوازی نێوان دوو دووجا بۆ سەرەوەی کەرتەکە) و پاشان ئەو تەرمەی دەبێتە هۆی 0/0 لابدەین."
      },
      {
        q: "ئایا هەمیشە سنوور بوونی هەیە لە هەموو خاڵێکدا؟",
        a: "نەخێر، بۆ نموونە ئەگەر سنووری لای چەپ و لای ڕاستی نەخشەیەک یەکسان نەبن، ئەوا نەخشەکە لەو خاڵەدا سنووری نییە."
      }
    ]
  },

  // PHYSICS
  "12_sci_phys_con1": {
    explainSteps: [
      {
        title: "یاسای دووەمی نیوتن چی دەڵێت؟",
        body: "یاسای دووەمی نیوتن پەیوەندی نێوان هێزی کارتێکەر، بارستایی، و تاودان دیاری دەکات. دەڵێت: تاودانی تەنێک ڕاستەوانە دەگۆڕێت لەگەڵ هێزی کارتێکەر و پێچەوانە دەگۆڕێت لەگەڵ بارستاییەکەی."
      },
      {
        title: "هاوکێشەی سەرەکی (F = m * a)",
        body: "هێزی کارتێکەری گشتی یەکسانە بە بارستایی تەنەکە جاران تاودانەکەی. هێز بە نیوتن (N)، بارستایی بە کیلۆگرام (kg) و تاودان بە مەتر لەسەر چرکە دووجایە (m/s²)."
      },
      {
        title: "کاریگەری لێکخشاندن لەسەر یاساکە",
        body: "ئەگەر هێزی لێکخشاندن هەبێت، دەبێت پێشتر هێزی گشتی ئەژمار بکرێت: هێزی بزوێنەر منهای هێزی بەرهەڵستکار یەکسانە بە m * a."
      }
    ],
    practice: [
      {
        question: "تەنێک بارستاییەکەی 5kgە، هێزێکی 20N کاری تێدەکات. تاودانی تەنەکە چەندە؟",
        options: ["4 m/s²", "10 m/s²", "100 m/s²", "0.25 m/s²"],
        correctIndex: 0,
        explanation: "یاسا: a = F / m. کەواتە: a = 20 / 5 = 4 m/s²."
      },
      {
        question: "ئەگەر هێزی سەر تەنێک جێگیر بێت و بارستاییەکەی دوو هێندە بکەین، تاودانەکەی چی بەسەر دێت؟",
        options: ["دەبێتە نیوە", "دوو هێندە دەبێت", "چوار هێندە دەبێت", "تێکناچێت و جێگیر دەبێت"],
        correctIndex: 0,
        explanation: "تاودان و بارستایی پێچەوانە دەگۆڕێن. زیادبوونی بارستایی دەبێتە هۆی کەمبوونەوەی تاودان بە هەمان ڕێژە."
      }
    ],
    summary: [
      "هێزی گشتی هەمیشە هاوتەریبە لەگەڵ ئاراستەی تاودان.",
      "ئەگەر هێزی گشتی سەر تەنێک سفر بێت، جووڵەکە بە خێراییەکی جێگیر دەبێت.",
      "بارستایی پێوەرە بۆ بەربەستی تەنەکە بۆ گۆڕینی باری جووڵەی خۆی (تەمەڵی)."
    ],
    formula: {
      title: "هاوکێشەی یاسای دووەمی نیوتن",
      formula: "F = m * a",
      variables: [
        { symbol: "F", meaning: "هێزی گشتی کارتێکەر", unit: "نیوتن (N)" },
        { symbol: "m", meaning: "بارستایی تەن", unit: "کیلۆگرام (kg)" },
        { symbol: "a", meaning: "تاودان", unit: "مەتر لەسەر چرکە دووجا (m/s²)" }
      ],
      usage: "ئەم یاسایە کلیلە بۆ شیکارکردنی سەرجەم بابەتەکانی جووڵە لەسەر زەوی و لە بۆشایی ئاسماندا."
    },
    smartQuestions: [
      {
        q: "جیاوازی نێوان کێش و بارستایی چییە؟",
        a: "بارستایی (Mass) بڕی ماددەیە و نەگۆڕە، بەڵام کێش (Weight) هێزی ڕاکێشانی زەوییە بۆ سەر تەنەکە کە بەپێی گرانشین دەگۆڕێت: W = m * g."
      },
      {
        q: "ئایا نیوتن یەکەی سەرەکییە؟",
        a: "بەڵێ، یەک نیوتن یەکسانە بە 1 kg·m/s² بەپێی هاوکێشەی یاساکە."
      }
    ]
  },

  // CHEMISTRY
  "12_sci_chem_con1": {
    explainSteps: [
      {
        title: "هایدرۆکاربۆنەکان چیین؟",
        body: "هایدرۆکاربۆنەکان ئەو لێکدراوە ئەندامیانەن کە تەنها لە دوو توخمی کاربۆن (C) و هایدرۆجین (H) پێکهاتوون."
      },
      {
        title: "ئەلکانەکان (Alkanes) چۆن دروست دەبن؟",
        body: "ئەلکانەکان هایدرۆکاربۆنی تێرن، بەو مانایەی کە تەواوی بەستەرەکانی نێوان گەردیلەکانی کاربۆن بەستەری تاکن (Single covalent bonds) کە زۆر بەهێزن لە جۆری سیگما."
      },
      {
        title: "یاسای گشتی ئەلکان",
        body: "یاسای گشتی پێکهاتەی گەردی ئەلکانەکان بریتییە لە C_n H_(2n+2). لێرەدا n ژمارەی گەردیلەکانی کاربۆن نیشان دەدات."
      }
    ],
    practice: [
      {
        question: "یاسای گشتی ئەلکانەکان کامەیە؟",
        options: ["C_n H_(2n+2)", "C_n H_2n", "C_n H_(2n-2)", "C_n H_(2n+1)"],
        correctIndex: 0,
        explanation: "ئەلکانەکان هایدرۆکاربۆنی تێرن و یاسای گشتییان C_n H_(2n+2)ە، لەکاتێکدا ئەلکینەکان C_n H_2nن."
      },
      {
        question: "سادەترین و یەکەم ئەندامی زنجیرەی ئەلکانەکان کام لێکدراوەیە؟",
        options: ["میسان (CH4)", "ئیسان (C2H6)", "پڕۆپان (C3H8)", "بۆتان (C4H10)"],
        correctIndex: 0,
        explanation: "میسان (CH4) یەک کاربۆنی هەیە و بچووکترین و سادەترین ئەلکانی هەیە."
      }
    ],
    summary: [
      "تەواوی بەستەرەکان لە ئەلکاندا لە جۆری سیگمایە (Sigma bond) کە جێگیرترین بەستەرە.",
      "هایدرۆکاربۆنە تێرەکان چالاکی کیمیاییان کەمترە بەهۆی قورسی شکاندنی بەستەرەکانیان.",
      "سەرچاوەی سەرەکی ئەلکانەکان بریتییە لە نەوتی خاو و غازی سروشتی."
    ],
    formula: {
      title: "یاسای پێکهاتەی گشتی ئەلکانەکان",
      formula: "C_n H_{2n+2}",
      variables: [
        { symbol: "C", meaning: "گەردیلەی کاربۆن" },
        { symbol: "H", meaning: "گەردیلەی هایدرۆجین" },
        { symbol: "n", meaning: "ژمارەی گەردیلەکانی کاربۆن (١، ٢، ٣، ...)" }
      ],
      usage: "ئەم یاسایە بەکاردێت بۆ دۆزینەوەی ژمارەی هایدرۆجین لە هەر ئەلکانێکدا ئەگەر ژمارەی کاربۆنەکە بزانین."
    },
    smartQuestions: [
      {
        q: "بۆچی ئەلکانەکان بە تێر ناو دەبرێن؟",
        a: "چونکە تەنها بەستەری تاکیان هەیە و زۆرترین بڕی هایدرۆجینی ممکنیان بەستووە، بۆیە توانای تێربوونی زیاتریان نەماوە بە بێ شکاندنی پێکهاتەکە."
      },
      {
        q: "سیستەمی ناونانی IUPAC چییە؟",
        a: "یەکێتی نێودەوڵەتی کیمیای پەتی و جێبەجێکراوە (IUPAC) کە ڕێسای زانستی داڕشتووە بۆ ناونانی فەرمی هەموو لێکدراوەکانی کیمیای ئەندامی."
      }
    ]
  },

  // ENGLISH
  "12_sci_eng_con1": {
    explainSteps: [
      {
        title: "What is Present Passive Voice?",
        body: "We use passive voice when we want to focus on the object (the receiver of the action) rather than the subject (the doer). The basic rule is to change the sentence focus."
      },
      {
        title: "Present Passive Structure",
        body: "The grammar formula for present simple passive is: Object + is / are + Verb (3rd form - Past Participle). Plural objects take 'are', while singular objects take 'is'."
      },
      {
        title: "Active vs. Passive Example",
        body: "Active: 'Zana studies physics.' -> Passive: 'Physics is studied by Zana.' Here, 'physics' becomes the main subject, followed by 'is' and 'studied' (V3 of study)."
      }
    ],
    practice: [
      {
        question: "Convert to present passive: 'The teacher explains the lesson.'",
        options: [
          "The lesson is explained by the teacher.",
          "The lesson explained the teacher.",
          "The lesson is explain by the teacher.",
          "The lesson was explained by the teacher."
        ],
        correctIndex: 0,
        explanation: "Present passive needs 'is' + V3 'explained'. Plural or past forms like 'was explained' are incorrect here."
      },
      {
        question: "When is passive voice preferred in English?",
        options: [
          "When the doer of the action is unknown, obvious, or unimportant",
          "When we want to speak faster",
          "Only in written exams",
          "To make sentences shorter"
        ],
        correctIndex: 0,
        explanation: "We use passive voice when the focus is on the action or the receiver of the action rather than who did it."
      }
    ],
    summary: [
      "Always move the direct object to the front of the passive sentence.",
      "Choose 'is' or 'are' depending on the new singular/plural subject.",
      "The main verb must always be converted to the 3rd form (Past Participle)."
    ],
    formula: {
      title: "Present Simple Passive Rule",
      formula: "Active Object + is / are + Past Participle (V3)",
      variables: [
        { symbol: "Object", meaning: "The direct object from the active sentence" },
        { symbol: "is/are", meaning: "Helping verb based on new singular/plural count" },
        { symbol: "V3", meaning: "Past Participle form of the active verb" }
      ],
      usage: "Essential for academic writing, scientific reports, and Sunrise 12 English grammar exam questions."
    },
    smartQuestions: [
      {
        q: "How can I include the active agent (doer) in the passive sentence?",
        a: "You can write the doer at the end of the sentence preceded by the preposition 'by' (e.g. 'by the teacher', 'by the software')."
      },
      {
        q: "What is the past participle of irregular verbs like 'write' and 'take'?",
        a: "The past participle of 'write' is 'written', and of 'take' is 'taken'. These are frequently tested in Sunrise 12."
      }
    ]
  }
};

// Default Fallback Generator (If no rich DB match)
function generateFallbackContent(node: CurriculumNode): WorkspaceContent {
  const nodeTitle = node.title || "ئەم بەشە";
  const objectives = node.learningObjectives && node.learningObjectives.length > 0 
    ? node.learningObjectives 
    : ["تێگەیشتنی تەواو لە چەمکی ئەم وانەیە"];

  return {
    explainSteps: [
      {
        title: `دەستپێک: تێگەیشتن لە ${nodeTitle}`,
        body: node.description || `لەم بەشەدا باس لە بنەماکانی ${nodeTitle} دەکرێت بە شێوەیەکی پڕاکتیکی بۆ بەدەستهێنانی نمرەی بەرز.`
      },
      {
        title: "مەبەستی سەرەکی خوێندنەکە",
        body: `ئامانجی سەرەکی ئەم بابەتە بریتییە لە: ${objectives.join("، ")}.`
      }
    ],
    practice: [
      {
        question: `کام یەک لەمانە ڕاستە سەبارەت بە ${nodeTitle}؟`,
        options: [
          "پێویستە یاساکانی بە دروستی جێبەجێ بکرێن بەپێی دەقی بابەتەکە",
          "تەنها لە حاڵەتی تاقیکردنەوەدا بەکاردێت",
          "گرنگییەکی ئەوتۆی نییە بۆ تاقیکردنەوەی کۆتایی",
          "بابەتێکی تەواو تیۆرییە و گرنگی پڕاکتیکی نییە"
        ],
        correctIndex: 0,
        explanation: "ئەم چەمکە گرنگییەکی زۆری هەیە و پێویستی بە تێگەیشتنی وردی یاسایی هەیە بۆ وەڵامدانەوەی خێرا."
      }
    ],
    summary: objectives.map(obj => `${obj} بە شێوەیەکی سەرکەوتوو.`),
    formula: {
      title: "پێوەرە بنەڕەتییەکانی چەمکەکە",
      formula: "ZANA = Focus + Mastery",
      variables: [
        { symbol: "Focus", meaning: "تەرکیزی فێربوون لەناو پۆلدا" },
        { symbol: "Mastery", meaning: "ئاستی جێگیربوونی زانیارییەکانت" }
      ],
      usage: "بەکاردێت بۆ سەرکەوتنی بەردەوام لە هەموو بابەتەکاندا."
    },
    smartQuestions: [
      {
        q: `چۆن ئەم بەشەی ${nodeTitle} لە تاقیکردنەوەدا دێت؟`,
        a: "بەزۆری لە شێوازی پرسیاری هەڵبژاردندا دێت کە تاقیکردنەوەی تێگەیشتنی بنەڕەتی و هاوکێشەکان دەکات."
      }
    ]
  };
}

// =========================================================================
// STUDY WORKSPACE SCREEN
// =========================================================================
interface StudyWorkspaceScreenProps {
  profile: StudentProfile;
  onNavigate: (tab: string) => void;
}

export function StudyWorkspaceScreen({ profile, onNavigate }: StudyWorkspaceScreenProps) {
  // 1. Get SIP & CIP Snapshots
  const sipEngine = StudentIntelligenceEngine.getInstance(profile);
  const sipSnapshot = sipEngine.getSnapshot();

  const cipEngine = new CurriculumIntelligenceEngine();
  const cipSnapshot = cipEngine.buildCurriculumIntelligenceSnapshot({
    grade: profile.grade,
    stream: profile.stream,
    subject: profile.activeSubject,
    completedNodeIds: Array.from(sipSnapshot.graph.completedNodeIds || [])
  });

  // 2. Load and Sync LSE Session Snapshot
  const [lseSnapshot, setLseSnapshot] = useState(() => {
    return learningSessionEngineInstance.initializeOrResume(
      profile,
      sipSnapshot,
      cipSnapshot
    );
  });

  const session = lseSnapshot.currentSession;
  const currentNodeId = session?.currentNodeId || "12_sci_math_con1";

  // Get active node details from CIP
  const availableNodes = cipSnapshot.resolution.availableNodes;
  const activeNode = (availableNodes.find(n => n.id === currentNodeId) || availableNodes[0] || {
    id: currentNodeId,
    type: "concept",
    title: "چەمکی خوێندن",
    description: "بابەتەکەت بخوێنە بۆ بەرزکردنەوەی ئاستت.",
    grade: profile.grade,
    stream: profile.stream,
    subject: profile.activeSubject,
    difficulty: "intermediate",
    prerequisiteIds: [],
    estimatedMinutes: 15,
    learningObjectives: ["تێگەیشتن لە چەمک"],
    tags: []
  }) as CurriculumNode;

  // Find parent chapter/lesson title dynamically
  const activeLesson = (availableNodes.find(n => n.id === session?.currentLessonId) || activeNode) as CurriculumNode;
  const activeChapter = (availableNodes.find(n => n.id === activeLesson.parentId) || {
    title: cipSnapshot.resolution.subjectLabel || "بەشی یەکەم"
  }) as CurriculumNode;

  // Find all concepts belonging to the same active lesson
  const lessonConcepts = availableNodes.filter(n => n.parentId === activeLesson.id && n.type === "concept");
  const completedConcepts = lessonConcepts.filter(c => session?.completedNodeIds.includes(c.id));
  const currentConcept = lessonConcepts.find(c => c.id === currentNodeId) || activeNode;
  const remainingConcepts = lessonConcepts.filter(c => c.id !== currentNodeId && !session?.completedNodeIds.includes(c.id));

  // Dynamic Workspace Content
  const content: WorkspaceContent = WORKSPACE_CONTENT_DB[currentNodeId] || generateFallbackContent(activeNode as CurriculumNode);

  // States
  const [activeAction, setActiveAction] = useState<"explain" | "practice" | "ask" | "summary" | "formula">("explain");
  const [explainStepIndex, setExplainStepIndex] = useState(0);
  
  // Practice states
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [practiceCompleted, setPracticeCompleted] = useState(false);

  // Ask states
  const [userQuestion, setUserQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<{ sender: "user" | "ai"; message: string }[]>([]);
  const [isAiResponding, setIsAiResponding] = useState(false);

  // Reset indices on concept shift
  useEffect(() => {
    setExplainStepIndex(0);
    setCurrentQuizIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setPracticeCompleted(false);
    setChatHistory([]);
    setUserQuestion("");
  }, [currentNodeId]);

  // UI helpers for subjects in Kurdish
  const subjectNameKurdish =
    profile.activeSubject === "math"
      ? "بیرکاری"
      : profile.activeSubject === "physics"
      ? "فیزیا"
      : profile.activeSubject === "chemistry"
      ? "کیمیا"
      : "ئینگلیزی";

  // Mode/Action labels
  const actionTabs = [
    { id: "explain" as const, label: "ڕوونکردنەوە", icon: Sparkles },
    { id: "practice" as const, label: "ڕاهێنان", icon: Award },
    { id: "ask" as const, label: "پرسیارکردن", icon: HelpCircle },
    { id: "summary" as const, label: "پوختە", icon: FileText },
    { id: "formula" as const, label: "یاساکان", icon: Brain }
  ];

  // Primary action: Progress in Pathway
  const handleContinueLearning = () => {
    if (!session) return;
    
    // Mark active node as completed & register study duration of 180 seconds (3 mins)
    const nextSnapshot = learningSessionEngineInstance.registerActivity(
      currentNodeId,
      "learn",
      true,
      180
    );

    setLseSnapshot(nextSnapshot);

    // If there is a next node, advance. Otherwise, show alert
    const nextNodeId = nextSnapshot.nextRecommendation || cipSnapshot.learningPath.orderedNodeIds.find(id => !nextSnapshot.currentSession?.completedNodeIds.includes(id));
    if (nextNodeId && nextSnapshot.currentSession) {
      nextSnapshot.currentSession.currentNodeId = nextNodeId;
      // Force update session to load next topic
      const updatedSnapshot = { ...nextSnapshot };
      setLseSnapshot(updatedSnapshot);
    }
  };

  // Submit User Custom Question in Ask panel
  const handleAskQuestion = (textToSend?: string) => {
    const questionText = textToSend || userQuestion;
    if (!questionText.trim() || isAiResponding) return;

    const newHistory = [...chatHistory, { sender: "user" as const, message: questionText }];
    setChatHistory(newHistory);
    setUserQuestion("");
    setIsAiResponding(true);

    // Simulate guided tutor response matching the current lesson constraints
    setTimeout(() => {
      // Find matching smart question
      const foundMatch = content.smartQuestions.find(
        sq => sq.q.toLowerCase().includes(questionText.toLowerCase()) || questionText.toLowerCase().includes(sq.q.toLowerCase())
      );

      let reply = "";
      if (foundMatch) {
        reply = foundMatch.a;
      } else {
        reply = `پەیوەست بە وانەی "${activeLesson.title}"، ${profile.name}ی خۆشەویست؛ پێویستە هەمیشە تەرکیز بخەینە سەر ${activeNode.title}. لەم بابەتەدا، جێبەجێکردنی دروستی بنەما و یاساکان گەرەنتی نمرەی بەرزە لە تاقیکردنەوەی کۆتایی. ئایا دەتەوێت زانیاری زیاترت پێبدەم لەسەر یەکێک لەم خاڵانە؟`;
      }

      setChatHistory([...newHistory, { sender: "ai" as const, message: reply }]);
      setIsAiResponding(false);
    }, 800);
  };

  // Handle Practice Quiz option click
  const handleOptionClick = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    const isCorrect = idx === content.practice[currentQuizIdx].correctIndex;

    // Trigger state save on LSE for a completed practice attempt
    if (isCorrect) {
      const nextSnapshot = learningSessionEngineInstance.registerActivity(
        currentNodeId,
        "practice",
        true,
        60
      );
      setLseSnapshot(nextSnapshot);
    }
  };

  const currentQuiz = content.practice[currentQuizIdx] || content.practice[0];

  return (
    <div className="flex-1 flex flex-col justify-start pb-8 space-y-5 select-none" dir="rtl">
      {/* 1. TOP APP BAR */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate("daily")}
            className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer text-xs font-sans font-bold"
          >
            <ArrowLeft className="w-4 h-4 flip-rtl" />
            <span>گۆڕەپانی سەرەکی</span>
          </button>

          <span className="font-sans text-[10px] font-bold text-slate-400">
            {profile.name} • {profile.grade} {profile.stream === "scientific" ? "زانستی" : "وێژەیی"}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-slate-50 pt-2.5">
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-blue-600">
              <BookOpen className="w-4 h-4 shrink-0" />
              <h1 className="font-sans font-black text-sm">{subjectNameKurdish}</h1>
            </div>
            <p className="font-sans text-xs font-medium text-slate-500 mt-0.5 leading-snug">
              {activeLesson.title}
            </p>
          </div>

          <div className="text-left flex flex-col items-end">
            <span className="font-sans text-xs font-black text-blue-600 flex items-center gap-0.5">
              <span>{session?.completionPercentage || 0}</span>
              <Percent className="w-3 h-3" />
            </span>
            <span className="font-sans text-[9px] text-slate-400 mt-0.5">پێشکەوتنی گشتی</span>
          </div>
        </div>

        {/* Global Progress Line bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${session?.completionPercentage || 0}%` }}
          ></div>
        </div>
      </div>

      {/* 2. LEARNING CARD (Details of Current Lesson) */}
      <ZanaCard
        className="border-blue-100/30 relative overflow-hidden"
        header={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="font-sans text-xs font-bold text-slate-700">کۆرتەی زانستی وانە</span>
            </div>
            <span className="font-sans text-[10px] font-bold text-slate-400 leading-none">
              {activeChapter.title}
            </span>
          </div>
        }
      >
        <div className="space-y-4 text-right">
          <div>
            <h2 className="font-sans font-black text-base text-slate-900 leading-tight">
              {activeNode.title}
            </h2>
            <p className="font-sans text-xs text-slate-500 mt-1.5 leading-relaxed">
              {activeNode.description || "پوختە و شیبی دروستی چەمکەکە لەگەڵ کۆمەڵێک نموونەی کردارەکی."}
            </p>
          </div>

          {/* Quick specs metadata banner */}
          <div className="flex flex-wrap gap-2.5 border-t border-slate-50 pt-3">
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-sans">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>ماوەی پێشنیارکراو: {activeNode.estimatedMinutes || 15} خولەک</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5 text-[9px] font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-slate-600">ئاستی {
                activeNode.difficulty === "basic" || activeNode.difficulty === "introductory" ? "سەرەتا" :
                activeNode.difficulty === "intermediate" ? "مامناوەند" :
                activeNode.difficulty === "advanced" ? "پێشکەوتوو" : "ئاستی وەزاری"
              }</span>
            </div>
          </div>
        </div>
      </ZanaCard>

      {/* 3. CORE SESSION METRICS */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs text-right space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
            <h3 className="font-sans font-bold text-xs text-slate-800">هاوسەنگی ئامانجی وانەکە</h3>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-sans">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>ماوەی ماوە: {session?.estimatedRemainingMinutes || 15} خولەک</span>
          </div>
        </div>

        {/* Dynamic Concept Visualizer */}
        <div className="flex items-center gap-2 flex-wrap mt-1">
          {/* Completed concepts */}
          {completedConcepts.map(c => (
            <div key={c.id} className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1 text-[10px] font-sans text-emerald-800 font-bold">
              <Check className="w-3 h-3" />
              <span>{c.title.replace("چەمک:", "").trim()}</span>
            </div>
          ))}

          {/* Current concept */}
          <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 text-[10px] font-sans text-blue-800 font-bold ring-2 ring-blue-100 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            <span>{currentConcept.title.replace("چەمک:", "").trim()}</span>
          </div>

          {/* Remaining concepts */}
          {remainingConcepts.map(c => (
            <div key={c.id} className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 text-[10px] font-sans text-slate-400">
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span>{c.title.replace("چەمک:", "").trim()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. AI GUIDED TEACHING AREA */}
      <ZanaCard
        className="border-slate-100/80 shadow-md relative min-h-[220px]"
        header={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-blue-600 animate-pulse shrink-0" />
              <span className="font-sans text-xs font-black text-slate-800">
                {activeAction === "explain" && "ڕوونکردنەوەی فێربوونی زیرەک"}
                {activeAction === "practice" && "سەکۆی ڕاهێنانی بەهێزکەر"}
                {activeAction === "ask" && "بەرەی وەڵامدانەوەی خێرا"}
                {activeAction === "summary" && "تەوەر و خاڵە سەرەکییەکان"}
                {activeAction === "formula" && "هاوکێشە و یاسا سەرەکییەکان"}
              </span>
            </div>
            <span className="font-sans text-[10px] font-bold text-slate-400">مامۆستا زانا</span>
          </div>
        }
      >
        <div className="text-right space-y-4">
          {/* TAB 1: EXPLAIN */}
          {activeAction === "explain" && (
            <ExplainPanel
              studentProfile={profile}
              curriculumSnapshot={cipSnapshot}
              sessionSnapshot={lseSnapshot}
              onNavigate={onNavigate}
              onNextStep={() => setActiveAction("practice")}
            />
          )}

          {/* TAB 2: PRACTICE */}
          {activeAction === "practice" && (
            <PracticePanel
              studentProfile={profile}
              curriculumSnapshot={cipSnapshot}
              sessionSnapshot={lseSnapshot}
              onNavigate={onNavigate}
              onConceptCompleted={handleContinueLearning}
            />
          )}

          {/* TAB 3: ASK */}
          {activeAction === "ask" && (
            <div className="space-y-4">
              {/* Question list overlay if history empty */}
              {chatHistory.length === 0 && (
                <div className="space-y-2.5">
                  <p className="font-sans text-xs text-slate-400">وەڵامی خێرا بۆ ئەو پرسیارانەی لە مێشکت دان:</p>
                  <div className="space-y-1.5">
                    {content.smartQuestions.map((sq, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAskQuestion(sq.q)}
                        className="w-full p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-right font-sans text-xs text-slate-700 flex items-center justify-between hover:border-slate-200 transition-all cursor-pointer min-h-[48px]"
                      >
                        <span className="truncate pr-1">{sq.q}</span>
                        <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Scroll area */}
              {chatHistory.length > 0 && (
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                  {chatHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-2.5 ${item.sender === "user" ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`p-3 rounded-2xl max-w-[85%] text-xs font-sans leading-relaxed ${
                          item.sender === "user"
                            ? "bg-blue-600 text-white rounded-tr-none"
                            : "bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-none"
                        }`}
                      >
                        {item.message}
                      </div>
                    </div>
                  ))}
                  {isAiResponding && (
                    <div className="text-left font-sans text-[10px] text-slate-400 italic">زانا لە کاتی بیرکردنەوە و وەڵامدانەوەدایە...</div>
                  )}
                </div>
              )}

              {/* Input bar */}
              <div className="flex gap-2 border-t border-slate-50 pt-3">
                <input
                  type="text"
                  value={userQuestion}
                  onChange={(e) => setUserQuestion(e.target.value)}
                  placeholder="لێرە هەر پرسیارێکی زانستیت هەیە بنووسە..."
                  onKeyDown={(e) => e.key === "Enter" && handleAskQuestion()}
                  className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl font-sans text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-right min-h-[44px]"
                />
                <button
                  onClick={() => handleAskQuestion()}
                  className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SUMMARY */}
          {activeAction === "summary" && (
            <div className="space-y-3.5">
              <p className="font-sans text-xs text-slate-500">ئامانج و گرنگترین تەوەرەکانی ئەم بابەتە:</p>
              <div className="space-y-2">
                {content.summary.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                    <p className="font-sans text-xs text-slate-600 leading-normal">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: FORMULA */}
          {activeAction === "formula" && (
            <div className="space-y-3.5">
              <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 text-center">
                <span className="font-sans text-[10px] text-slate-400 block mb-1">{content.formula.title}</span>
                <p className="font-mono text-base font-bold text-blue-800 tracking-wide">{content.formula.formula}</p>
              </div>

              {/* Variables breakdown */}
              <div className="space-y-2">
                <h5 className="font-sans font-bold text-[10px] text-slate-400">پێناسەی گۆڕاوەکان:</h5>
                <div className="grid grid-cols-2 gap-2">
                  {content.formula.variables.map((v, idx) => (
                    <div key={idx} className="bg-white border border-slate-50 rounded-lg p-2 flex items-center justify-between text-right">
                      <span className="font-mono text-xs font-black text-blue-600 shrink-0">{v.symbol}</span>
                      <span className="font-sans text-[10px] text-slate-500 mr-2 truncate">{v.meaning} {v.unit ? `(${v.unit})` : ""}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Usage notes */}
              <p className="font-sans text-[10px] text-slate-400 leading-relaxed border-t border-slate-50 pt-2.5">
                {content.formula.usage}
              </p>
            </div>
          )}
        </div>
      </ZanaCard>

      {/* 5. BOTTOM ACTION CARDS */}
      <div className="grid grid-cols-5 gap-2">
        {actionTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeAction === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveAction(tab.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? "bg-blue-600 border-blue-600 text-white shadow-md scale-102"
                  : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive ? "scale-110" : ""} transition-transform shrink-0`} />
              <span className="font-sans text-[9px] font-bold tracking-tight text-center truncate w-full leading-none mt-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 6. PRIMARY ACTION: CONTINUE LEARNING */}
      <ZanaButton
        variant="primary"
        fullWidth
        onClick={handleContinueLearning}
        className="shadow-md min-h-[50px] text-sm font-bold"
      >
        <span>هەنگاوی داهاتووی خوێندن</span>
        <ArrowLeft className="w-5 h-5 mr-2 rotate-180" />
      </ZanaButton>
    </div>
  );
}
