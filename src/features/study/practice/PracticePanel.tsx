import { useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  Award,
  BookOpen,
  Check,
  CheckCircle,
  Info,
  RotateCcw,
  X,
} from "lucide-react";
import { ZanaButton } from "../../../components/ZanaButton.tsx";
import { CurriculumIntelligenceSnapshot } from "../../../curriculum/types.ts";
import { SessionSnapshot } from "../../../session/types.ts";
import { StudentProfile } from "../../student/studentTypes.ts";
import { PracticeAttempt, PracticeQuestion } from "./practiceTypes.ts";
import { usePracticeMode } from "./usePracticeMode.ts";

interface PracticePanelProps {
  studentProfile: StudentProfile;
  curriculumSnapshot: CurriculumIntelligenceSnapshot;
  sessionSnapshot: SessionSnapshot;
  onNavigate: (tab: string) => void;
  onConceptCompleted?: () => void;
}

export function PracticePanel(props: PracticePanelProps) {
  const conceptKey = props.sessionSnapshot.currentSession?.currentNodeId ?? "no-active-concept";
  return <PracticePanelContent key={conceptKey} {...props} />;
}

function PracticePanelContent({
  studentProfile,
  curriculumSnapshot,
  sessionSnapshot,
  onConceptCompleted,
}: PracticePanelProps) {
  const {
    snapshot,
    submitAnswer,
    resetPractice,
    isCompleted,
    error,
  } = usePracticeMode({
    studentProfile,
    curriculumSnapshot,
    sessionSnapshot,
  });

  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});

  const resetAll = () => {
    resetPractice();
    setSelectedChoices({});
    setShortAnswers({});
  };

  if (error || !snapshot) {
    return (
      <div
        className="space-y-4 rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center"
        dir="rtl"
        role="alert"
      >
        <AlertTriangle className="mx-auto h-10 w-10 text-rose-500" aria-hidden="true" />
        <p className="font-sans text-sm font-bold text-rose-800">
          {error ?? "ڕاهێنانەکە بارنەکرا. تکایە دووبارە هەوڵ بدەرەوە."}
        </p>
        <ZanaButton variant="secondary" onClick={resetAll}>
          دووبارە هەوڵ بدەرەوە
        </ZanaButton>
      </div>
    );
  }

  const { questions, attempts, completionPercentage, feedbackMessage } = snapshot;
  const correctCount = attempts.filter((attempt) => attempt.isCorrect).length;
  const attemptsMap = new Map<string, PracticeAttempt>(
    attempts.map((attempt) => [attempt.questionId, attempt]),
  );
  const score = questions.length > 0
    ? Math.round((correctCount / questions.length) * 100)
    : 0;

  return (
    <div className="space-y-5 text-right" dir="rtl">
      <section className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
        <div>
          <span className="rounded-md bg-emerald-50 px-2.5 py-1 font-sans text-[10px] font-black text-emerald-700">
            ڕاهێنانی ژمارەیی
          </span>
          <h2 className="mt-2.5 font-sans text-lg font-black leading-snug text-slate-950">
            {snapshot.conceptTitle}
          </h2>
          <p className="mt-1 font-sans text-xs font-medium leading-snug text-slate-500">
            تەوەرەکانی {snapshot.lessonTitle}
          </p>
        </div>

        {snapshot.warnings.map((warning) => (
          <div
            key={warning}
            className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
            <p className="font-sans text-[11px] font-medium leading-relaxed text-amber-900">
              {warning}
            </p>
          </div>
        ))}

        <div className="space-y-2 border-t border-slate-100 pt-2">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-sans font-bold text-slate-700">دۆخی چارەسەرکردن</span>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-sans font-black text-emerald-700">
              {attempts.length} لە {questions.length}
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completionPercentage}
            aria-label="ڕێژەی تەواوبوونی ڕاهێنان"
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <p className="font-sans text-[11px] font-medium leading-relaxed text-slate-500">
            {feedbackMessage}
          </p>
        </div>
      </section>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        {questions.map((question: PracticeQuestion, index: number) => {
          const attempt = attemptsMap.get(question.id);
          const isAnswered = attempt !== undefined;
          const isCorrect = attempt?.isCorrect === true;
          const selectedAnswer = question.type === "short_answer"
            ? shortAnswers[question.id]
            : selectedChoices[question.id];

          return (
            <motion.section
              key={question.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`space-y-3.5 rounded-2xl border p-4 shadow-xs ${
                isAnswered
                  ? isCorrect
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-rose-200 bg-rose-50/40"
                  : "border-slate-100 bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-sans text-[10px] font-black text-slate-400">
                  پرسیاری {index + 1}
                </span>
                <span className="rounded-md border border-slate-100 bg-slate-50 px-2 py-0.5 font-sans text-[10px] font-bold text-slate-600">
                  {question.difficultyLabel}
                </span>
              </div>

              <p className="whitespace-pre-wrap font-sans text-sm font-black leading-relaxed text-slate-900">
                {question.prompt}
              </p>

              {!isAnswered ? (
                <div className="space-y-3">
                  {(question.type === "multiple_choice" || question.type === "step_by_step") && question.choices ? (
                    <div className="grid grid-cols-1 gap-2">
                      {question.choices.map((choice) => {
                        const isSelected = selectedChoices[question.id] === choice;
                        return (
                          <button
                            key={choice}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => {
                              setSelectedChoices((current) => ({
                                ...current,
                                [question.id]: choice,
                              }));
                            }}
                            className={`flex min-h-11 w-full items-center justify-between rounded-xl border p-3 text-right font-sans text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                              isSelected
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <span>{choice}</span>
                            <span
                              className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                                isSelected ? "border-white bg-white" : "border-slate-300"
                              }`}
                              aria-hidden="true"
                            >
                              {isSelected ? <span className="h-2 w-2 rounded-full bg-blue-600" /> : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {question.type === "short_answer" ? (
                    <input
                      type="text"
                      aria-label={`وەڵامی پرسیاری ${index + 1}`}
                      placeholder="وەڵامەکەت لێرە بنووسە..."
                      value={shortAnswers[question.id] ?? ""}
                      onChange={(event) => {
                        setShortAnswers((current) => ({
                          ...current,
                          [question.id]: event.target.value,
                        }));
                      }}
                      className="min-h-11 w-full rounded-xl border border-slate-200 p-3 text-right font-sans text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      const answer = selectedAnswer?.trim();
                      if (answer) submitAnswer(question.id, answer);
                    }}
                    disabled={!selectedAnswer?.trim()}
                    className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 font-sans text-xs font-black text-white transition-colors hover:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    وردبینیی وەڵام
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={`flex items-center justify-between gap-3 rounded-xl border p-3 font-sans text-xs ${
                    isCorrect
                      ? "border-emerald-100 bg-emerald-50 text-emerald-950"
                      : "border-rose-100 bg-rose-50 text-rose-950"
                  }`}>
                    <span className="flex items-center gap-2 font-bold">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-white ${
                        isCorrect ? "bg-emerald-500" : "bg-rose-500"
                      }`}>
                        {isCorrect
                          ? <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          : <X className="h-3.5 w-3.5" aria-hidden="true" />}
                      </span>
                      وەڵامەکەت: {attempt.studentAnswer}
                    </span>
                    <span className="font-black">{isCorrect ? "ڕاستە" : "هەڵەیە"}</span>
                  </div>

                  <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <BookOpen className="h-4 w-4 text-blue-500" aria-hidden="true" />
                      <span className="font-sans text-[11px] font-black">ڕوونکردنەوە</span>
                    </div>
                    <p className="font-sans text-xs font-medium leading-relaxed text-slate-600">
                      {question.explanation}
                    </p>
                  </div>
                </div>
              )}
            </motion.section>
          );
        })}
      </motion.div>

      {questions.length > 0 && attempts.length === questions.length ? (
        <section className={`space-y-5 rounded-2xl border p-6 text-center shadow-md ${
          isCompleted
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
            {isCompleted
              ? <Award className="h-6 w-6 text-emerald-500" aria-hidden="true" />
              : <AlertTriangle className="h-6 w-6 text-amber-500" aria-hidden="true" />}
          </div>
          <div className="space-y-2">
            <h3 className="font-sans text-base font-black text-slate-900">
              {isCompleted ? "پیرۆزە! ڕاهێنانەکەت سەرکەوتوو بوو" : "پێویستە دووبارە هەوڵ بدەیتەوە"}
            </h3>
            <p className="font-sans text-xs font-semibold leading-relaxed text-slate-600">
              ڕێژەی وەڵامی ڕاستت %{score} بوو. بۆ سەرکەوتن پێویستە لانیکەم %٧٠ بێت.
            </p>
          </div>
          <div className="mx-auto flex max-w-sm flex-col gap-2.5 sm:flex-row">
            {isCompleted ? (
              <ZanaButton
                variant="success"
                fullWidth
                onClick={() => onConceptCompleted?.()}
              >
                بەردەوامبوون
              </ZanaButton>
            ) : null}
            <ZanaButton variant="outline" fullWidth onClick={resetAll}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              سەرلەنوێ ڕاهێنانکردنەوە
            </ZanaButton>
          </div>
        </section>
      ) : null}
    </div>
  );
}
