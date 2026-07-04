import { useState } from "react";
import { ZanaButton } from "../components/ZanaButton.tsx";
import { ZanaCard } from "../components/ZanaCard.tsx";
import {
  GRADE_LABELS,
  STREAM_LABELS,
  SUBJECT_LABELS,
  LEVEL_LABELS,
} from "../features/student/studentDefaults.ts";
import { StudentGrade, AcademicStream, SubjectKey, StudentLevel } from "../features/student/studentTypes.ts";
import {
  GraduationCap,
  Sparkles,
  User,
  School,
  BookOpen,
  Award,
  CheckCircle2,
  BookMarked,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface OnboardingScreenProps {
  onComplete: (name: string, grade: string, subject: string, level: string, stream?: string) => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<StudentGrade>("12");
  const [stream, setStream] = useState<AcademicStream>("scientific");
  const [subject, setSubject] = useState<SubjectKey>("math");
  const [level, setLevel] = useState<StudentLevel>("intermediate");
  const [error, setError] = useState("");

  const totalSteps = 7;

  // Handles updating grade and automatically adjusting default stream
  const handleSelectGrade = (selectedGrade: StudentGrade) => {
    setGrade(selectedGrade);
    if (selectedGrade === "11" || selectedGrade === "12") {
      if (stream === "general") {
        setStream("scientific");
      }
    } else {
      setStream("general");
    }
  };

  const handleNext = () => {
    if (step === 2) {
      if (!name.trim()) {
        setError("تکایە سەرەتا ناوی خۆت بنووسە بۆ ئەوەی بتوانین دەست پێ بکەین.");
        return;
      }
      if (name.trim().length < 2) {
        setError("تکایە ناوێکی ڕاستەقینە بنووسە (بەکەمترین خوولی ٢ پیت).");
        return;
      }
      setError("");
    }
    setStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("تکایە ناوەکەت بنووسە.");
      setStep(2);
      return;
    }
    onComplete(name.trim(), grade, subject, level, stream);
  };

  const progressPercentage = (step / totalSteps) * 100;

  // Main UI screens for each step
  return (
    <div className="w-full max-w-md mx-auto py-6 px-4 flex flex-col justify-between min-h-[85vh] overflow-x-hidden select-none" dir="rtl">
      {/* Top Progress & Back Button */}
      <div className="w-full mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="font-sans text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            هەنگاوی {step} لە {totalSteps}
          </span>
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-sm font-sans font-medium transition-colors cursor-pointer min-h-[40px] px-2 rounded-lg"
            >
              <ChevronRight className="w-4 h-4" />
              <span>گەڕانەوە</span>
            </button>
          )}
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Main Form/Card Content */}
      <div className="flex-1 flex flex-col justify-center">
        <ZanaCard className="w-full shadow-lg border border-slate-100/80 rounded-2xl bg-white overflow-hidden transition-all duration-300">
          {/* Step 1: Welcome Screen */}
          {step === 1 && (
            <div className="space-y-6 text-right">
              <div className="text-center py-4">
                <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-5 shadow-lg shadow-blue-200">
                  <GraduationCap className="w-12 h-12" />
                </div>
                <h2 className="font-sans font-extrabold text-2xl text-slate-900 leading-tight">
                  بەخێربێیت بۆ زانا 🎓
                </h2>
                <p className="font-sans text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                  هاوڕێی زیرەکی فێربوونی تۆ؛ بە کوردییەکی ڕوون، هەنگاو بە هەنگاو یارمەتیت دەدات تا باشتر تێبگەیت، زیاتر ڕاهێنان بکەیت و بە متمانەوە پێش بکەویت.
                </p>
              </div>

              <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                <div className="flex gap-3 items-start text-right">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-sans font-bold text-sm text-slate-800">فێربوونی هەنگاو بە هەنگاو</h4>
                    <p className="font-sans text-xs text-slate-500 mt-0.5 leading-relaxed">زانا وانەکان بە زمانی سادە، نموونەی کارپێکراو و ڕاهێنانی کورت ڕوون دەکاتەوە.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start text-right">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-sans font-bold text-sm text-slate-800">هەڵسەنگاندنی ئاست</h4>
                    <p className="font-sans text-xs text-slate-500 mt-0.5 leading-relaxed">لە سەرەتادا ئاستت دەناسێت، پاشان ڕێگای فێربوونت بەپێی تواناکانت ڕێکدەخات.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start text-right">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-sans font-bold text-sm text-slate-800">پێشکەوتنی ڕۆژانە</h4>
                    <p className="font-sans text-xs text-slate-500 mt-0.5 leading-relaxed">هەر ڕۆژ ئەرکێکی بچووک و گونجاوت پێدەدات، تا بەردەوام بمێنیت و هەست بە پێشکەوتن بکەیت.</p>
                  </div>
                </div>
              </div>

              <ZanaButton variant="primary" fullWidth onClick={handleNext} className="mt-2 h-12">
                <span>دەست پێ بکەین</span>
                <ChevronLeft className="w-5 h-5 mr-2" />
              </ZanaButton>
            </div>
          )}

          {/* Step 2: Student Name */}
          {step === 2 && (
            <div className="space-y-6 text-right">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-2">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="font-sans font-bold text-xl text-slate-800">ناوت چییە؟</h3>
                <p className="font-sans text-sm text-slate-500">
                  ناوت بنووسە تا زانا بتوانێت بە شێوەیەکی نزیکتر و تایبەتتر یارمەتیت بدات.
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (e.target.value.trim()) setError("");
                  }}
                  placeholder="نموونە: سۆران، ئارام، ڕۆژین"
                  className="w-full font-sans text-base min-h-[50px] px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-right"
                  autoFocus
                />
                {error && (
                  <p className="font-sans text-xs text-red-500 mt-1 font-medium">
                    ⚠️ {error}
                  </p>
                )}
              </div>

              <ZanaButton variant="primary" fullWidth onClick={handleNext} className="h-12 mt-4">
                <span>بەردەوام بە</span>
                <ChevronLeft className="w-5 h-5 mr-2" />
              </ZanaButton>
            </div>
          )}

          {/* Step 3: Grade Selection */}
          {step === 3 && (
            <div className="space-y-6 text-right">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-2">
                  <School className="w-6 h-6" />
                </div>
                <h3 className="font-sans font-bold text-xl text-slate-800">لە کام پۆل دەخوێنیت؟</h3>
                <p className="font-sans text-sm text-slate-500">
                  پۆلەکەت هەڵبژێرە، بۆ ئەوەی وانە و ڕاهێنانەکان گونجاو بن.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {(Object.keys(GRADE_LABELS) as StudentGrade[]).map((val) => {
                  const isSelected = grade === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSelectGrade(val)}
                      className={`min-h-[52px] w-full px-4 rounded-xl border font-sans text-base font-semibold text-right transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-blue-50/70 border-blue-500 text-blue-700 shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{GRADE_LABELS[val]}</span>
                      {isSelected && <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white"><span className="text-[10px]">✓</span></div>}
                    </button>
                  );
                })}
              </div>

              <ZanaButton variant="primary" fullWidth onClick={handleNext} className="h-12 mt-4">
                <span>بەردەوام بە</span>
                <ChevronLeft className="w-5 h-5 mr-2" />
              </ZanaButton>
            </div>
          )}

          {/* Step 4: Academic Stream */}
          {step === 4 && (
            <div className="space-y-6 text-right">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-2">
                  <BookMarked className="w-6 h-6" />
                </div>
                <h3 className="font-sans font-bold text-xl text-slate-800">ڕێڕەوی خوێندنت چییە؟</h3>
                <p className="font-sans text-sm text-slate-500 font-medium">
                  {grade === "11" || grade === "12"
                    ? "ڕێڕەوی خوێندنی پۆلی ١١ و ١٢ بەپێی پڕۆگرامی وەزارەت دیاری دەکرێت بە زانستی یان وێژەیی."
                    : "بۆ ئەم پۆلە، ڕێڕەوی گشتی گونجاوترینە، بەڵام دەتوانیت بژاردەکانی تریش تاقی بکەیتەوە."}
                </p>
              </div>

              {/* Special warning style for 11 and 12 */}
              {(grade === "11" || grade === "12") && (
                <div className="bg-amber-50 border border-amber-100 text-amber-800 px-3.5 py-2.5 rounded-xl font-sans text-xs">
                  📌 <strong>ئاگاداری:</strong> بۆ ئەم پۆلە ڕێڕەوی <strong>گشتی</strong> بوونی نییە، تکایە ڕێڕەوەکەت بە دروستی هەڵبژێرە.
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                {/* Dynamically filter stream list */}
                {(Object.keys(STREAM_LABELS) as AcademicStream[])
                  .filter((val) => {
                    if (grade === "11" || grade === "12") {
                      return val !== "general"; // Exclude general for 11/12
                    }
                    return true;
                  })
                  .map((val) => {
                    const isSelected = stream === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setStream(val)}
                        className={`min-h-[52px] w-full px-4 rounded-xl border font-sans text-base font-semibold text-right transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "bg-blue-50/70 border-blue-500 text-blue-700 shadow-sm"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>{STREAM_LABELS[val]}</span>
                        {isSelected && <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white"><span className="text-[10px]">✓</span></div>}
                      </button>
                    );
                  })}
              </div>

              <ZanaButton variant="primary" fullWidth onClick={handleNext} className="h-12 mt-4">
                <span>بەردەوام بە</span>
                <ChevronLeft className="w-5 h-5 mr-2" />
              </ZanaButton>
            </div>
          )}

          {/* Step 5: Subject Selection */}
          {step === 5 && (
            <div className="space-y-6 text-right">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-2">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="font-sans font-bold text-xl text-slate-800">لە کام بابەت دەست پێ بکەین؟</h3>
                <p className="font-sans text-sm text-slate-500 font-medium">
                  بابەتێک هەڵبژێرە. دواتر دەتوانیت هەرکاتێک بابەتەکە بگۆڕیت.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {(Object.keys(SUBJECT_LABELS) as SubjectKey[]).map((val) => {
                  const isSelected = subject === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSubject(val)}
                      className={`min-h-[52px] w-full px-4 rounded-xl border font-sans text-base font-semibold text-right transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-blue-50/70 border-blue-500 text-blue-700 shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{SUBJECT_LABELS[val]}</span>
                      {isSelected && <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white"><span className="text-[10px]">✓</span></div>}
                    </button>
                  );
                })}
              </div>

              <ZanaButton variant="primary" fullWidth onClick={handleNext} className="h-12 mt-4">
                <span>بەردەوام بە</span>
                <ChevronLeft className="w-5 h-5 mr-2" />
              </ZanaButton>
            </div>
          )}

          {/* Step 6: Level Selection */}
          {step === 6 && (
            <div className="space-y-6 text-right">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-2">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="font-sans font-bold text-xl text-slate-800">ئێستا خۆت چۆن دەبینیت؟</h3>
                <p className="font-sans text-sm text-slate-500 font-medium">
                  ئەمە تەنها بۆ ئەوەیە زانا ڕوونکردنەوەکان بەپێی ئاستی تۆ ڕێکبخات.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {(Object.keys(LEVEL_LABELS) as StudentLevel[]).map((val) => {
                  const isSelected = level === val;
                  let desc = "";
                  if (val === "beginner") desc = "پێویستم بە کات و ڕوونکردنەوەی بنەڕەتی زیاتر هەیە.";
                  if (val === "intermediate") desc = "تێگەیشتنم مامناوەندە، تەنها دەمەوێت لێهاتووتر بم.";
                  if (val === "advanced") desc = "ئاستم بەرزە و ئامادەم بۆ شیکاری پرسیاری وەزاری سەخت.";

                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setLevel(val)}
                      className={`p-4 w-full rounded-xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                        isSelected
                          ? "bg-blue-50/70 border-blue-500 text-blue-700 shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-sans font-extrabold text-base">{LEVEL_LABELS[val]}</span>
                        {isSelected && <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white"><span className="text-[10px]">✓</span></div>}
                      </div>
                      <span className="font-sans text-xs text-slate-500">{desc}</span>
                    </button>
                  );
                })}
              </div>

              <ZanaButton variant="primary" fullWidth onClick={handleNext} className="h-12 mt-4">
                <span>بەردەوام بە</span>
                <ChevronLeft className="w-5 h-5 mr-2" />
              </ZanaButton>
            </div>
          )}

          {/* Step 7: Confirmation Summary */}
          {step === 7 && (
            <div className="space-y-6 text-right">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-sans font-bold text-xl text-slate-800">ئامادەی دەستپێکردنیت؟</h3>
                <p className="font-sans text-sm text-slate-500 font-medium">
                  زانا ئێستا پڕۆفایلی فێربوونت ئامادە دەکات و ڕێگایەکی گونجاو بۆ پێشکەوتنت پێشنیار دەکات.
                </p>
              </div>

              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100 divide-y divide-slate-100 text-right space-y-3">
                <div className="flex justify-between items-center py-1">
                  <span className="font-sans text-xs text-slate-400">ناوی تەواو</span>
                  <span className="font-sans text-sm font-extrabold text-slate-800">{name}</span>
                </div>
                <div className="flex justify-between items-center pt-3 py-1">
                  <span className="font-sans text-xs text-slate-400">پۆلی خوێندن</span>
                  <span className="font-sans text-sm font-extrabold text-slate-800">{GRADE_LABELS[grade]}</span>
                </div>
                <div className="flex justify-between items-center pt-3 py-1">
                  <span className="font-sans text-xs text-slate-400">ڕێڕەوی خوێندن</span>
                  <span className="font-sans text-sm font-extrabold text-slate-800">{STREAM_LABELS[stream]}</span>
                </div>
                <div className="flex justify-between items-center pt-3 py-1">
                  <span className="font-sans text-xs text-slate-400">بابەتی خوێندنی دەستپێک</span>
                  <span className="font-sans text-sm font-extrabold text-slate-800">{SUBJECT_LABELS[subject]}</span>
                </div>
                <div className="flex justify-between items-center pt-3 py-1">
                  <span className="font-sans text-xs text-slate-400">ئاستی سەرەتایی</span>
                  <span className="font-sans text-sm font-extrabold text-slate-800">{LEVEL_LABELS[level]}</span>
                </div>
              </div>

              <div className="bg-blue-50 text-blue-800 p-3.5 rounded-xl font-sans text-xs text-right leading-relaxed border border-blue-100">
                ✨ <strong>ئامادەی؟</strong> زانا بەپێی ئەم زانیارییانە پڕۆگرامێکی تایبەتت بۆ ئامادە دەکات بۆ ئەوەی باشترین ئەنجام لەم وەرزەدا بەدەست بهێنیت.
              </div>

              <ZanaButton variant="success" fullWidth onClick={handleSubmit} className="h-12 mt-4">
                <span>ئامادەم، دەست پێ بکەین</span>
                <ChevronLeft className="w-5 h-5 mr-2" />
              </ZanaButton>
            </div>
          )}
        </ZanaCard>
      </div>
    </div>
  );
}
