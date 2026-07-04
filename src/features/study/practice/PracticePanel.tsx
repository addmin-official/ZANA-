import { useState, useEffect } from "react";
import { StudentProfile } from "../../student/studentTypes.ts";
import { CurriculumIntelligenceSnapshot } from "../../../curriculum/types.ts";
import { SessionSnapshot } from "../../../session/types.ts";
import { usePracticeMode } from "./usePracticeMode.ts";
import { PracticeQuestion, PracticeAttempt } from "./practiceTypes.ts";
import { ZanaButton } from "../../../components/ZanaButton.tsx";
import { motion } from "motion/react";
import {
  Award,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle,
  HelpCircle,
  Clock,
  Sparkles,
  Info,
  Check,
  X,
  RotateCcw,
  ListTodo
} from "lucide-react";

interface PracticePanelProps {
  studentProfile: StudentProfile;
  curriculumSnapshot: CurriculumIntelligenceSnapshot;
  sessionSnapshot: SessionSnapshot;
  onNavigate: (tab: string) => void;
  onConceptCompleted?: () => void;
}

export function PracticePanel({
  studentProfile,
  curriculumSnapshot,
  sessionSnapshot,
  onNavigate,
  onConceptCompleted
}: PracticePanelProps) {
  const {
    snapshot,
    submitAnswer,
    resetPractice,
    isCompleted,
    error
  } = usePracticeMode({
    studentProfile,
    curriculumSnapshot,
    sessionSnapshot
  });

  // Keep track of the current selected choice or short-answer inputs per question
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});

  // Reset local form states when the concept shifts or reset is clicked
  useEffect(() => {
    setSelectedChoices({});
    setShortAnswers({});
  }, [snapshot?.conceptTitle, snapshot?.attempts.length]);

  if (error || !snapshot) {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center space-y-4" dir="rtl">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <p className="font-sans text-sm font-bold text-rose-800">{error || "هێڵکارییەکانی ڕاهێنان بارنەکران."}</p>
        <ZanaButton variant="secondary" onClick={resetPractice}>
          دووبارە هەوڵبدەرەوە
        </ZanaButton>
      </div>
    );
  }

  const { questions, attempts, completionPercentage, feedbackMessage } = snapshot;

  const correctAttempts = attempts.filter(a => a.isCorrect);
  const correctCount = correctAttempts.length;
  const attemptsMap = new Map<string, PracticeAttempt>(attempts.map(a => [a.questionId, a]));

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="space-y-5 text-right select-none" dir="rtl">
      {/* 1. COMPACT CONTEXT HEADER */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs space-y-3">
        <div>
          <span className="font-sans text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
            ڕاهێنانی ژمارەیی
          </span>
          <h2 className="font-sans font-black text-lg text-slate-950 mt-2.5 leading-snug">
            {snapshot.conceptTitle}
          </h2>
          <p className="font-sans text-xs font-medium text-slate-500 mt-1 leading-snug">
            تەوەرەکانی {snapshot.lessonTitle}
          </p>
        </div>

        {/* Dynamic warning if active */}
        {snapshot.warnings.map((warn, index) => (
          <div key={index} className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2 text-right">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="font-sans text-[11px] text-amber-800 font-medium leading-relaxed">{warn}</p>
          </div>
        ))}

        {/* Progress Tracker Widget */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-sans font-bold text-slate-700">دۆخی چارەسەرکردن</span>
            <span className="font-sans font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              {attempts.length} لە {questions.length} چارەسەر کراوە
            </span>
          </div>

          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>

          <p className="font-sans text-[11px] font-medium text-slate-500 italic mt-1 leading-relaxed">
            {feedbackMessage}
          </p>
        </div>
      </div>

      {/* 2. QUESTIONS WORKSPACE */}
      <motion.div
        variants={containerVariants as any}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {questions.map((question: PracticeQuestion, idx: number) => {
          const attempt = attemptsMap.get(question.id);
          const isAnswered = !!attempt;
          const isCorrect = attempt?.isCorrect || false;

          return (
            <motion.div
              key={question.id}
              variants={itemVariants as any}
              className={`bg-white border rounded-2xl p-4 shadow-2xs space-y-3.5 transition-all duration-300 ${
                isAnswered
                  ? isCorrect
                    ? "border-emerald-200 bg-emerald-50/5"
                    : "border-red-200 bg-rose-50/5"
                  : "border-slate-100"
              }`}
            >
              {/* Question Index & Difficulty */}
              <div className="flex items-center justify-between">
                <span className="font-sans text-[10px] font-black text-slate-400">
                  پرسیاری {idx + 1}
                </span>
                <span className="font-sans text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                  {question.difficultyLabel}
                </span>
              </div>

              {/* Prompt */}
              <p className="font-sans font-black text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">
                {question.prompt}
              </p>

              {/* ANSWER INPUT AREA */}
              {!isAnswered ? (
                <div className="space-y-3 pt-1">
                  {/* MULTIPLE CHOICE / STEP BY STEP */}
                  {(question.type === "multiple_choice" || question.type === "step_by_step") && question.choices && (
                    <div className="grid grid-cols-1 gap-2">
                      {question.choices.map((choice) => {
                        const isSelected = selectedChoices[question.id] === choice;
                        return (
                          <button
                            key={choice}
                            onClick={() => setSelectedChoices(prev => ({ ...prev, [question.id]: choice }))}
                            className={`w-full p-3 text-right rounded-xl font-sans text-xs font-semibold border transition-all duration-200 cursor-pointer flex items-center justify-between min-h-[44px] ${
                              isSelected
                                ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                                : "bg-white border-slate-100 hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <span>{choice}</span>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? "border-white bg-white" : "border-slate-200 bg-white"
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* SHORT ANSWER */}
                  {question.type === "short_answer" && (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        placeholder="وەڵامەکەت لێرە بنووسە..."
                        value={shortAnswers[question.id] || ""}
                        onChange={(e) => setShortAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                        className="w-full p-3 border border-slate-200 rounded-xl font-sans text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                        style={{ minHeight: "44px" }}
                      />
                    </div>
                  )}

                  {/* Submit Answer Button */}
                  <div className="pt-1.5">
                    <button
                      onClick={() => {
                        const ans = question.type === "short_answer"
                          ? shortAnswers[question.id]
                          : selectedChoices[question.id];
                        if (!ans) return;
                        submitAnswer(question.id, ans);
                      }}
                      disabled={
                        question.type === "short_answer"
                          ? !(shortAnswers[question.id]?.trim())
                          : !selectedChoices[question.id]
                      }
                      className="w-full py-2 bg-slate-900 hover:bg-slate-950 text-white font-sans text-xs font-black rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                      style={{ minHeight: "44px" }}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>وردبینیی وەڵام</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* ANSWERED STATE FEEDBACK */
                <div className="space-y-3 pt-1">
                  {/* Selected Choice / Answer Banner */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-sans ${
                    isCorrect
                      ? "bg-emerald-50 border-emerald-100 text-emerald-950"
                      : "bg-red-50 border-red-100 text-red-950"
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        isCorrect ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                      }`}>
                        {isCorrect ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      </div>
                      <span className="font-bold">وەڵامەکەت: {attempt.studentAnswer}</span>
                    </div>
                    <span className="font-black text-[10px]">{isCorrect ? "ڕاستە" : "هەڵەیە"}</span>
                  </div>

                  {/* Explanation Block */}
                  <div className="bg-slate-50 border border-slate-100/50 p-3.5 rounded-xl space-y-2.5">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <BookOpen className="w-4 h-4 text-blue-500" />
                      <span className="font-sans text-[11px] font-black">ڕوونکردنەوەی فێربوون و یاساکان:</span>
                    </div>
                    <p className="font-sans text-xs text-slate-600 leading-relaxed font-medium">
                      {question.explanation}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* 3. COMPLETION / RETRY MODAL CARD */}
      {attempts.length === questions.length && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`border rounded-2xl p-6 text-center space-y-5 shadow-md ${
            isCompleted
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
            {isCompleted ? (
              <Award className="w-6 h-6 text-emerald-500 animate-bounce" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            )}
          </div>

          <div className="space-y-2.5">
            <h3 className="font-sans font-black text-base text-slate-900">
              {isCompleted ? "پیرۆزە! چەمکەکە بە سەرکەوتوویی تێپەڕێنرا" : "پێویستت بە دووبارەکردنەوەیە"}
            </h3>
            <p className="font-sans text-xs font-semibold text-slate-600 leading-relaxed max-w-md mx-auto">
              {isCompleted
                ? `تۆ توانیت بە نمرەی گونجاو (%${Math.round((correctCount / questions.length) * 100)}) سەرجەم پرسیارەکانی ئەم بەشە تێپەڕێنیت و ئامادەی بۆ هەنگاوی داهاتوو.`
                : `تۆ %${Math.round((correctCount / questions.length) * 100)}ی پرسیارەکانت بە دروستی چارەسەر کردووە. پێویستە بەلایەنی کەمەوە %٧٠ ی وەڵامەکانت ڕاست بێت بۆ ناساندنی تەواوبوونی چەمکەکە.`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 max-w-sm mx-auto">
            {!isCompleted ? (
              <ZanaButton
                variant="warning"
                fullWidth
                onClick={resetPractice}
                className="text-xs font-black flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>دووبارە تاقیکردنەوە</span>
              </ZanaButton>
            ) : (
              <>
                <ZanaButton
                  variant="success"
                  fullWidth
                  onClick={onConceptCompleted}
                  className="text-xs font-black flex items-center justify-center gap-1.5"
                >
                  <span>ناساندنی تەواوبوون و بەردەوامبوون</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </ZanaButton>
                <ZanaButton
                  variant="outline"
                  fullWidth
                  onClick={resetPractice}
                  className="text-xs font-black flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>سەرلەنوێ ڕاهێنانکردنەوە</span>
                </ZanaButton>
              </>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
