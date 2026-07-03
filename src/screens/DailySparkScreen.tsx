import { ZanaButton } from "../components/ZanaButton.tsx";
import { ZanaCard } from "../components/ZanaCard.tsx";
import { StudentProfile, ProgressState, ZanaStorage } from "../services/storage.ts";
import { SUBJECTS_DATA } from "../data/subjects.ts";
import { Sparkles, MessageSquare, Award, FileText, ArrowLeft, BookOpen, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { LEVEL_LABELS } from "../features/student/studentDefaults.ts";
import { StudentLevel } from "../features/student/studentTypes.ts";

interface DailySparkScreenProps {
  profile: StudentProfile;
  onNavigate: (tab: string) => void;
  onStartAssessment: () => void;
}

export function DailySparkScreen({ profile, onNavigate, onStartAssessment }: DailySparkScreenProps) {
  const [progress, setProgress] = useState<ProgressState>(() => ZanaStorage.getProgress());
  
  useEffect(() => {
    setProgress(ZanaStorage.getProgress());
  }, [profile]);

  // Determine a personalized educational suggestion based on subject and grade
  const getDailySuggestion = () => {
    const subData = SUBJECTS_DATA.find((s) => s.id === profile.subject);
    if (!subData) return { title: "خوێندنی چەمکەکان", desc: "با پێکەوە چەمکە خوێندنییەکانی بابەتەکەت تاقیبکەینەوە." };
    
    const chapters = subData.grades[profile.grade] || [];
    if (chapters.length > 0 && chapters[0].lessons.length > 0) {
      return {
        title: chapters[0].title,
        desc: chapters[0].lessons[0].title
      };
    }
    return { title: `بابەتی ${subData.name}`, desc: "دەست بکە بە گفتوگۆ بۆ شیکاری پرسیارەکان." };
  };

  const daily = getDailySuggestion();

  // Get current greeting based on time of day
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "بەیانیت باش";
    if (hours < 18) return "ڕۆژت باش";
    return "ئێوارەت باش";
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col justify-start">
      {/* Welcome Greeting */}
      <div className="text-right">
        <span className="font-sans text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
          {getGreeting()} • {LEVEL_LABELS[profile.level as StudentLevel] || profile.level}
        </span>
        <h2 className="font-sans font-bold text-2xl text-slate-900 mt-2">
          سڵاو، {profile.name} دڵسۆز!
        </h2>
        <p className="font-sans text-sm text-slate-500 mt-1 leading-relaxed">
          ئامادەی بۆ ئەوەی ئەمڕۆ بەیەکەوە فێرببین و ئاستی زانستیت لۆ پۆلی {profile.grade} بەرز بکەینەوە؟
        </p>
      </div>

      {/* Daily Recommendation Card */}
      <ZanaCard
        header={
          <div className="flex items-center gap-2 justify-start">
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
            <h3 className="font-sans font-bold text-sm text-slate-800">
              پێشنیاری خوێندنی ئەمڕۆت
            </h3>
          </div>
        }
        className="border-blue-100/70"
      >
        <div className="space-y-4 text-right">
          <div>
            <h4 className="font-sans font-bold text-base text-slate-900">
              {daily.title}
            </h4>
            <p className="font-sans text-sm text-slate-500 mt-1">
              وانە: {daily.desc}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-sans">
            <Clock className="w-4 h-4 text-blue-500 shrink-0" />
            <span>ماوەی پێشنیارکراو: ١٥ خولەک گفتوگۆ</span>
          </div>

          <ZanaButton
            variant="primary"
            fullWidth
            onClick={() => onNavigate("chat")}
            className="mt-2"
          >
            <span>دەستپێکردنی گفتوگۆ</span>
            <MessageSquare className="w-5 h-5 mr-2" />
          </ZanaButton>
        </div>
      </ZanaCard>

      {/* Progress Mini Grid */}
      <div className="grid grid-cols-2 gap-3">
        <ZanaCard className="p-4 flex flex-col justify-between">
          <div className="text-right">
            <p className="font-sans text-xs font-bold text-slate-400">خولەکان</p>
            <p className="font-sans font-black text-2xl text-slate-800 mt-1">{progress.totalSessions}</p>
          </div>
          <div className="text-right mt-3">
            <span className="font-sans text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
              چەککراو
            </span>
          </div>
        </ZanaCard>

        <ZanaCard className="p-4 flex flex-col justify-between">
          <div className="text-right">
            <p className="font-sans text-xs font-bold text-slate-400">پرسیارەکان</p>
            <p className="font-sans font-black text-2xl text-slate-800 mt-1">{progress.weeklyQuestionCount}</p>
          </div>
          <div className="text-right mt-3">
            <span className="font-sans text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
              ئەم هەفتەیە
            </span>
          </div>
        </ZanaCard>
      </div>

      {/* Action List */}
      <ZanaCard className="space-y-3">
        <h4 className="font-sans font-bold text-sm text-slate-800 text-right mb-2">
          کردارە خێراکان
        </h4>

        {/* Assessment Action */}
        <button
          onClick={onStartAssessment}
          className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-blue-50/30 hover:border-blue-200 transition-all text-right cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="font-sans text-sm font-bold text-slate-800">تاقیکردنەوەی ئاست (٥ پرسیار)</p>
              <p className="font-sans text-xs text-slate-400">خۆت هەڵسەنگێنە و ئاستەکەت نوێ بکەرەوە</p>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-slate-400 flip-rtl" />
        </button>

        {/* Parent Report Action */}
        <button
          onClick={() => onNavigate("report")}
          className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-blue-50/30 hover:border-blue-200 transition-all text-right cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="font-sans text-sm font-bold text-slate-800">ڕاپۆرتی گشتی دایک و باوک</p>
              <p className="font-sans text-xs text-slate-400">سەیری ڕاپۆرتی پێشکەوتن و پێشنیارەکان بکە</p>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-slate-400 flip-rtl" />
        </button>
      </ZanaCard>
    </div>
  );
}
