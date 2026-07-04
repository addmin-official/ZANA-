import { ParentReportSnapshot } from "./parentReportTypes.ts";
import { ZanaCard } from "../../components/ZanaCard.tsx";
import { ZanaButton } from "../../components/ZanaButton.tsx";
import { 
  Printer, 
  RefreshCw, 
  BookOpen, 
  FileText, 
  Brain, 
  Heart, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Award, 
  AlertTriangle,
  Lightbulb
} from "lucide-react";

interface ParentIntelligenceReportPanelProps {
  snapshot: ParentReportSnapshot;
  loading: boolean;
  onRefresh: () => void;
  onPrint: () => void;
}

export function ParentIntelligenceReportPanel({
  snapshot,
  loading,
  onRefresh,
  onPrint,
}: ParentIntelligenceReportPanelProps) {
  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto pb-12 text-right select-none">
      {/* Action Header bar - hidden during print */}
      <div className="flex flex-col sm:flex-row-reverse sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100/80 print:hidden">
        <div>
          <h2 className="font-sans font-black text-xl text-slate-900">ڕاپۆرتی زیرەکیی دایک و باوک</h2>
          <p className="font-sans text-xs text-slate-500 mt-1">
            شیکردنەوەی گشتگیر و کاتیی لەسەر بەشداری، سەرکەوتن، و پلانەکانی داهاتووی {snapshot.studentName} لەگەڵ زانا.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 cursor-pointer text-xs font-sans font-bold border border-slate-200 hover:bg-slate-100/60 bg-white rounded-xl px-4 py-2 text-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>نوێکردنەوە</span>
          </button>
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 cursor-pointer text-xs font-sans font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 transition-colors border-none"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>چاپکردن / PDF</span>
          </button>
        </div>
      </div>

      {/* Main Print Container - styled to fit A4 layout cleanly */}
      <div 
        id="parent-report-print-sheet" 
        className="bg-white border border-slate-200/80 shadow-xs rounded-3xl p-6 sm:p-10 space-y-8 print:border-none print:shadow-none print:p-0 print:my-0 text-slate-800 relative overflow-hidden"
        style={{ direction: "rtl" }}
      >
        {/* Decorative corner background elements for digital layout, excluded during print */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/40 rounded-full blur-3xl pointer-events-none print:hidden"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-50/40 rounded-full blur-3xl pointer-events-none print:hidden"></div>

        {/* 1. Header & Official Branding */}
        <div className="border-b border-slate-100 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 animate-pulse"></span>
              <h1 className="font-sans font-black text-2xl text-slate-900 tracking-tight">سیستمی زیرەکیی زانا (ZANA)</h1>
            </div>
            <p className="font-sans text-xs text-slate-400 font-medium">پلاتفۆرمی نیشتمانیی فێربوونی زیرەکیی قوتابیانی کوردستان</p>
          </div>
          
          <div className="flex items-center gap-3 bg-indigo-50/50 px-4 py-2 rounded-2xl border border-indigo-100/30 print:border-none print:bg-slate-50">
            <div className="text-right">
              <span className="font-sans text-[9px] font-bold text-indigo-500 block uppercase tracking-wider">کۆدی ڕاپۆرت</span>
              <span className="font-sans text-xs font-black text-slate-800">PR-ZANA-{snapshot.studentName.toUpperCase().slice(0,3)}-2026</span>
            </div>
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 2. Student Dossier Card Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-100 print:bg-slate-50 print:border-slate-100">
          <div className="space-y-1 border-l border-slate-200/60 pl-2">
            <span className="font-sans text-[10px] text-slate-400 font-bold block">ناوی قوتابی</span>
            <span className="font-sans text-sm font-extrabold text-slate-900">{snapshot.studentName}</span>
          </div>
          <div className="space-y-1 md:border-l md:border-slate-200/60 pl-2">
            <span className="font-sans text-[10px] text-slate-400 font-bold block">پۆل و لایەن</span>
            <span className="font-sans text-sm font-extrabold text-slate-900">{snapshot.gradeLabel} - {snapshot.streamLabel}</span>
          </div>
          <div className="space-y-1 border-l border-slate-200/60 pl-2 mt-2 md:mt-0">
            <span className="font-sans text-[10px] text-slate-400 font-bold block">بابەتی خوێندنی چالاک</span>
            <span className="font-sans text-sm font-extrabold text-slate-900">{snapshot.subjectLabel}</span>
          </div>
          <div className="space-y-1 mt-2 md:mt-0">
            <span className="font-sans text-[10px] text-slate-400 font-bold block">ئاستی ئێستا</span>
            <span className="font-sans text-sm font-black text-indigo-600">{snapshot.levelLabel}</span>
          </div>
        </div>

        {/* 3. Metrics and Learning Meters */}
        <div className="space-y-4">
          <h3 className="font-sans font-black text-sm text-slate-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>نیشاندەرەکانی چالاکی و پابەندبوونی قوتابی</span>
          </h3>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Weekly Study Minutes */}
            <div className="border border-slate-100 p-4 rounded-2xl bg-white text-center space-y-1 shadow-2xs">
              <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Clock className="w-4 h-4" />
              </div>
              <span className="font-sans text-[10px] text-slate-400 font-bold block">خولەکەکانی خوێندنی حەفتانە</span>
              <span className="font-sans text-xl font-black text-slate-900 block">{snapshot.weeklyStudyMinutes} خولەک</span>
            </div>

            {/* Weekly Session Count */}
            <div className="border border-slate-100 p-4 rounded-2xl bg-white text-center space-y-1 shadow-2xs">
              <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="font-sans text-[10px] text-slate-400 font-bold block">دانیشتنەکانی خوێندنی حەفتانە</span>
              <span className="font-sans text-xl font-black text-slate-900 block">{snapshot.weeklySessionCount} دانیشتن</span>
            </div>

            {/* Completed Concepts Count */}
            <div className="border border-slate-100 p-4 rounded-2xl bg-white text-center space-y-1 shadow-2xs">
              <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="font-sans text-[10px] text-slate-400 font-bold block">چەمکە تەواوکراوەکان</span>
              <span className="font-sans text-xl font-black text-slate-900 block">{snapshot.completedConceptsCount} چەمک</span>
            </div>

            {/* Assessment Count */}
            <div className="border border-slate-100 p-4 rounded-2xl bg-white text-center space-y-1 shadow-2xs">
              <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Award className="w-4 h-4" />
              </div>
              <span className="font-sans text-[10px] text-slate-400 font-bold block">ژمارەی تاقیکردنەوەکان</span>
              <span className="font-sans text-xl font-black text-slate-900 block">{snapshot.assessmentCount} تاقیکردنەوە</span>
            </div>
          </div>
        </div>

        {/* 4. Latest Assessment Performance Meter (if available) */}
        {snapshot.latestAssessmentScore !== undefined && (
          <div className="bg-indigo-50/30 border border-indigo-100/40 p-5 rounded-2xl flex flex-col sm:flex-row-reverse sm:items-center justify-between gap-6 print:bg-indigo-50/10">
            <div className="space-y-1 flex-1 text-right">
              <span className="font-sans text-[10px] font-bold text-indigo-600 uppercase tracking-wide">دوا سەرکەوتنی تاقیکردنەوە</span>
              <h4 className="font-sans font-black text-base text-slate-900">نمرەی کۆتا هەڵسەنگاندن و شیکار</h4>
              <p className="font-sans text-xs text-slate-500 mt-1 leading-relaxed">
                ئەم ڕێژەیە نیشانی دەدات کە چەند بە سەرکەوتوویی بابەتە گشتییەکانی کۆتا سەرچاوەی لەگەڵ زانا تێپەڕاندووە.
              </p>
            </div>
            
            <div className="flex items-center gap-4 shrink-0 mx-auto sm:mx-0">
              <div className="relative w-20 h-20 flex items-center justify-center bg-white rounded-full shadow-xs border border-slate-100/80">
                {/* SVG Circular progress */}
                <svg className="absolute w-full h-full -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    className="stroke-slate-100"
                    strokeWidth="6"
                    fill="transparent"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    className="stroke-indigo-600"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - snapshot.latestAssessmentScore / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="font-sans text-lg font-black text-indigo-950">{snapshot.latestAssessmentScore}%</span>
              </div>
            </div>
          </div>
        )}

        {/* 5. Strong Areas / Weak Areas Splits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
          {/* Strong Areas Card */}
          <div className="border border-slate-100 rounded-2xl p-5 bg-white space-y-3 shadow-2xs">
            <h4 className="font-sans font-black text-sm text-emerald-800 flex items-center gap-1.5 justify-start">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>خاڵە بەهێزەکان (ئەو بابەتانەی تێگەیشتووە)</span>
            </h4>
            <div className="flex flex-wrap gap-2 justify-start">
              {snapshot.strongAreas.map((area, idx) => (
                <span 
                  key={idx} 
                  className="font-sans text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100/60 rounded-lg px-2.5 py-1"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>

          {/* Weak Areas Card */}
          <div className="border border-slate-100 rounded-2xl p-5 bg-white space-y-3 shadow-2xs">
            <h4 className="font-sans font-black text-sm text-amber-800 flex items-center gap-1.5 justify-start">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>پێویستی بە بەهێزکردنە (خاڵە لاوازەکان)</span>
            </h4>
            <div className="flex flex-wrap gap-2 justify-start">
              {snapshot.weakAreas.map((area, idx) => (
                <span 
                  key={idx} 
                  className="font-sans text-[11px] font-extrabold text-amber-700 bg-amber-50 border border-amber-100/60 rounded-lg px-2.5 py-1"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 6. Adaptive Recommendation from AI Zana */}
        {snapshot.adaptiveRecommendation && (
          <div className="border border-indigo-100/80 bg-indigo-50/20 rounded-2xl p-5 space-y-3 text-right">
            <h4 className="font-sans font-black text-sm text-indigo-900 flex items-center gap-1.5 justify-start">
              <Brain className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
              <span>ڕێڕەوی خوێندنی زیرەک: ڕاسپاردەی داهاتووی زانا</span>
            </h4>
            <p className="font-sans text-xs text-slate-700 leading-relaxed font-medium">
              {snapshot.adaptiveRecommendation}
            </p>
          </div>
        )}

        {/* 7. Warm Kurdish Sorani Home Guidance */}
        <div className="border-t border-slate-100 pt-6 space-y-4">
          <h4 className="font-sans font-black text-sm text-slate-900 flex items-center gap-1.5 justify-start">
            <Lightbulb className="w-4.5 h-4.5 text-amber-500 shrink-0" />
            <span>چۆن دایک و باوکان دەتوانن لە ماڵەوە هاوکار بن؟</span>
          </h4>

          <ul className="space-y-3 text-right">
            {snapshot.parentGuidance.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <Heart className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <span className="font-sans text-xs text-slate-600 leading-relaxed font-medium">{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Warnings Banner if any exist - hidden during print */}
        {snapshot.warnings.length > 0 && (
          <div className="border border-rose-100 bg-rose-50/30 p-4 rounded-xl space-y-1.5 text-right print:hidden">
            <span className="font-sans text-[10px] font-bold text-rose-600 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>تێبینی گرنگ بۆ سەرنجدان</span>
            </span>
            <ul className="list-disc list-inside space-y-1 text-xs text-rose-950 font-sans font-medium pr-1">
              {snapshot.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 8. Electronic Signature with Seal Watermark */}
        <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-400 font-sans font-bold">
          <span>بەرواری دروستکردن: {new Date(snapshot.generatedAt).toLocaleDateString("ku-IQ")}</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-slate-500">مۆر و متمانەی ئەلکترۆنی: زانا (ZANA EDUCATION ENGINE)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
