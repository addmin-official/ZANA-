import React from "react";
import { DailyStudyPlan, StudyTask, StudyTaskStatus, NextBestAction } from "../../../planning/domain/LearningPlanTypes.ts";
import { NextBestActionCard } from "./NextBestActionCard.tsx";
import { CheckCircle2, Clock, Play, Calendar, BookOpen } from "lucide-react";

interface TodayPlanViewProps {
  todayPlan: DailyStudyPlan | null;
  nextBestAction: NextBestAction | null;
  onStartTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onSkipTask: (taskId: string) => void;
  onExecuteNextAction: (action: NextBestAction) => void;
  isLoading?: boolean;
}

export const TodayPlanView: React.FC<TodayPlanViewProps> = ({
  todayPlan,
  nextBestAction,
  onStartTask,
  onCompleteTask,
  onSkipTask,
  onExecuteNextAction,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div id="today-plan-loading" className="space-y-6 animate-pulse">
        <div className="h-28 bg-neutral-900 border border-neutral-800 rounded-2xl"></div>
        <div className="h-40 bg-neutral-900 border border-neutral-800 rounded-2xl"></div>
      </div>
    );
  }

  const tasks = todayPlan?.tasks || [];
  const completedMins = todayPlan?.completedMinutes || 0;
  const targetMins = todayPlan?.targetMinutes || 45;
  const progressPercent = Math.min(Math.round((completedMins / Math.max(targetMins, 1)) * 100), 100);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "HIGH":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "MEDIUM":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      default:
        return "bg-neutral-800 text-neutral-400 border-neutral-700";
    }
  };

  return (
    <div id="today-plan-view" className="space-y-8" dir="rtl">
      {/* Header Progress Card */}
      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-emerald-400" />
              <span>پلانی خوێندنی ئەمڕۆ</span>
            </h2>
            <p className="text-sm text-neutral-400 mt-1">
              ئامانجی ئەمڕۆ: {targetMins} خولەک | ئەنجامدراو: {completedMins} خولەک
            </p>
          </div>

          <div className="text-left dir-ltr">
            <span className="text-2xl font-extrabold text-emerald-400">{progressPercent}٪</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-neutral-800 h-3 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Next Best Action Banner */}
      {nextBestAction && (
        <NextBestActionCard
          action={nextBestAction}
          onExecuteAction={onExecuteNextAction}
        />
      )}

      {/* Task Queue List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          <span>ئەرکەکانی ئەمڕۆ ({tasks.length})</span>
        </h3>

        {tasks.length === 0 ? (
          <div className="p-8 text-center bg-neutral-900/50 border border-neutral-800 rounded-2xl text-neutral-400">
            هیچ ئەرکێک بۆ ئەمڕۆ دیاری نەکراوە یان ڕۆژی پشووە.
          </div>
        ) : (
          <div className="grid gap-4">
            {tasks.map((task: StudyTask) => (
              <div
                key={task.id}
                id={`task-card-${task.id}`}
                className={`p-5 rounded-2xl border transition-all ${
                  task.status === StudyTaskStatus.COMPLETED
                    ? "bg-neutral-900/40 border-neutral-800 opacity-70"
                    : task.status === StudyTaskStatus.IN_PROGRESS
                    ? "bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/30"
                    : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${getPriorityBadge(task.priority)}`}>
                        {task.priority === "URGENT" ? "پەلە" : task.priority === "HIGH" ? "گرنگ" : "ئاسایی"}
                      </span>
                      <span className="text-xs text-neutral-400 bg-neutral-800 px-2.5 py-0.5 rounded-full">
                        {task.type}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-white mt-1">
                      {task.titleKu}
                    </h4>

                    <p className="text-xs text-neutral-300">
                      {task.reason?.descriptionKu || task.descriptionKu}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-neutral-400 bg-neutral-800/80 px-3 py-1.5 rounded-xl">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>{task.estimatedDurationMinutes} خولەک</span>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800/60">
                  {task.status === StudyTaskStatus.COMPLETED ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تەواوکراوە</span>
                    </div>
                  ) : task.status === StudyTaskStatus.SKIPPED ? (
                    <span className="text-xs text-neutral-500">پەڕێنراوە</span>
                  ) : (
                    <>
                      <button
                        onClick={() => onSkipTask(task.id)}
                        className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                      >
                        پەڕاندن
                      </button>

                      {task.status === StudyTaskStatus.IN_PROGRESS ? (
                        <button
                          onClick={() => onCompleteTask(task.id)}
                          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تەواوکردن</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onStartTask(task.id)}
                          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>دەستپێکردن</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
