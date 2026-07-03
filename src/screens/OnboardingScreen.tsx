import { useState } from "react";
import { ZanaButton } from "../components/ZanaButton.tsx";
import { ZanaCard } from "../components/ZanaCard.tsx";
import { GRADES_LIST, SUBJECTS_DATA, LEVELS_LIST } from "../data/subjects.ts";
import { GraduationCap, ArrowRight, Sparkles } from "lucide-react";

interface OnboardingScreenProps {
  onComplete: (name: string, grade: string, subject: string, level: string) => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("12");
  const [subject, setSubject] = useState("math");
  const [level, setLevel] = useState("مامناوەند");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        setError("تکایە سەرەتا ناوەکەت بنووسە بۆ ئەوەی دەستپێبکەین.");
        return;
      }
      setError("");
      setStep(2);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("تکایە سەرەتا ناوەکەت بنووسە.");
      setStep(1);
      return;
    }
    onComplete(name.trim(), grade, subject, level);
  };

  return (
    <div className="flex-1 flex flex-col justify-center py-6">
      {/* Brand Header inside Onboarding */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-md">
          <GraduationCap className="w-10 h-10" />
        </div>
        <h2 className="font-sans font-bold text-2xl text-slate-900">
          بەخێربێیت بۆ زانا
        </h2>
        <p className="font-sans text-sm text-slate-500 mt-2">
          هاوڕێی زیرەک و مامۆستای تایبەتیی تۆ بۆ پۆلەکانی ٩-١٢
        </p>
      </div>

      <ZanaCard className="w-full max-w-sm mx-auto shadow-md">
        {step === 1 ? (
          <div className="space-y-6">
            <div className="text-right">
              <h3 className="font-sans font-bold text-lg text-slate-800 flex items-center gap-2 justify-start">
                <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
                <span>با بەیەکەوە ناسیاوی دروست بکەین</span>
              </h3>
              <p className="font-sans text-xs text-slate-400 mt-1">
                ناو و پۆلی خوێندنی خۆت لێرە دیاری بکە.
              </p>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <label className="block text-right font-sans text-sm font-bold text-slate-700">
                ناوی تەواوت
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (e.target.value.trim()) setError("");
                }}
                placeholder="بۆ نموونە: ئاراز دانا"
                className="w-full font-sans text-sm min-h-[48px] px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-right"
                style={{ direction: "rtl" }}
              />
              {error && (
                <p className="font-sans text-xs text-red-500 text-right font-medium">
                  {error}
                </p>
              )}
            </div>

            {/* Grade Selection */}
            <div className="space-y-2">
              <label className="block text-right font-sans text-sm font-bold text-slate-700">
                پۆلی خوێندن
              </label>
              <div className="grid grid-cols-2 gap-2">
                {GRADES_LIST.map((g) => {
                  const isSelected = grade === g.value;
                  return (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGrade(g.value)}
                      className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-sans font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-50 border-blue-500 text-blue-700 shadow-xs"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <ZanaButton variant="primary" fullWidth onClick={handleNext} className="mt-4">
              <span>هەنگاوی داهاتوو</span>
              <ArrowRight className="w-5 h-5 flip-rtl mr-2" />
            </ZanaButton>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-right">
              <h3 className="font-sans font-bold text-lg text-slate-800">
                دیاریکردنی ئاست و بابەت
              </h3>
              <p className="font-sans text-xs text-slate-400 mt-1">
                یارمەتی زانا بدە تا بە شێوازێکی گونجاو وەڵامت بداتەوە.
              </p>
            </div>

            {/* Subject Selection */}
            <div className="space-y-2">
              <label className="block text-right font-sans text-sm font-bold text-slate-700">
                بابەتی خوێندنی دەستپێک
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SUBJECTS_DATA.map((sub) => {
                  const isSelected = subject === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSubject(sub.id)}
                      className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-sans font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-50 border-blue-500 text-blue-700 shadow-xs"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {sub.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Level Selection */}
            <div className="space-y-2">
              <label className="block text-right font-sans text-sm font-bold text-slate-700">
                ئاستی زانستیت لەم بابەتەدا
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {LEVELS_LIST.map((lvl) => {
                  const isSelected = level === lvl.value;
                  return (
                    <button
                      key={lvl.value}
                      type="button"
                      onClick={() => setLevel(lvl.value)}
                      className={`min-h-[44px] px-2 py-2 rounded-xl border text-[11px] font-sans font-medium transition-all cursor-pointer text-center ${
                        isSelected
                          ? "bg-blue-50 border-blue-500 text-blue-700 shadow-xs"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {lvl.label.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <ZanaButton variant="outline" onClick={() => setStep(1)}>
                <span>گەڕانەوە</span>
              </ZanaButton>
              <ZanaButton variant="secondary" onClick={handleSubmit}>
                <span>تۆمارکردن</span>
              </ZanaButton>
            </div>
          </div>
        )}
      </ZanaCard>
    </div>
  );
}
