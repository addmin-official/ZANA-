import React, { useState } from "react";
import { LearningGoal, StudentLearningPreferences } from "../../../planning/domain/LearningPlanTypes.ts";
import { Target, Sliders, Save, Check } from "lucide-react";

interface GoalManagementViewProps {
  goal: LearningGoal | null;
  preferences: StudentLearningPreferences | null;
  onSavePreferences: (prefs: Partial<StudentLearningPreferences>) => void;
  onSaveGoal: (goal: Partial<LearningGoal>) => void;
  isSaving?: boolean;
}

export const GoalManagementView: React.FC<GoalManagementViewProps> = ({
  goal,
  preferences,
  onSavePreferences,
  onSaveGoal: _onSaveGoal,
  isSaving
}) => {
  const [weeklyMins, setWeeklyMins] = useState<number>(preferences?.weeklyGoalMinutes || 180);
  const [maxTasks, setMaxTasks] = useState<number>(preferences?.maxTasksPerDay || 5);
  const [sessionLen, setSessionLen] = useState<number>(preferences?.preferredSessionLengthMinutes || 25);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePreferences({
      weeklyGoalMinutes: Number(weeklyMins),
      maxTasksPerDay: Number(maxTasks),
      preferredSessionLengthMinutes: Number(sessionLen)
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div id="goal-management-view" className="space-y-8" dir="rtl">
      {/* Active Goal Overview */}
      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">ئامانجی چالاکی خوێندن</h2>
            <p className="text-xs text-neutral-400 mt-0.5">ئامانجی ئێستات بۆ ئەم هەفتەیە</p>
          </div>
        </div>

        <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-xl space-y-2">
          <h3 className="text-lg font-bold text-white">{goal?.titleKu || "بەرەوپێشبردنی ئاستی وانەی بیرکاری"}</h3>
          <p className="text-xs text-neutral-400">
            ئامانجی هەفتانە: {goal?.weeklyTargetMinutes || 180} خولەک | ڕەوش: {goal?.status || "ACTIVE"}
          </p>
        </div>
      </div>

      {/* Preferences Settings Form */}
      <form onSubmit={handleSubmit} className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-lg space-y-6">
        <div className="flex items-center gap-3">
          <Sliders className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-bold text-white">ڕێکخستنەکانی خواستی خوێندن</h3>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-300">
              ئامانجی خوێندنی هەفتانە (خولەک)
            </label>
            <input
              type="number"
              min={30}
              max={1400}
              value={weeklyMins}
              onChange={(e) => setWeeklyMins(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-300">
              زۆرترین ئەرک بۆ هەر ڕۆژێک
            </label>
            <input
              type="number"
              min={1}
              max={15}
              value={maxTasks}
              onChange={(e) => setMaxTasks(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-300">
              ماوەی خولەیی هەر وانەیەک (خولەک)
            </label>
            <input
              type="number"
              min={10}
              max={120}
              value={sessionLen}
              onChange={(e) => setSessionLen(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
          {savedSuccess && (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <Check className="w-4 h-4" />
              <span>پاشەکەوتکرا</span>
            </span>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>پاشەکەوتکردن</span>
          </button>
        </div>
      </form>
    </div>
  );
};
