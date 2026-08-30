import { useEffect, useRef, useState } from "react";
import { StudentProfile, ZanaStorage } from "../services/storage.ts";
import { useTutorChat } from "../features/chat/useTutorChat.ts";
import { ChatMessage } from "../features/chat/ChatMessage.tsx";
import { ChatInput } from "../features/chat/ChatInput.tsx";
import { LoadingDots } from "../components/LoadingDots.tsx";
import { AdaptiveLearningEngine } from "../learning/engine/AdaptiveLearningEngine.ts";
import { DifficultyLevel, MasteryStatus } from "../learning/domain/MasteryTypes.ts";
import { XWENDN_PILOT_LESSONS } from "../curriculum/providers/XwendnCurriculumProvider.ts";
import {
  Trash2,
  BookOpen,
  Sparkles,
  Award,
  HelpCircle,
  Brain,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ChevronDown
} from "lucide-react";

interface PracticeItem {
  id: string;
  lessonId: string;
  conceptTitle: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: DifficultyLevel;
  nextConceptRecommendation?: string;
}

const PILOT_PRACTICE_ITEMS: PracticeItem[] = [
  {
    id: "chem_prac_1",
    lessonId: "xwendn-g12-chem-l1",
    conceptTitle: "ترشی برۆنستد-لۆری و جووتە هاوجوت",
    question: "لە کارلێکی: NH₃ + H₂O ⇌ NH₄⁺ + OH⁻ ، جووتی هاوجوتی ئاو (H₂O) کامەیە؟",
    options: ["OH⁻", "NH₄⁺", "NH₃", "H₃O⁺"],
    correctIndex: 0,
    explanation: "ئاو (H₂O) پرۆتۆنێک دەبەخشێت و دەگۆڕێت بۆ OH⁻، کەواتە OH⁻ بریتییە لە تفتی هاوجوتی ئاو.",
    difficulty: DifficultyLevel.STANDARD,
    nextConceptRecommendation: "پێوەری pH و هاوسەنگی ئایۆنیی ئاو"
  },
  {
    id: "chem_prac_2",
    lessonId: "xwendn-g12-chem-l2",
    conceptTitle: "پێوەری pH و هاوسەنگی ئاو",
    question: "ئەگەر خەستی ئایۆنی هایدرۆنیۆم [H₃O⁺] = 1.0 × 10⁻⁴ M بێت لە پلەی 25°C، بەهای pH چەندە؟",
    options: ["4.0", "10.0", "7.0", "14.0"],
    correctIndex: 0,
    explanation: "بەپێی یاسای pH = -log[H₃O⁺] دەبێتە: pH = -log(10⁻⁴) = 4.0 (گیراوەی ترش).",
    difficulty: DifficultyLevel.STANDARD,
    nextConceptRecommendation: "کارلێکەکانی ئۆکسان و داڕزان"
  },
  {
    id: "chem_prac_3",
    lessonId: "xwendn-g12-chem-l3",
    conceptTitle: "ژمارەی ئۆکسان و نیوە کارلێکەکان",
    question: "لە گۆڕانی Zn(s) ➔ Zn²⁺(aq) + 2e⁻ ، کام کرداری کارەبایی ڕوویداوە؟",
    options: ["ئۆکسان (لەدەستدانی ئەلیکترۆن)", "داڕزان (وەرگرتنی ئەلیکترۆن)", "هاوتایی", "شیبوونەوە"],
    correctIndex: 0,
    explanation: "تووتیا (Zn) ئەلیکترۆنی لەدەستداوە و ژمارەی ئۆکسانی زیادی کردووە لە 0 بۆ +2، کەواتە کرداری ئۆکسانە.",
    difficulty: DifficultyLevel.STANDARD,
    nextConceptRecommendation: "پێداچوونەوەی یەکەی کیمیای کارەبایی"
  }
];

interface StudyChatScreenProps {
  profile: StudentProfile;
  onNavigate?: (tab: string) => void;
}

export function StudyChatScreen({ profile, onNavigate: _onNavigate }: StudyChatScreenProps) {
  // Active lesson selected for pilot
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);
  const [showLessonPicker, setShowLessonPicker] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const activeLesson = XWENDN_PILOT_LESSONS[selectedLessonIndex] || XWENDN_PILOT_LESSONS[0];

  // Pass active academic context to tutor hook
  const { messages, loading, error, sendMessage, clearChat } = useTutorChat(profile, {
    lessonTitle: activeLesson.title,
    conceptTitle: activeLesson.concepts[0] || "",
    curriculumId: activeLesson.curriculumId
  });

  // In-chat interactive practice state
  const [activePractice, setActivePractice] = useState<PracticeItem | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isGraded, setIsGraded] = useState(false);
  const [masteryGain, setMasteryGain] = useState<number | null>(null);
  const [nextActionRecommendation, setNextActionRecommendation] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, activePractice, isGraded]);

  const handleClearConfirm = () => {
    clearChat();
    setActivePractice(null);
    setSelectedOption(null);
    setIsGraded(false);
    setShowConfirmClear(false);
  };

  const handleSelectLesson = (index: number) => {
    setSelectedLessonIndex(index);
    setShowLessonPicker(false);
    setActivePractice(null);
    setSelectedOption(null);
    setIsGraded(false);

    const newLesson = XWENDN_PILOT_LESSONS[index];
    if (newLesson) {
      void sendMessage(`دەستپێکردنی وانەی نوێ: ${newLesson.title}`, {
        lessonTitle: newLesson.title,
        conceptTitle: newLesson.concepts[0] || "",
        curriculumId: newLesson.curriculumId
      });
    }
  };

  // Launch interactive practice card
  const handleLaunchPractice = () => {
    // Find matching practice item or default
    const matching = PILOT_PRACTICE_ITEMS.find((p) => p.lessonId === activeLesson.id) || PILOT_PRACTICE_ITEMS[0];
    setActivePractice(matching);
    setSelectedOption(null);
    setIsGraded(false);
    setMasteryGain(null);
    setNextActionRecommendation(null);
  };

  // Handle Practice Answer Submission
  const handleGradeAnswer = (chosenIndex: number) => {
    if (!activePractice || isGraded) return;
    setSelectedOption(chosenIndex);
    setIsGraded(true);

    const isCorrect = chosenIndex === activePractice.correctIndex;

    // Calculate updated mastery using AdaptiveLearningEngine
    const prevMastery = {
      conceptId: activePractice.conceptTitle,
      masteryScore: 0.40,
      status: MasteryStatus.INTRODUCED,
      lastAttemptedAt: new Date().toISOString(),
      totalAttempts: 1,
      consecutiveCorrect: isCorrect ? 1 : 0,
      history: []
    };

    const newMastery = AdaptiveLearningEngine.calculateNewMastery(prevMastery, {
      isCorrect,
      difficulty: activePractice.difficulty,
      responseTimeMs: 3500
    });

    const gainPercent = Math.round((newMastery.masteryScore - 0.40) * 100);
    setMasteryGain(gainPercent);

    if (isCorrect) {
      setNextActionRecommendation(activePractice.nextConceptRecommendation || "پێشڕەوی بەرەو وانەی دواتر");
      ZanaStorage.incrementQuestions(1);
    } else {
      setNextActionRecommendation("پێداچوونەوە بە هاوکێشە و چەمکی سەرەکی لەگەڵ مامۆستا زانا");
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-start relative -mx-4 -mt-4 bg-slate-50 min-h-[calc(100vh-130px)]" dir="rtl">
      {/* 1. CURRICULUM GROUNDING HEADER */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 sticky top-[65px] z-20 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          {/* Grounding Source Badge */}
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>پڕۆگرامی فەرمی xwendn.krd</span>
            </span>
            <span className="text-[10px] text-slate-400 font-sans">
              مۆڵەتی کراوە • پۆلی {profile.grade}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 1 && (
              <button
                onClick={() => setShowConfirmClear(true)}
                title="سڕینەوەی گفتوگۆ"
                className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 cursor-pointer font-sans p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Active Lesson Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowLessonPicker(!showLessonPicker)}
            className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl px-3 py-2 text-right transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="truncate">
                <span className="font-sans font-black text-xs text-slate-800 block truncate">
                  {activeLesson.title}
                </span>
                <span className="font-sans text-[10px] text-slate-400 block truncate">
                  چەمکە سەرەکییەکان: {activeLesson.concepts.join(" • ")}
                </span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
          </button>

          {/* Dropdown Menu for Pilot Curriculum */}
          {showLessonPicker && (
            <div className="absolute top-full right-0 left-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-30 overflow-hidden py-1">
              <div className="p-2 border-b border-slate-50 text-[10px] font-bold text-slate-400">
                وانە بەردەستەکانی پڕۆگرامی تاقیکاری کیمیای پۆلی ١٢ (xwendn.krd):
              </div>
              {XWENDN_PILOT_LESSONS.map((lesson, idx) => (
                <button
                  key={lesson.id}
                  onClick={() => handleSelectLesson(idx)}
                  className={`w-full text-right px-3 py-2.5 flex items-start gap-2 hover:bg-blue-50 transition-colors cursor-pointer ${
                    idx === selectedLessonIndex ? "bg-blue-50/70 border-r-2 border-blue-600" : ""
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-sans font-bold text-xs text-slate-800 leading-tight">
                      {lesson.title}
                    </p>
                    <p className="font-sans text-[10px] text-slate-400 mt-0.5 truncate">
                      {lesson.concepts.slice(0, 3).join(", ")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. CHAT MESSAGES SCROLL CONTAINER */}
      <div className="flex-1 overflow-y-auto px-4 pb-36 pt-3 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id}>
            <ChatMessage message={msg} />
          </div>
        ))}

        {/* 3. INTERACTIVE IN-CHAT PRACTICE WIDGET */}
        {activePractice && (
          <div className="bg-white border-2 border-blue-200 rounded-2xl p-4 shadow-sm space-y-3.5 my-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span className="font-sans font-bold text-xs text-slate-800">
                  ڕاهێنانی تاقیکاری: {activePractice.conceptTitle}
                </span>
              </div>
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                ئاستی وەزاری
              </span>
            </div>

            <p className="font-sans font-medium text-xs text-slate-800 leading-relaxed">
              {activePractice.question}
            </p>

            {/* Answer Options */}
            <div className="space-y-2">
              {activePractice.options.map((opt, optIdx) => {
                const isSelected = selectedOption === optIdx;
                const isCorrect = optIdx === activePractice.correctIndex;
                let btnStyle = "border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700";

                if (isGraded) {
                  if (isCorrect) {
                    btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-800 font-bold";
                  } else if (isSelected && !isCorrect) {
                    btnStyle = "border-rose-400 bg-rose-50 text-rose-800";
                  } else {
                    btnStyle = "border-slate-100 bg-slate-50 text-slate-400 opacity-60";
                  }
                }

                return (
                  <button
                    key={optIdx}
                    disabled={isGraded}
                    onClick={() => handleGradeAnswer(optIdx)}
                    className={`w-full p-3 rounded-xl border text-right font-sans text-xs flex items-center justify-between transition-all cursor-pointer min-h-[44px] ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {isGraded && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mr-2" />}
                    {isGraded && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-500 shrink-0 mr-2" />}
                  </button>
                );
              })}
            </div>

            {/* Post-grading explanation & Adaptive Mastery feedback */}
            {isGraded && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-right space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Brain className="w-4 h-4 text-blue-600" />
                  <span>شیکاری زانستی مامۆستا زانا:</span>
                </div>
                <p className="font-sans text-xs text-slate-600 leading-relaxed">
                  {activePractice.explanation}
                </p>

                {/* Adaptive Mastery Score Delta */}
                {masteryGain !== null && (
                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px] font-sans">
                    <span className="text-slate-500">نوێبوونەوەی ئاستی زاڵبوون:</span>
                    <span className={`font-black ${masteryGain >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                      {masteryGain >= 0 ? `+${masteryGain}% زاڵبوون بەدەستهات` : `${masteryGain}% پێداچوونەوە پێویستە`}
                    </span>
                  </div>
                )}

                {/* Next Best Action Banner */}
                {nextActionRecommendation && (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg p-2 mt-1">
                    <div className="flex items-center gap-1 text-[10px] text-blue-900 font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>پێشنیاری داهاتوو: {nextActionRecommendation}</span>
                    </div>
                    <button
                      onClick={() => {
                        void sendMessage(`مامۆستا زانا، با دەست بکەین بە شیکاری "${nextActionRecommendation}"`);
                        setActivePractice(null);
                      }}
                      className="text-[10px] bg-blue-600 text-white font-bold px-2.5 py-1 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      دەستپێکردن
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ZANA Typing State */}
        {loading && (
          <div className="flex gap-3 my-4 max-w-full">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <span className="font-sans font-bold text-xs">ز</span>
            </div>
            <div className="flex flex-col max-w-[82%]">
              <div className="flex items-center gap-2 mb-1 text-[10px] text-slate-400 font-sans">
                <span className="font-bold text-slate-600">مامۆستا زانا</span>
                <span className="text-[9px]">دەنوسێت...</span>
              </div>
              <div className="px-4 py-2.5 rounded-2xl border border-slate-100 bg-white text-slate-800 rounded-tr-none shadow-xs">
                <LoadingDots />
              </div>
            </div>
          </div>
        )}

        {/* Inline Error alert */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-right my-3 text-red-700 text-xs font-sans leading-relaxed">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. SOCRATIC QUICK PROMPTS & SUGGESTIONS BAR */}
      <div className="absolute bottom-[58px] left-0 right-0 z-20 px-3 py-1 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={handleLaunchPractice}
            className="shrink-0 flex items-center gap-1 bg-white hover:bg-blue-50 border border-slate-200 text-blue-700 rounded-full px-3 py-1.5 text-[11px] font-sans font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <Award className="w-3.5 h-3.5 text-blue-600" />
            <span>ڕاهێنانی وانە</span>
          </button>

          <button
            onClick={() => {
              void sendMessage(`مامۆستا زانا، تکایە چەمکی "${activeLesson.concepts[0]}"م بۆ ڕوون بکەرەوە بە شێوازی سوقراتی و پرسیاری هاندەر.`);
            }}
            className="shrink-0 flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-full px-3 py-1.5 text-[11px] font-sans font-medium shadow-2xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>شیکردنەوەی سوقراتی</span>
          </button>

          <button
            onClick={() => {
              void sendMessage(`هەڵە تێگەیشتنە باوەکانی قوتابیان لەسەر ${activeLesson.title} چین و چۆن خۆمی لێ بپارێزم؟`);
            }}
            className="shrink-0 flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-full px-3 py-1.5 text-[11px] font-sans font-medium shadow-2xs transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>هەڵە باوەکان</span>
          </button>

          <button
            onClick={() => {
              void sendMessage(`یاسا و هاوکێشە سەرەکییەکانی پەیوەست بە ${activeLesson.title} چیین؟`);
            }}
            className="shrink-0 flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-full px-3 py-1.5 text-[11px] font-sans font-medium shadow-2xs transition-colors cursor-pointer"
          >
            <Brain className="w-3.5 h-3.5 text-indigo-500" />
            <span>هاوکێشە و یاساکان</span>
          </button>
        </div>
      </div>

      {/* 5. BOTTOM INPUT PANEL */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-100">
        <ChatInput onSendMessage={(text) => { void sendMessage(text); }} disabled={loading} />
      </div>

      {/* 6. CLEAR CONFIRMATION OVERLAY */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xs w-full p-6 text-right border border-slate-100 shadow-xl space-y-4">
            <h4 className="font-sans font-bold text-base text-slate-900">
              دڵنیایت لە پاککردنەوە؟
            </h4>
            <p className="font-sans text-xs text-slate-500 leading-relaxed">
              تەواوی مێژووی ئەم گفتوگۆیە لادەبرێت و ناتوانیت بیگەڕێنیتەوە.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-sans font-bold cursor-pointer transition-colors"
              >
                پەشیمانبوونەوە
              </button>
              <button
                onClick={handleClearConfirm}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-sans font-bold cursor-pointer transition-colors"
              >
                بەڵێ، پاکیبکەرەوە
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
