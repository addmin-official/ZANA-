import { useState, FormEvent } from "react";
import { StudentProfile } from "../services/storage.ts";
import { ZanaCard } from "../components/ZanaCard.tsx";
import { ZanaButton } from "../components/ZanaButton.tsx";
import { GRADES_LIST, SUBJECTS_DATA, LEVELS_LIST } from "../data/subjects.ts";
import { Settings, User, Trash2, ListRestart, AlertTriangle, ShieldCheck, CheckCircle2, Award, Brain, Target, AlertCircle } from "lucide-react";
import { useStudentMastery } from "../learning/hooks/useStudentMastery.ts";

interface ProfileScreenProps {
  profile: StudentProfile;
  onUpdateProfile: (updates: Partial<StudentProfile>) => void;
  onResetAll: () => void;
}

export function ProfileScreen({ profile, onUpdateProfile, onResetAll }: ProfileScreenProps) {
  const [name, setName] = useState(profile.name);
  const [grade, setGrade] = useState(profile.grade);
  const [subject, setSubject] = useState(profile.activeSubject);
  const [level, setLevel] = useState(profile.level);
  const [showSuccess, setShowSuccess] = useState(false);
  const { profile: masteryProfile, recommendations: recs, loading } = useStudentMastery(profile.id);
  const misconceptions = masteryProfile?.activeMisconceptions || [];

  // Destruction confirmations
  const [showConfirmResetAll, setShowConfirmResetAll] = useState(false);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onUpdateProfile({
        name: name.trim(),
        grade,
        activeSubject: subject,
        level
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const handleHardReset = () => {
    onResetAll();
    setShowConfirmResetAll(false);
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col justify-start pb-10">
      {/* Title */}
      <div className="text-right flex items-center gap-2 justify-end">
        <h2 className="font-sans font-bold text-xl text-slate-900">ڕێکخستنی پڕۆفایل</h2>
        <Settings className="w-5 h-5 text-slate-500" />
      </div>

      {showSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-sans rounded-xl text-right flex items-center gap-2 justify-start">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>زانیارییەکانت بە سەرکەوتوویی نوێکرانەوە!</span>
        </div>
      )}

      {/* PHASE 15 - MASTERY & ADAPTIVE LEARNING DASHBOARD */}
      <ZanaCard className="border-blue-150 bg-slate-50/30">
        <div className="space-y-4 text-right" style={{ direction: "rtl" }}>
          <div className="flex items-center gap-2 justify-start border-b border-slate-100 pb-2.5 mb-2">
            <Brain className="w-5 h-5 text-blue-600" />
            <h3 className="font-sans font-black text-sm text-slate-800">
              ئاستی لێهاتوویی و ڕێڕەوی فێربوون (Mastery Profile)
            </h3>
          </div>

          {loading ? (
            <p className="font-sans text-xs text-slate-400 py-4 text-center">بۆ متمانەت، زانیارییەکان باردەکرێن...</p>
          ) : (
            <div className="space-y-4">
              {/* Overall Score */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
                <div className="text-right space-y-0.5">
                  <span className="font-sans text-[11px] font-bold text-slate-400 block">نمرەی لێهاتوویی گشتی</span>
                  <span className="font-sans font-black text-xl text-blue-700">
                    {Math.round((masteryProfile?.overallMasteryScore || 0) * 100)}%
                  </span>
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6" />
                </div>
              </div>

              {/* Recommendations */}
              {recs && recs.length > 0 && (
                <div className="space-y-2">
                  <span className="font-sans text-xs font-bold text-slate-500 block">پێشنیارە گونجێنراوەکانی زانا (Adaptive Recommendations)</span>
                  {recs.map((r) => (
                    <div key={r.id} className="bg-amber-50/40 p-3 rounded-xl border border-amber-100/70 text-right space-y-1.5">
                      <div className="flex items-center gap-1.5 justify-start text-amber-800">
                        <Target className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-sans font-black text-xs">{r.titleKu}</span>
                        <span className="font-sans text-[10px] bg-amber-100 px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider mr-auto">
                          {r.priority === "high" ? "گرنگ" : "مامناوەند"}
                        </span>
                      </div>
                      <p className="font-sans text-xs text-slate-600 leading-relaxed">{r.explanationKu}</p>
                      <div className="bg-amber-100/30 p-2 rounded-lg text-[10px] text-amber-900 font-sans leading-relaxed border border-amber-100/50">
                        <strong>لێکدانەوەی زانستی:</strong> {r.reasoningKu}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Active Misconceptions */}
              {misconceptions && misconceptions.length > 0 && (
                <div className="space-y-2">
                  <span className="font-sans text-xs font-bold text-red-500 block">لێکتێنەگەیشتنە دەستنیشانکراوەکان (Detected Misconceptions)</span>
                  {misconceptions.map((m) => (
                    <div key={m.misconceptionId} className="bg-red-50/50 p-3 rounded-xl border border-red-100 text-right flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 flex-1">
                        <span className="font-sans font-bold text-xs text-red-800 block">{m.nameKu}</span>
                        <span className="font-sans text-[10px] text-slate-500 block">تەواوی دووبارەبوونەوە: {m.count} جار</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Concept Masteries List */}
              <div className="space-y-2">
                <span className="font-sans text-xs font-bold text-slate-500 block">چەمکەکانی خشتەی خوێندن و فێربوون</span>
                {Object.keys(masteryProfile?.conceptMasteries || {}).length === 0 ? (
                  <div className="text-center p-6 bg-white border border-slate-100 rounded-xl">
                    <p className="font-sans text-xs text-slate-400">تا ئێستا هیچ تاقیکردنەوە یان ڕاهێنانێک ئەنجام نەدراوە.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {Object.values(masteryProfile?.conceptMasteries || {}).map((c: any) => {
                      const statusKurdish =
                        c.status === "NOT_STARTED" ? "دەست پێنەکراوە" :
                        c.status === "INTRODUCED" ? "ناسێندراو" :
                        c.status === "DEVELOPING" ? "لە گەشەکردندا" :
                        c.status === "PROFICIENT" ? "لێهاتوو" :
                        c.status === "MASTERED" ? "کۆنتڕۆڵکراو" :
                        c.status === "NEEDS_REVIEW" ? "پێویستی بە پێداچوونەوەیە" : c.status;

                      return (
                        <div key={c.conceptId} className="bg-white p-3 rounded-xl border border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-sans font-black text-slate-800">{c.conceptId}</span>
                            <span className={`font-sans text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              c.status === "MASTERED" ? "bg-emerald-50 text-emerald-700" :
                              c.status === "PROFICIENT" ? "bg-blue-50 text-blue-700" :
                              c.status === "NEEDS_REVIEW" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"
                            }`}>
                              {statusKurdish}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                c.status === "MASTERED" ? "bg-emerald-500" :
                                c.status === "PROFICIENT" ? "bg-blue-500" :
                                c.status === "NEEDS_REVIEW" ? "bg-red-500" : "bg-amber-500"
                              }`}
                              style={{ width: `${c.masteryScore * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ZanaCard>

      {/* Edit Form Card */}
      <ZanaCard>
        <form onSubmit={handleSave} className="space-y-4 text-right">
          <h3 className="font-sans font-bold text-sm text-slate-800 border-b border-slate-50 pb-2 mb-2">
            دەستکاریکردنی زانیارییەکان
          </h3>

          {/* Name */}
          <div className="space-y-1">
            <label className="block text-right font-sans text-xs font-bold text-slate-500">
              ناوی قوتابی
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full font-sans text-sm min-h-[48px] px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-right"
              style={{ direction: "rtl" }}
            />
          </div>

          {/* Grade selection */}
          <div className="space-y-1">
            <label className="block text-right font-sans text-xs font-bold text-slate-500">
              پۆلی خوێندن
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value as any)}
              className="w-full font-sans text-sm min-h-[48px] px-3 rounded-xl border border-slate-200 bg-white text-right"
              style={{ direction: "rtl" }}
            >
              {GRADES_LIST.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* Subject selection */}
          <div className="space-y-1">
            <label className="block text-right font-sans text-xs font-bold text-slate-500">
              بابەتی خوێندن
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as any)}
              className="w-full font-sans text-sm min-h-[48px] px-3 rounded-xl border border-slate-200 bg-white text-right"
              style={{ direction: "rtl" }}
            >
              {SUBJECTS_DATA.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Level selection */}
          <div className="space-y-1">
            <label className="block text-right font-sans text-xs font-bold text-slate-500">
              ئاستی ئێستای فێربوون
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as any)}
              className="w-full font-sans text-sm min-h-[48px] px-3 rounded-xl border border-slate-200 bg-white text-right"
              style={{ direction: "rtl" }}
            >
              {LEVELS_LIST.map((lvl) => (
                <option key={lvl.value} value={lvl.value}>
                  {lvl.label}
                </option>
              ))}
            </select>
          </div>

          <ZanaButton type="submit" variant="secondary" fullWidth className="mt-6">
            <span>پاشەکەوتکردنی زانیارییەکان</span>
          </ZanaButton>
        </form>
      </ZanaCard>

      {/* Danger Zone Actions */}
      <ZanaCard className="border-red-100">
        <div className="space-y-3 text-right">
          <h3 className="font-sans font-bold text-sm text-red-800 border-b border-red-50 pb-2 mb-2 flex items-center gap-1.5 justify-start">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>ناوچەی مەترسیدار</span>
          </h3>
          <p className="font-sans text-xs text-slate-400">
            کرداری خوارەوە دەبێتە هۆی سرڕینەوەی بەردەوامی زانیارییەکانت.
          </p>

          <ZanaButton
            variant="outline"
            fullWidth
            onClick={() => setShowConfirmResetAll(true)}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>سرینەوەی گشتی سەرجەم زانیارییەکان</span>
          </ZanaButton>
        </div>
      </ZanaCard>

      {/* Confirmation Reset All Modal Overlay */}
      {showConfirmResetAll && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xs w-full p-6 text-right border border-slate-100 shadow-xl space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-sans font-bold text-base text-slate-900">
              دڵنیایت لە سڕینەوەی گشتی؟
            </h4>
            <p className="font-sans text-xs text-slate-500 leading-relaxed">
              ئەم کردارە تەواوی ناسنامەی قوتابی، پێشکەوتنەکان، نمرەی تاقیکردنەوەکان و مێژووی چات لەگەڵ زانا بە تەواوی ڕەشدەکاتەوە.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirmResetAll(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-sans font-bold cursor-pointer transition-colors"
              >
                پەشیمانبوونەوە
              </button>
              <button
                onClick={handleHardReset}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-sans font-bold cursor-pointer transition-colors"
              >
                بەڵێ، ڕەشیبکەرەوە
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
