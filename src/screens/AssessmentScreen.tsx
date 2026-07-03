import { useState, FormEvent, useEffect } from "react";
import { ZanaButton } from "../components/ZanaButton.tsx";
import { ZanaCard } from "../components/ZanaCard.tsx";
import { StudentProfile } from "../services/storage.ts";
import { useAssessment } from "../features/assessment/useAssessment.ts";
import { Award, BookOpen, AlertCircle, Loader2, CheckCircle2, XCircle, ArrowLeft, RefreshCw } from "lucide-react";

interface AssessmentScreenProps {
  profile: StudentProfile;
  onProfileUpdate: (profile: Partial<StudentProfile>) => void;
  onNavigate: (tab: string) => void;
}

export function AssessmentScreen({ profile, onProfileUpdate, onNavigate }: AssessmentScreenProps) {
  const { assessment, loading, error, startAssessment, submitAnswer, resetAssessment } = useAssessment(profile, onProfileUpdate);
  const [answer, setAnswer] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (answer.trim() && !loading) {
      submitAnswer(answer.trim());
      setAnswer("");
    }
  };

  const activeSubjectName =
    profile.subject === "math"
      ? "بیرکاری"
      : profile.subject === "physics"
      ? "فیزیا"
      : profile.subject === "chemistry"
      ? "کیمیا"
      : "ئینگلیزی";

  // If there's no active assessment
  if (!assessment) {
    return (
      <div className="space-y-6 flex-1 flex flex-col justify-center py-4">
        <div className="text-center max-w-sm mx-auto">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100 shadow-xs">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="font-sans font-bold text-xl text-slate-900">
            تاقیکردنەوەی ئاستی {activeSubjectName}
          </h2>
          <p className="font-sans text-sm text-slate-500 mt-2 leading-relaxed">
            مامۆستا زانا تاقیکردنەوەیەکی کورت لە ٥ پرسیاری سەرەکی ئامادە دەکات تا ئاستی وردی زانستیت لۆ پۆلی {profile.grade} دەستنیشان بکات.
          </p>
        </div>

        <ZanaCard className="max-w-sm mx-auto">
          <div className="space-y-4 text-right">
            <div className="flex gap-2 items-start">
              <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs">١</span>
              <p className="font-sans text-xs text-slate-600">هەر پرسیارێک بە دوای یەکدا پێشکەش دەکرێت.</p>
            </div>
            <div className="flex gap-2 items-start">
              <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs">٢</span>
              <p className="font-sans text-xs text-slate-600">پێویستە وەڵامەکانت بە کوردی یان بە ژمارە و ڕوون بنووسیت.</p>
            </div>
            <div className="flex gap-2 items-start">
              <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs">٣</span>
              <p className="font-sans text-xs text-slate-600">لە کۆتاییدا دەرئەنجام و ئاستی نوێی خوێندنت پێدەدرێت.</p>
            </div>

            <ZanaButton
              variant="primary"
              fullWidth
              onClick={startAssessment}
              disabled={loading}
              className="mt-4 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              <span>دەستپێکردنی تاقیکردنەوە</span>
            </ZanaButton>
          </div>
        </ZanaCard>
      </div>
    );
  }

  // If completed
  if (assessment.completed) {
    const score = assessment.correctAnswers.filter(Boolean).length;
    
    return (
      <div className="space-y-6 flex-1 flex flex-col justify-center py-4">
        <ZanaCard className="max-w-sm mx-auto text-center p-8 border-emerald-100 bg-emerald-50/10">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          
          <h2 className="font-sans font-black text-2xl text-slate-900">
            تاقیکردنەوەکە بەسەرکەوتوویی تەواو بوو! 🎉
          </h2>
          <p className="font-sans text-sm text-slate-500 mt-2 leading-relaxed">
            زۆر سوپاس بۆ ماندووبوونت، {profile.name}. مامۆستا زانا هەڵسەنگاندنی تەواوی بۆ وەڵامەکانت کرد.
          </p>

          {/* Results Summary Box */}
          <div className="my-6 p-4 bg-white border border-slate-100 rounded-2xl space-y-3">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="font-sans text-slate-500 text-xs">نمرەی کۆتایی:</span>
              <span className="font-sans font-bold text-slate-800 text-sm">
                {score} لە {assessment.totalQuestions} ڕاست
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-sans text-slate-500 text-xs">ئاستی دیاریکراو:</span>
              <span className="font-sans font-extrabold text-blue-600 text-sm">
                ئاستی {assessment.finalLevel || profile.level}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <ZanaButton variant="secondary" fullWidth onClick={() => onNavigate("daily")}>
              <span>گەڕانەوە بۆ لایەنە سەرەکییەکان</span>
            </ZanaButton>
            <ZanaButton variant="outline" fullWidth onClick={resetAssessment}>
              <RefreshCw className="w-4 h-4 mr-2" />
              <span>دوبارەکردنەوەی تاقیکردنەوە</span>
            </ZanaButton>
          </div>
        </ZanaCard>
      </div>
    );
  }

  // Active Assessment State
  const currentIdx = assessment.currentQuestion - 1;
  const currentQuestionText = assessment.questions[currentIdx] || "";
  const progressPercent = Math.round((assessment.currentQuestion / assessment.totalQuestions) * 100);

  // Previous feedback to display if not first question
  const lastFeedback = currentIdx > 0 ? assessment.feedbacks[currentIdx - 1] : null;
  const lastIsCorrect = currentIdx > 0 ? assessment.correctAnswers[currentIdx - 1] : null;

  return (
    <div className="space-y-6 flex-1 flex flex-col justify-start">
      {/* Top Header progress block */}
      <div className="space-y-2">
        <div className="flex justify-between items-center font-sans text-xs text-slate-400">
          <span>{progressPercent}% تەواو بووە</span>
          <span className="font-bold text-slate-600">پرسیاری {assessment.currentQuestion} لە {assessment.totalQuestions}</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      {/* Showing previous feedback */}
      {lastFeedback && (
        <ZanaCard className={`p-4 border ${lastIsCorrect ? "border-emerald-100 bg-emerald-50/20" : "border-amber-100 bg-amber-50/20"}`}>
          <div className="text-right space-y-2">
            <h5 className="font-sans font-bold text-xs flex items-center gap-1.5 justify-start">
              {lastIsCorrect ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-amber-500 shrink-0" />
              )}
              <span className={lastIsCorrect ? "text-emerald-800" : "text-amber-800"}>
                {lastIsCorrect ? "وەڵامی پێشووت ڕاست بوو! زۆر باشە." : "وەڵامی پێشووت کەمێک پێویستی بە سەرنجە."}
              </span>
            </h5>
            <p className="font-sans text-xs text-slate-600 leading-relaxed pr-5">
              {lastFeedback}
            </p>
          </div>
        </ZanaCard>
      )}

      {/* Question Card */}
      <ZanaCard
        header={
          <div className="flex items-center gap-2 justify-start">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span className="font-sans text-xs font-bold text-slate-500">پرسیاری زانستی پۆلی {profile.grade}</span>
          </div>
        }
      >
        <div className="text-right">
          <p className="font-sans font-bold text-base text-slate-900 leading-relaxed whitespace-pre-wrap">
            {currentQuestionText}
          </p>
        </div>
      </ZanaCard>

      {/* Answer Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-right font-sans text-sm font-bold text-slate-700">
            وەڵامی خۆت بنووسە
          </label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={loading}
            rows={3}
            placeholder="وەڵامەکە لێرە بنووسە..."
            className="w-full font-sans text-sm p-4 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-right"
            style={{ direction: "rtl" }}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-right text-red-700 text-xs font-sans flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <ZanaButton
          type="submit"
          variant="secondary"
          fullWidth
          disabled={loading || !answer.trim()}
          className="flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          <span>ناردنی وەڵام</span>
        </ZanaButton>
      </form>
    </div>
  );
}
