import { GraduationCap, Award } from "lucide-react";
import { StudentProfile } from "../services/storage.ts";
import { LEVEL_LABELS } from "../features/student/studentDefaults.ts";
import { StudentLevel } from "../features/student/studentTypes.ts";

interface ZanaHeaderProps {
  profile: StudentProfile;
}

export function ZanaHeader({ profile }: ZanaHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-3 shadow-xs">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-lg text-slate-900 leading-tight">
              زانا
            </h1>
            <p className="font-sans text-[11px] text-blue-600 font-medium">
              هاوڕێی زیرەکی فێربوونی تۆ
            </p>
          </div>
        </div>

        {/* Student Mini Badge */}
        {profile.onboarded && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">
            <Award className="w-4 h-4 text-amber-500" />
            <div className="text-right">
              <p className="font-sans text-xs font-bold text-slate-800 leading-none">
                {profile.name}
              </p>
              <p className="font-sans text-[10px] text-slate-500 mt-0.5">
                پۆلی {profile.grade} • {LEVEL_LABELS[profile.level as StudentLevel] || profile.level}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
