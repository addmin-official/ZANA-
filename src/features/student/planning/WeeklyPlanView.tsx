import React from "react";
import { WeeklyStudyPlan, DailyStudyPlan } from "../../../planning/domain/LearningPlanTypes.ts";
import { Calendar, Clock, RefreshCw, CheckCircle, Moon } from "lucide-react";

interface WeeklyPlanViewProps {
  weekPlan: WeeklyStudyPlan | null;
  onRebalancePlan: () => void;
  isRebalancing?: boolean;
}

export const WeeklyPlanView: React.FC<WeeklyPlanViewProps> = ({
  weekPlan,
  onRebalancePlan,
  isRebalancing
}) => {
  if (!weekPlan) {
    return (
      <div id="weekly-plan-empty" className="p-8 text-center bg-neutral-900 border border-neutral-800 rounded-2xl text-neutral-400">
        هیچ پلانێکی هەفتانە بەردەست نییە.
      </div>
    );
  }

  const daysOfWeekKu = ["یەکشەممە", "دووشەممە", "سێشەممە", "چوارشەممە", "پێنجشەممە", "هەینی", "شەممە"];

  return (
    <div id="weekly-plan-view" className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-lg">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <span>پلانی هەفتانە ({weekPlan.startDate} تا {weekPlan.endDate})</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            کاتی پلاندانراو: {weekPlan.weeklyPlannedMinutes} خولەک | ئامانج: {weekPlan.weeklyTargetMinutes} خولەک
          </p>
        </div>

        <button
          onClick={onRebalancePlan}
          disabled={isRebalancing}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 text-xs font-semibold rounded-xl border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRebalancing ? "animate-spin" : ""}`} />
          <span>ڕێکخستنەوەی هاوسەنگی</span>
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {weekPlan.dailyPlans.map((day: DailyStudyPlan, idx: number) => {
          const dayNameKu = daysOfWeekKu[day.dayOfWeek] || `ڕۆژی ${idx + 1}`;
          return (
            <div
              key={day.date}
              id={`weekly-day-${day.date}`}
              className={`p-4 rounded-2xl border flex flex-col justify-between ${
                day.isRestDay
                  ? "bg-neutral-950/40 border-neutral-800/60 opacity-60"
                  : "bg-neutral-900 border-neutral-800 hover:border-emerald-500/30 transition-all"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">{dayNameKu}</span>
                  {day.isRestDay ? (
                    <Moon className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <span className="text-xs text-emerald-400 font-medium">{day.plannedMinutes} خولەک</span>
                  )}
                </div>

                <p className="text-xs text-neutral-400 mb-3">{day.date}</p>

                {day.isRestDay ? (
                  <p className="text-xs text-neutral-500 italic mt-2">ڕۆژی پشوو</p>
                ) : (
                  <div className="space-y-1.5 mt-2">
                    <p className="text-xs font-semibold text-neutral-300">
                      {day.tasks.length} ئەرک
                    </p>
                    <div className="text-[11px] text-neutral-400 space-y-1 max-h-32 overflow-y-auto">
                      {day.tasks.map(t => (
                        <div key={t.id} className="truncate bg-neutral-800/60 px-2 py-1 rounded">
                          • {t.titleKu}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-2 border-t border-neutral-800 text-[10px] text-neutral-500 text-left dir-ltr">
                {day.completedMinutes > 0 ? `${day.completedMinutes}m completed` : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
