import { useState, useEffect, FormEvent, useMemo } from "react";
import { StudentProfile } from "../../student/studentTypes.ts";
import { useAssessmentIntelligence } from "./useAssessmentIntelligence.ts";
import { AssessmentMode } from "./assessmentTypes.ts";
import { ZanaButton } from "../../../components/ZanaButton.tsx";
import { ZanaCard } from "../../../components/ZanaCard.tsx";
import { AnswerSubmission } from "../../../assessment/domain/AssessmentTypes.ts";
import {
  Award,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  RefreshCw,
  ChevronRight,
  Send,
  BrainCircuit,
  Check,
  TrendingUp,
} from "lucide-react";

interface AssessmentIntelligencePanelProps {
  studentProfile: StudentProfile;
  onProfileUpdate: (profile: Partial<StudentProfile>) => void;
  onNavigate: (tab: string) => void;
}

/**
 * AssessmentIntelligencePanel: Modern, RTL, mobile-first dashboard
 * supporting Heuristic Heuristic Adaptive Difficulty Engine assessments.
 */
export function AssessmentIntelligencePanel({
  studentProfile,
  onProfileUpdate,
  onNavigate,
}: AssessmentIntelligencePanelProps) {
  const {
    snapshot,
    start,
    submitAnswer,
    nextQuestion,
    finish,
    reset,
    isCompleted,
    error,
    isLoading,
  } = useAssessmentIntelligence(studentProfile, onProfileUpdate);

  const [typedAnswer, setTypedAnswer] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [trueFalseValue, setTrueFalseValue] = useState<boolean | null>(null);
  const [numericValue, setNumericValue] = useState<string>("");
  const [orderedItems, setOrderedItems] = useState<any[]>([]);
  const [matchingAnswers, setMatchingAnswers] = useState<Record<string, string>>({});

  const [feedback, setFeedback] = useState<{ isCorrect: boolean; text: string } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const currentQuestion = snapshot?.currentQuestion;

  // Sync state on question transition
  useEffect(() => {
    if (currentQuestion) {
      setTypedAnswer("");
      setSelectedChoice(null);
      setSelectedChoices([]);
      setTrueFalseValue(null);
      setNumericValue("");
      setOrderedItems(currentQuestion.options || []);
      setMatchingAnswers({});
    }
  }, [currentQuestion?.id]);

  const activeSubjectKu = useMemo(() => {
    switch (studentProfile.activeSubject) {
      case "math":
        return "بیرکاری";
      case "physics":
        return "فیزیا";
      case "chemistry":
        return "کیمیا";
      case "english":
        return "ئینگلیزی";
      default:
        return "وانەکان";
    }
  }, [studentProfile.activeSubject]);

  // Handle Answer Submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!snapshot || !currentQuestion || feedback || isEvaluating) return;

    let submissionPayload: AnswerSubmission;

    if (currentQuestion.type === "MULTIPLE_CHOICE_SINGLE") {
      submissionPayload = {
        questionId: currentQuestion.id,
        selectedOptionIds: [selectedChoice || ""],
        responseTimeMs: 8000
      };
    } else if (currentQuestion.type === "MULTIPLE_CHOICE_MULTIPLE") {
      submissionPayload = {
        questionId: currentQuestion.id,
        selectedOptionIds: selectedChoices,
        responseTimeMs: 8000
      };
    } else if (currentQuestion.type === "TRUE_FALSE") {
      submissionPayload = {
        questionId: currentQuestion.id,
        trueFalseValue: trueFalseValue === true,
        responseTimeMs: 8000
      };
    } else if (currentQuestion.type === "NUMERIC") {
      submissionPayload = {
        questionId: currentQuestion.id,
        numericValue: Number(numericValue),
        responseTimeMs: 8000
      };
    } else if (currentQuestion.type === "ORDERING") {
      submissionPayload = {
        questionId: currentQuestion.id,
        orderedIds: orderedItems.map(item => item.id),
        responseTimeMs: 8000
      };
    } else if (currentQuestion.type === "MATCHING") {
      submissionPayload = {
        questionId: currentQuestion.id,
        matchingPairs: matchingAnswers,
        responseTimeMs: 8000
      };
    } else {
      const answerToSubmit =
        currentQuestion.type === "multiple_choice"
          ? selectedChoice || ""
          : typedAnswer.trim();
      submissionPayload = {
        questionId: currentQuestion.id,
        shortAnswerText: answerToSubmit,
        responseTimeMs: 8000
      };
    }

    setIsEvaluating(true);
    try {
      const result = await submitAnswer(submissionPayload);
      setFeedback({
        isCorrect: result.isCorrect,
        text: result.feedback,
      });
    } catch (err) {
      console.error("Submission failed:", err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Clean-up on question transition
  const handleNext = async () => {
    setFeedback(null);

    if (snapshot && snapshot.session) {
      const isLast = snapshot.session.answers.length === snapshot.session.totalQuestions;
      if (isLast) {
        await finish();
      } else {
        nextQuestion();
      }
    }
  };

  const activeModeNameKu = (mode: AssessmentMode) => {
    switch (mode) {
      case "diagnostic":
        return "تاقیکردنەوەی ئاستی زانستی";
      case "lesson_check":
        return "هەڵسەنگاندنی خێرای وانە";
      case "review_check":
        return "پێداچوونەوەی گشتی بەشەکان";
      case "exam_practice":
        return "ڕاهێنانی تاقیکردنەوەی کۆتایی";
      default:
        return "تاقیکردنەوەی زانا";
    }
  };

  // 1. INTRO / SETUP STATE (No active session yet)
  if (!snapshot) {
    return (
      <div className="space-y-6 flex-1 flex flex-col justify-start py-2 px-1 text-right" style={{ direction: "rtl" }}>
        {/* Header Hero card */}
        <div className="text-center max-w-md mx-auto py-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-xs">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="font-sans font-black text-xl text-slate-900">
            تاقیکردنەوەی ئاستی {activeSubjectKu}
          </h2>
          <p className="font-sans text-xs text-slate-500 mt-2 leading-relaxed max-w-sm mx-auto">
            هەڵسەنگاندنێکی زانستی ڕێکخراو لە لایەن مامۆستا زانا بۆ دەستنیشانکردنی دروستی خاڵە بەهێزەکان و چەمکە لاوازەکانت بە پشتگیری بزوێنەری Heuristic Adaptive Difficulty Engine بۆ پۆلی {studentProfile.grade}.
          </p>
        </div>

        {/* Selection Cards */}
        <div className="grid grid-cols-1 gap-3 max-w-md mx-auto w-full">
          <button
            disabled={isLoading}
            onClick={() => start("diagnostic")}
            className="p-4 rounded-2xl border border-slate-150 bg-white hover:bg-slate-50/50 hover:border-blue-400 text-right font-sans transition-all cursor-pointer flex gap-3.5 items-center justify-between shadow-xs group disabled:opacity-50"
          >
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                تاقیکردنەوەی ئاستی زانستی (Diagnostic)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                هەڵسەنگاندنی گشتی ٥ پرسیاری بۆ گۆڕینی ئاستت لە بابەتەکەدا.
              </p>
            </div>
            <BrainCircuit className="w-8 h-8 text-blue-500 shrink-0" />
          </button>

          <button
            disabled={isLoading}
            onClick={() => start("lesson_check")}
            className="p-4 rounded-2xl border border-slate-150 bg-white hover:bg-slate-50/50 hover:border-emerald-400 text-right font-sans transition-all cursor-pointer flex gap-3.5 items-center justify-between shadow-xs group disabled:opacity-50"
          >
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
                هەڵسەنگاندنی خێرای وانە (Lesson Check)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                تاقیکردنەوەیەکی تایبەت لەسەر دواین وانە یان چەمکی خوێندراو.
              </p>
            </div>
            <BookOpen className="w-8 h-8 text-emerald-500 shrink-0" />
          </button>

          <button
            disabled={isLoading}
            onClick={() => start("exam_practice")}
            className="p-4 rounded-2xl border border-slate-150 bg-white hover:bg-slate-50/50 hover:border-purple-400 text-right font-sans transition-all cursor-pointer flex gap-3.5 items-center justify-between shadow-xs group disabled:opacity-50"
          >
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 group-hover:text-purple-600 transition-colors">
                مەشقی تاقیکردنەوەی کۆتایی (Exam Practice)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                پرسیارەکانی ئاستی بەرز بۆ مەشقی تاقیکردنەوە فەرمییەکان.
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500 shrink-0" />
          </button>
        </div>

        {/* Info list */}
        <ZanaCard className="max-w-md mx-auto w-full border-dashed">
          <div className="space-y-3">
            <h5 className="font-sans font-bold text-xs text-slate-600">یاساکانی تاقیکردنەوەی ئاست:</h5>
            <div className="space-y-2.5 text-xs text-slate-500 leading-relaxed">
              <p className="flex gap-2 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                <span>تاقیکردنەوەکە بە تەواوی لێهاتووە و لە ٥ پرسیار پێکهاتووە.</span>
              </p>
              <p className="flex gap-2 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                <span>پشتگیری لە وەڵامی بژاردەیی، بەڵێ/نەخێر، ژمارەیی، و گونجاندن دەکات.</span>
              </p>
              <p className="flex gap-2 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                <span>بزوێنەری Heuristic Adaptive Difficulty Engine ئاستی پرسیارەکە بەپێی وەڵامەکانت دەگۆڕێت.</span>
              </p>
            </div>
          </div>
        </ZanaCard>
      </div>
    );
  }

  // 2. COMPLETED / RESULTS STATE
  if (isCompleted && snapshot.resultSummary) {
    const summary = snapshot.resultSummary;

    return (
      <div className="space-y-6 flex-1 flex flex-col justify-start py-2 px-1 text-right" style={{ direction: "rtl" }}>
        <ZanaCard className="max-w-md mx-auto w-full p-6 text-center border-emerald-100 bg-emerald-50/5 shadow-xs">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <h2 className="font-sans font-black text-2xl text-slate-900 leading-tight">
            {summary.title}! 🎉
          </h2>
          <p className="font-sans text-xs text-slate-500 mt-2 leading-relaxed">
            {summary.message}
          </p>

          {/* Core Score Display */}
          <div className="my-6 p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center shadow-xs">
            <div className="text-right">
              <span className="block font-sans text-[10px] text-slate-400 uppercase tracking-wider">نمرەی تاقیکردنەوە</span>
              <span className="font-sans font-black text-lg text-slate-800">{summary.scoreLabel}</span>
            </div>
            <div className="h-10 w-[1px] bg-slate-100"></div>
            <div className="text-right">
              <span className="block font-sans text-[10px] text-slate-400 uppercase tracking-wider">ئاستی سەرەکی زانستی</span>
              <span className="font-sans font-extrabold text-blue-600 text-sm">ئاستی {studentProfile.level || "ناوەندی"}</span>
            </div>
          </div>

          {/* Concepts analyzed bento grid */}
          <div className="space-y-3 mb-6">
            {summary.strongAreas.length > 0 && (
              <div className="p-3.5 bg-emerald-50/10 border border-emerald-100/50 rounded-xl text-right">
                <span className="font-sans font-bold text-xs text-emerald-800 block mb-1.5 flex gap-1.5 items-center justify-start">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>چەمکە بەهێزەکانت (لێهاتوو):</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {summary.strongAreas.map((area, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-emerald-100/30 text-emerald-900 text-[10px] rounded-lg font-sans">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {summary.weakAreas.length > 0 && (
              <div className="p-3.5 bg-amber-50/10 border border-amber-100/50 rounded-xl text-right">
                <span className="font-sans font-bold text-xs text-amber-800 block mb-1.5 flex gap-1.5 items-center justify-start">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>چەمکە پێویستەکان بە ڕاهێنان (لاواز):</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {summary.weakAreas.map((area, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-amber-100/30 text-amber-900 text-[10px] rounded-lg font-sans">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Next Recommended action card */}
          <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-right mb-6">
            <span className="font-sans text-[10px] font-bold text-slate-400 block mb-1">هەنگاوی داهاتوو پێشنیارکراو:</span>
            <span className="font-sans font-black text-sm text-slate-800 block">{summary.nextStep}</span>
          </div>

          {/* Footer Controls */}
          <div className="space-y-2">
            <ZanaButton variant="secondary" fullWidth onClick={() => onNavigate("daily")}>
              <span>گەڕانەوە بۆ لایەنە سەرەکییەکان</span>
            </ZanaButton>
            <ZanaButton variant="outline" fullWidth onClick={reset}>
              <RefreshCw className="w-4 h-4 mr-1.5 shrink-0" />
              <span>ئەنجامدانی تاقیکردنەوەیەکی تر</span>
            </ZanaButton>
          </div>
        </ZanaCard>
      </div>
    );
  }

  // 3. ACTIVE ASSESSMENT STATE (Answering questions)
  const session = snapshot.session;

  if (!currentQuestion) return null;

  const currentIdx = session.currentQuestionIndex;
  const questionNumber = currentIdx + 1;
  const totalQuestions = session.totalQuestions;
  const progressPercent = snapshot.progressPercentage;

  const isLastQuestion = questionNumber === totalQuestions;

  return (
    <div className="space-y-5 flex-1 flex flex-col justify-start py-2 px-1 text-right" style={{ direction: "rtl" }}>
      {/* Top Header progress block */}
      <div className="space-y-2">
        <div className="flex justify-between items-center font-sans text-xs text-slate-400">
          <button
            onClick={reset}
            className="flex items-center gap-1 text-[11px] hover:text-red-500 cursor-pointer text-slate-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            <span>پاشەکشە</span>
          </button>
          <span className="font-bold text-slate-600">
            پرسیاری {questionNumber} لە {totalQuestions} ({activeModeNameKu(session.mode)})
          </span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Primary Question Presentation */}
      <ZanaCard
        header={
          <div className="flex items-center gap-2 justify-start">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span className="font-sans text-xs font-bold text-slate-500">
              پرسیاری فەرمی پۆلی {studentProfile.grade} {activeSubjectKu}
            </span>
          </div>
        }
      >
        <div className="text-right py-1">
          <p className="font-sans font-bold text-base text-slate-800 leading-relaxed whitespace-pre-wrap">
            {currentQuestion.prompt}
          </p>
        </div>
      </ZanaCard>

      {/* Submit/Answer Presentation Area */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* MCQ SINGLE SELECT VIEW */}
        {(currentQuestion.type === "MULTIPLE_CHOICE_SINGLE" || currentQuestion.type === "multiple_choice") && currentQuestion.options && (
          <div className="space-y-2.5">
            {currentQuestion.options.map((opt) => {
              const isSelected = selectedChoice === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!!feedback || isEvaluating || isLoading}
                  onClick={() => setSelectedChoice(opt.id)}
                  className={`w-full p-4 rounded-xl border font-sans text-sm text-right transition-all cursor-pointer flex items-center justify-between min-h-[50px] ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/50 text-blue-900 font-bold shadow-xs"
                      : "border-slate-150 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{opt.textKu}</span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? "border-blue-500 bg-blue-500 text-white" : "border-slate-350 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* MCQ MULTIPLE SELECT VIEW */}
        {currentQuestion.type === "MULTIPLE_CHOICE_MULTIPLE" && currentQuestion.options && (
          <div className="space-y-2.5">
            <span className="block text-right font-sans text-xs text-slate-400 mb-1">ڕێنمایی: هەموو ئەو بژاردانە دیاریبکە کە بە دروست دەیانبینی.</span>
            {currentQuestion.options.map((opt) => {
              const isSelected = selectedChoices.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!!feedback || isEvaluating || isLoading}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedChoices(selectedChoices.filter(id => id !== opt.id));
                    } else {
                      setSelectedChoices([...selectedChoices, opt.id]);
                    }
                  }}
                  className={`w-full p-4 rounded-xl border font-sans text-sm text-right transition-all cursor-pointer flex items-center justify-between min-h-[50px] ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50/50 text-indigo-900 font-bold shadow-xs"
                      : "border-slate-150 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{opt.textKu}</span>
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                      isSelected ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-350 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* TRUE OR FALSE VIEW */}
        {currentQuestion.type === "TRUE_FALSE" && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!!feedback || isEvaluating || isLoading}
              onClick={() => setTrueFalseValue(true)}
              className={`p-5 rounded-2xl border font-sans text-sm text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 min-h-[100px] ${
                trueFalseValue === true
                  ? "border-emerald-500 bg-emerald-50/50 text-emerald-900 font-bold"
                  : "border-slate-150 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <CheckCircle2 className={`w-6 h-6 ${trueFalseValue === true ? "text-emerald-600" : "text-slate-300"}`} />
              <span>ڕاست (True)</span>
            </button>
            <button
              type="button"
              disabled={!!feedback || isEvaluating || isLoading}
              onClick={() => setTrueFalseValue(false)}
              className={`p-5 rounded-2xl border font-sans text-sm text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 min-h-[100px] ${
                trueFalseValue === false
                  ? "border-rose-500 bg-rose-50/50 text-rose-900 font-bold"
                  : "border-slate-150 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <XCircle className={`w-6 h-6 ${trueFalseValue === false ? "text-rose-500" : "text-slate-300"}`} />
              <span>هەڵە (False)</span>
            </button>
          </div>
        )}

        {/* NUMERIC FIELD VIEW */}
        {currentQuestion.type === "NUMERIC" && (
          <div className="space-y-2">
            <label className="block text-right font-sans text-xs font-bold text-slate-600">
              وەڵامی ژمارەیی خۆت لێرە بنووسە:
            </label>
            <input
              type="number"
              step="any"
              value={numericValue}
              onChange={(e) => setNumericValue(e.target.value)}
              disabled={!!feedback || isEvaluating || isLoading}
              placeholder="نموونە: ٧ یان -٥.٥"
              className="w-full font-sans text-sm p-4 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-right"
            />
          </div>
        )}

        {/* ORDERING REORDERABLE VIEW */}
        {currentQuestion.type === "ORDERING" && (
          <div className="space-y-2">
            <span className="block text-right font-sans text-xs font-bold text-slate-600 mb-2">
              بڕگەکان ڕێکبخە بۆ دروستکردنی شیکاری ڕاست (بە بەکارهێنانی تیرەکان):
            </span>
            <div className="space-y-2">
              {orderedItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-150 bg-white flex items-center justify-between font-sans text-xs shadow-xs"
                >
                  <span className="font-sans text-slate-800 text-right">{item.textKu}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={idx === 0 || !!feedback || isEvaluating || isLoading}
                      onClick={() => {
                        const newItems = [...orderedItems];
                        const temp = newItems[idx];
                        newItems[idx] = newItems[idx - 1];
                        newItems[idx - 1] = temp;
                        setOrderedItems(newItems);
                      }}
                      className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40 transition-colors cursor-pointer text-[10px]"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={idx === orderedItems.length - 1 || !!feedback || isEvaluating || isLoading}
                      onClick={() => {
                        const newItems = [...orderedItems];
                        const temp = newItems[idx];
                        newItems[idx] = newItems[idx + 1];
                        newItems[idx + 1] = temp;
                        setOrderedItems(newItems);
                      }}
                      className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40 transition-colors cursor-pointer text-[10px]"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MATCHING DROPDOWN VIEW */}
        {currentQuestion.type === "MATCHING" && (
          <div className="space-y-3">
            <span className="block text-right font-sans text-xs font-bold text-slate-600 mb-2">
              هەر لایەنێکی لای چەپ بە لایەنی ڕاستی گونجاو بگونجێنە:
            </span>
            <div className="space-y-3">
              {currentQuestion.options?.map((opt) => (
                <div key={opt.id} className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-150 rounded-xl items-center">
                  <span className="font-sans text-xs font-bold text-slate-700 text-right">{opt.textKu}</span>
                  <select
                    disabled={!!feedback || isEvaluating || isLoading}
                    value={matchingAnswers[opt.id] || ""}
                    onChange={(e) => setMatchingAnswers({ ...matchingAnswers, [opt.id]: e.target.value })}
                    className="w-full font-sans text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">-- دیاری بکە --</option>
                    {currentQuestion.options?.map((rOpt) => (
                      <option key={rOpt.id} value={rOpt.id}>
                        {rOpt.textKu}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SHORT ANSWER / LEGACY / STEP BY STEP VIEWS */}
        {currentQuestion.type !== "MULTIPLE_CHOICE_SINGLE" &&
          currentQuestion.type !== "MULTIPLE_CHOICE_MULTIPLE" &&
          currentQuestion.type !== "TRUE_FALSE" &&
          currentQuestion.type !== "NUMERIC" &&
          currentQuestion.type !== "ORDERING" &&
          currentQuestion.type !== "MATCHING" &&
          (currentQuestion.type === "short_answer" || currentQuestion.type === "step_by_step") && (
            <div className="space-y-2">
              <label className="block text-right font-sans text-xs font-bold text-slate-600">
                {currentQuestion.type === "step_by_step"
                  ? "هەنگاوەکانی شیکارکردنی پرسیارەکە بە ڕوونی لێرە بنووسە:"
                  : "وەڵامی کۆتایی خۆت لێرە بنووسە:"}
              </label>
              <textarea
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                disabled={!!feedback || isEvaluating || isLoading}
                rows={3}
                placeholder="وەڵامەکە لێرە بنووسە..."
                className="w-full font-sans text-sm p-4 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-right min-h-[80px]"
                style={{ direction: "rtl" }}
              />
            </div>
          )}

        {/* General Error notifications */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-right text-red-700 text-xs font-sans flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Button: Send or View Feedback */}
        {!feedback && (
          <ZanaButton
            type="submit"
            variant="secondary"
            fullWidth
            disabled={
              isEvaluating ||
              isLoading ||
              (currentQuestion.type === "MULTIPLE_CHOICE_SINGLE" && !selectedChoice) ||
              (currentQuestion.type === "MULTIPLE_CHOICE_MULTIPLE" && selectedChoices.length === 0) ||
              (currentQuestion.type === "TRUE_FALSE" && trueFalseValue === null) ||
              (currentQuestion.type === "NUMERIC" && !numericValue.trim()) ||
              (currentQuestion.type === "ORDERING" && orderedItems.length === 0) ||
              (currentQuestion.type === "MATCHING" && Object.keys(matchingAnswers).length === 0) ||
              ((currentQuestion.type === "short_answer" || currentQuestion.type === "step_by_step") && !typedAnswer.trim())
            }
            className="flex items-center justify-center gap-2 min-h-[44px]"
          >
            {isEvaluating || isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
            ) : null}
            <span>وەڵام بنێرە</span>
          </ZanaButton>
        )}
      </form>

      {/* FEEDBACK PRESENTATION WINDOW */}
      {feedback && (
        <ZanaCard
          className={`p-4 border transition-all animate-fade-in ${
            feedback.isCorrect ? "border-emerald-200 bg-emerald-50/10" : "border-amber-200 bg-amber-50/10"
          }`}
        >
          <div className="text-right space-y-2">
            <h5 className="font-sans font-black text-xs flex items-center gap-1.5 justify-start">
              {feedback.isCorrect ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-amber-500 shrink-0" />
              )}
              <span className={feedback.isCorrect ? "text-emerald-800" : "text-amber-800"}>
                {feedback.isCorrect ? "شیکارەکەت تەواو و دروستە! زۆر نایابە." : "وەڵامەکەت پێویستی بە کەمێک چاککردن هەیە."}
              </span>
            </h5>
            <p className="font-sans text-xs text-slate-600 leading-relaxed pr-5 whitespace-pre-wrap">
              {feedback.text}
            </p>

            <div className="pt-2">
              <button
                onClick={handleNext}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-sans text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer min-h-[40px]"
              >
                <span>{isLastQuestion ? "بینینی ئەنجامی کۆتایی" : "پرسیاری داهاتوو"}</span>
                <ChevronRight className="w-4 h-4 rotate-180 shrink-0" />
              </button>
            </div>
          </div>
        </ZanaCard>
      )}
    </div>
  );
}
