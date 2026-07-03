import { useParentReport } from "../features/report/useParentReport.ts";
import { StudentProfile } from "../services/storage.ts";
import { ZanaCard } from "../components/ZanaCard.tsx";
import { ZanaButton } from "../components/ZanaButton.tsx";
import { Printer, RefreshCw, FileText, AlertCircle, Sparkles, Loader2, CheckCircle } from "lucide-react";

interface ParentReportScreenProps {
  profile: StudentProfile;
}

export function ParentReportScreen({ profile }: ParentReportScreenProps) {
  const { report, loading, error, refreshReport } = useParentReport(profile);

  const activeSubjectName =
    profile.subject === "math"
      ? "بیرکاری"
      : profile.subject === "physics"
      ? "فیزیا"
      : profile.subject === "chemistry"
      ? "کیمیا"
      : "ئینگلیزی";

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <h3 className="font-sans font-bold text-lg text-slate-800">ڕاپۆرتی گەشەکردنی زانا</h3>
        <p className="font-sans text-sm text-slate-400 max-w-xs leading-relaxed">
          مامۆستا زانا سەرقاڵی شیکردنەوەی سەرجەم گفتوگۆ و نمرەکانی {profile.name}یە بۆ نووسینی ڕاپۆرتی تایبەت بە دایک و باوکان...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col justify-center py-6">
        <ZanaCard className="max-w-sm mx-auto p-6 text-center border-red-100">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="font-sans text-sm text-slate-600 leading-relaxed mb-6">
            {error}
          </p>
          <ZanaButton variant="destructive" onClick={() => refreshReport()} className="mx-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            <span>دووبارە هەوڵبدەرەوە</span>
          </ZanaButton>
        </ZanaCard>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-6 flex-1 flex flex-col justify-start pb-10">
      {/* Top action block */}
      <div className="flex justify-between items-center print:hidden">
        <button
          onClick={() => refreshReport()}
          className="text-xs text-blue-600 hover:text-blue-700 font-sans flex items-center gap-1 cursor-pointer bg-blue-50 hover:bg-blue-100/60 rounded-lg px-2.5 py-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>نوێکردنەوەی ڕاپۆرت</span>
        </button>
        <h2 className="font-sans font-bold text-xl text-slate-900 text-right">
          ڕاپۆرتی گەشەکردنی قوتابی
        </h2>
      </div>

      <p className="font-sans text-xs text-slate-500 text-right leading-relaxed print:hidden">
        ئەم ڕاپۆرتە تایبەتە بە چاودێریکردن و ئاگاداربوونی دایک و باوکان لەسەر ئاستی فێربوونی ڕۆژانەی قوتابی لەگەڵ مامۆستا زانا.
      </p>

      {/* Main Printable Report Sheet */}
      <div id="printable-report-area" className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 text-right print:border-none print:shadow-none print:p-0">
        
        {/* Report Official Header */}
        <div className="border-b border-slate-100 pb-4 flex flex-row-reverse justify-between items-center">
          <div>
            <h1 className="font-sans font-extrabold text-lg text-slate-900">ڕاپۆرتی فێرکاریی زانا</h1>
            <p className="font-sans text-[10px] text-slate-400 mt-1">ئامادەکراوە لە لایەن خزمەتگوزاری فێرکاری ZANA AI</p>
          </div>
          <div className="w-10 h-10 bg-slate-950 text-white rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Student Dossier Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs font-sans bg-slate-50 p-4 rounded-xl border border-slate-100/50">
          <div>
            <span className="text-slate-400">ناوی قوتابی:</span>
            <p className="font-bold text-slate-800 mt-0.5">{report.studentName}</p>
          </div>
          <div>
            <span className="text-slate-400">پۆلی خوێندن:</span>
            <p className="font-bold text-slate-800 mt-0.5">پۆلی {report.grade}</p>
          </div>
          <div className="mt-2">
            <span className="text-slate-400">بابەتی خوێندنی چالاک:</span>
            <p className="font-bold text-slate-800 mt-0.5">{activeSubjectName}</p>
          </div>
          <div className="mt-2">
            <span className="text-slate-400">ئاستی زانستیی ئێستا:</span>
            <p className="font-bold text-blue-600 mt-0.5">ئاستی {report.level}</p>
          </div>
        </div>

        {/* Core Stats Progress meters */}
        <div className="space-y-4">
          <h4 className="font-sans font-bold text-sm text-slate-800 flex items-center gap-1.5 justify-start">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>نیشاندەرەکانی خوێندن</span>
          </h4>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="border border-slate-100 p-2.5 rounded-xl">
              <span className="font-sans text-[10px] text-slate-400">ڕێژەی پێشکەوتن</span>
              <p className="font-sans font-black text-slate-800 text-lg mt-0.5">{report.currentProgressPercent}%</p>
            </div>
            <div className="border border-slate-100 p-2.5 rounded-xl">
              <span className="font-sans text-[10px] text-slate-400">خولەکانی خوێندن</span>
              <p className="font-sans font-black text-slate-800 text-lg mt-0.5">{report.totalSessions}</p>
            </div>
            <div className="border border-slate-100 p-2.5 rounded-xl">
              <span className="font-sans text-[10px] text-slate-400">کۆی پرسیارەکان</span>
              <p className="font-sans font-black text-slate-800 text-lg mt-0.5">{report.weeklyQuestionCount}</p>
            </div>
          </div>
        </div>

        {/* Weak Areas Summary */}
        <div className="space-y-2">
          <h4 className="font-sans font-bold text-sm text-slate-800">بەشەکان کە پێویستیان بە چاککردنە (Weak Areas)</h4>
          <div className="flex flex-wrap gap-1.5 justify-start">
            {report.weakAreas.map((area, idx) => (
              <span key={idx} className="font-sans text-xs font-semibold text-slate-600 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1">
                {area}
              </span>
            ))}
          </div>
        </div>

        {/* Zana's Written Recommendation Text */}
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <h4 className="font-sans font-bold text-sm text-slate-800 flex items-center gap-1.5 justify-start">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>ڕاسپاردەی مامۆستا زانا بۆ دایک و باوک:</span>
          </h4>
          <div className="font-sans text-xs text-slate-600 leading-relaxed whitespace-pre-wrap bg-blue-50/20 border border-blue-50 rounded-xl p-4 text-right">
            {report.recommendation}
          </div>
        </div>

        {/* Official Signature */}
        <div className="border-t border-slate-100 pt-6 flex justify-between items-center text-[10px] text-slate-400 font-sans">
          <span>بەروار: {new Date().toLocaleDateString("ku-IQ")}</span>
          <span className="font-bold text-slate-600">ئیمزای ئەلکترۆنی: زانا (ZANA AI)</span>
        </div>
      </div>

      {/* Print Button */}
      <ZanaButton
        variant="outline"
        fullWidth
        onClick={handlePrint}
        className="print:hidden flex items-center justify-center gap-2"
      >
        <Printer className="w-5 h-5" />
        <span>چاپکردنی ڕاپۆرتەکە (PDF یان وەرەقە)</span>
      </ZanaButton>
    </div>
  );
}
