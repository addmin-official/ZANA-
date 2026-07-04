import { ZanaButton } from "../components/ZanaButton.tsx";
import { ZanaCard } from "../components/ZanaCard.tsx";
import { StudentProfile } from "../features/student/studentTypes.ts";
import { useDailySpark } from "../features/dailySpark/useDailySpark.ts";
import { DailySparkCard } from "../features/dailySpark/dailySparkTypes.ts";
import {
  Sparkles,
  MessageSquare,
  Award,
  FileText,
  ArrowLeft,
  BookOpen,
  Clock,
  Flame,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { useState } from "react";

interface DailySparkScreenProps {
  profile: StudentProfile;
  onNavigate: (tab: string) => void;
  onStartAssessment: () => void;
}

export function DailySparkScreen({ profile, onNavigate, onStartAssessment }: DailySparkScreenProps) {
  const { snapshot, isLoading, error } = useDailySpark();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleCardAction = (card: DailySparkCard) => {
    if (card.type === "continue_learning") {
      onNavigate("chat");
    } else if (card.type === "start_assessment") {
      onStartAssessment();
    } else if (card.type === "review_weakness" || card.type === "practice_concept" || card.type === "complete_goal") {
      // These are educational prompts that guide student into chat mode with context
      onNavigate("chat");
    } else if (card.type === "rest_reminder") {
      showToast("با پشوویەکی کورت بدەین! زۆر ماندوو نەبیت.");
    } else {
      showToast("ئەم بەشە لە قۆناغی داهاتوودا بەستەوە دەکرێت.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-4" dir="rtl">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-sans text-sm text-slate-500">پێشنیارەکانی ئەمڕۆت ئامادە دەکرێن...</p>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4" dir="rtl">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <h3 className="font-sans font-bold text-lg text-slate-900">هەڵەیەک ڕوویدا لە بارکردنی زانیارییەکان</h3>
        <p className="font-sans text-sm text-slate-500 max-w-sm">تکایە لاپەڕەکە نوێ بکەرەوە یان دواتر تاقی بکەرەوە.</p>
      </div>
    );
  }

  const { greeting, mainCard, secondaryCards, progressSummary, warnings } = snapshot;

  return (
    <div className="space-y-6 flex-1 flex flex-col justify-start pb-8" dir="rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-4 right-4 bg-slate-900 text-white p-4 rounded-xl shadow-lg z-50 text-right animate-fade-in flex items-center justify-between">
          <p className="font-sans text-sm">{toastMessage}</p>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white mr-4">✕</button>
        </div>
      )}

      {/* Welcome Greeting */}
      <div className="text-right">
        <span className="inline-flex items-center gap-1 font-sans text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
          <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>هەفتەی {progressSummary.currentStreakDays} ڕۆژ لەسەریەک</span>
        </span>
        <h2 className="font-sans font-black text-2xl text-slate-900 mt-2 leading-tight">
          {greeting}
        </h2>
        <p className="font-sans text-sm text-slate-500 mt-1 leading-relaxed">
          ئامادەی بۆ ئەوەی ئەمڕۆ لێرەوە ئاستی زانستیت بەهێزتر بکەیت؟
        </p>
      </div>

      {/* Warnings & Notices */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-right space-y-2">
          {warnings.map((warning, idx) => (
            <div key={idx} className="flex items-start gap-2 justify-start">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="font-sans text-xs font-medium text-amber-800 leading-normal">{warning}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main Recommended Action Card */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-15 group-hover:opacity-25 transition-all"></div>
        <ZanaCard
          header={
            <div className="flex items-center gap-2 justify-start w-full border-b border-slate-100 pb-3">
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse shrink-0" />
              <div className="text-right">
                <span className="font-sans text-[10px] font-bold text-blue-600 tracking-wide uppercase">
                  {mainCard.subjectLabel} • {mainCard.gradeLabel}
                </span>
                <h3 className="font-sans font-bold text-xs text-slate-400">
                  ڕاسپاردەی سەرەکی خوێندن
                </h3>
              </div>
            </div>
          }
          className="border-blue-100/70 relative z-10 hover:border-blue-300 transition-all shadow-sm"
        >
          <div className="space-y-4 text-right">
            <div>
              <h4 className="font-sans font-bold text-base text-slate-900 leading-snug">
                {mainCard.title}
              </h4>
              <p className="font-sans text-sm text-slate-500 mt-1.5 leading-relaxed">
                {mainCard.description}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-sans">
              <Clock className="w-4 h-4 text-blue-500 shrink-0" />
              <span>ماوەی پێشنیارکراو: {mainCard.estimatedMinutes} خولەک</span>
            </div>

            <ZanaButton
              variant="primary"
              fullWidth
              onClick={() => handleCardAction(mainCard)}
              className="mt-2 min-h-[48px] justify-center text-sm font-bold"
            >
              <span>{mainCard.actionLabel}</span>
              <MessageSquare className="w-5 h-5 mr-2" />
            </ZanaButton>
          </div>
        </ZanaCard>
      </div>

      {/* Progress Bento-Grid Summary */}
      <div className="grid grid-cols-3 gap-3">
        {/* Minutes Card */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm text-right flex flex-col justify-between">
          <div>
            <Clock className="w-4 h-4 text-blue-500 mb-2" />
            <p className="font-sans text-[10px] font-bold text-slate-400 uppercase tracking-wide">کاتی ئەمڕۆ</p>
          </div>
          <div className="mt-2">
            <span className="font-sans font-black text-xl text-slate-800">{progressSummary.todayStudyMinutes}</span>
            <span className="font-sans text-[10px] text-slate-500 mr-1">خولەک</span>
          </div>
        </div>

        {/* Streak Card */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm text-right flex flex-col justify-between">
          <div>
            <Flame className="w-4 h-4 text-amber-500 mb-2" />
            <p className="font-sans text-[10px] font-bold text-slate-400 uppercase tracking-wide">بەردەوامی</p>
          </div>
          <div className="mt-2">
            <span className="font-sans font-black text-xl text-slate-800">{progressSummary.currentStreakDays}</span>
            <span className="font-sans text-[10px] text-slate-500 mr-1">ڕۆژ</span>
          </div>
        </div>

        {/* Completion Card */}
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm text-right flex flex-col justify-between">
          <div>
            <BookOpen className="w-4 h-4 text-emerald-500 mb-2" />
            <p className="font-sans text-[10px] font-bold text-slate-400 uppercase tracking-wide">پێشکەوتن</p>
          </div>
          <div className="mt-2">
            <span className="font-sans font-black text-xl text-slate-800">{progressSummary.completionPercentage}</span>
            <span className="font-sans text-[10px] text-slate-500 mr-1">%</span>
          </div>
        </div>
      </div>

      {/* Secondary Recommended Cards */}
      {secondaryCards.length > 0 && (
        <div className="space-y-3 text-right">
          <h4 className="font-sans font-bold text-sm text-slate-800 mr-1">ئەرکە سوودبەخشەکانی تر</h4>
          <div className="space-y-3">
            {secondaryCards.map((card) => (
              <div
                key={card.id}
                onClick={() => handleCardAction(card)}
                className="w-full flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 transition-all cursor-pointer text-right min-h-[48px]"
              >
                <div className="space-y-1">
                  <span className="font-sans text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                    {card.title}
                  </span>
                  <p className="font-sans text-xs text-slate-500 leading-normal mt-1">{card.description}</p>
                </div>
                <div className="flex items-center gap-2 mt-3 md:mt-0 self-end md:self-auto shrink-0">
                  <span className="font-sans text-xs font-semibold text-blue-600">{card.actionLabel}</span>
                  <ArrowLeft className="w-4 h-4 text-blue-500 flip-rtl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions & Navigation Shortcuts */}
      <ZanaCard className="space-y-3">
        <h4 className="font-sans font-bold text-sm text-slate-800 text-right mb-2">
          کردارە خێراکان
        </h4>

        {/* Assessment Action */}
        <button
          onClick={onStartAssessment}
          className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-blue-50/30 hover:border-blue-200 transition-all text-right cursor-pointer min-h-[48px]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="font-sans text-sm font-bold text-slate-800">تاقیکردنەوەی ئاستی گشتی</p>
              <p className="font-sans text-xs text-slate-400 mt-0.5">ئاستی فێربوونی خۆت نوێ بکەرەوە بە چەند پرسیارێکی کورت</p>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-slate-400 flip-rtl shrink-0" />
        </button>

        {/* Parent Report Action */}
        <button
          onClick={() => onNavigate("report")}
          className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-blue-50/30 hover:border-blue-200 transition-all text-right cursor-pointer min-h-[48px]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="font-sans text-sm font-bold text-slate-800">ڕاپۆرتی سەرپەرشتیار</p>
              <p className="font-sans text-xs text-slate-400 mt-0.5">ڕاپۆرتی پێشکەوتن و خاڵە لاوازەکان بۆ دایک و باوک</p>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-slate-400 flip-rtl shrink-0" />
        </button>

        {/* Subjects Change Action */}
        <button
          onClick={() => onNavigate("subjects")}
          className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-blue-50/30 hover:border-blue-200 transition-all text-right cursor-pointer min-h-[48px]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="font-sans text-sm font-bold text-slate-800">گۆڕینی بابەتی خوێندن</p>
              <p className="font-sans text-xs text-slate-400 mt-0.5">دەستکاریکردن یان هەڵبژاردنی بابەتێکی خوێندنی جیاواز</p>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-slate-400 flip-rtl shrink-0" />
        </button>
      </ZanaCard>
    </div>
  );
}
