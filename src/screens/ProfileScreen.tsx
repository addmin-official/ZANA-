import { useState, FormEvent } from "react";
import { StudentProfile } from "../services/storage.ts";
import { ZanaCard } from "../components/ZanaCard.tsx";
import { ZanaButton } from "../components/ZanaButton.tsx";
import { GRADES_LIST, SUBJECTS_DATA, LEVELS_LIST } from "../data/subjects.ts";
import { Settings, User, Trash2, ListRestart, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";

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
              onChange={(e) => setGrade(e.target.value)}
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
              onChange={(e) => setSubject(e.target.value)}
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
              onChange={(e) => setLevel(e.target.value)}
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
