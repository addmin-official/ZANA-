import React, { useState, useEffect } from "react";
import {
  DailyStudyPlan,
  WeeklyStudyPlan,
  LearningGoal,
  StudentLearningPreferences,
  NextBestAction,
  PlanProgress,
  StudyTask
} from "../../../planning/domain/LearningPlanTypes.ts";
import { TodayPlanView } from "./TodayPlanView.tsx";
import { WeeklyPlanView } from "./WeeklyPlanView.tsx";
import { GoalManagementView } from "./GoalManagementView.tsx";
import { Calendar, Compass, Target } from "lucide-react";
import { AuthService } from "../../../services/authService.ts";

export interface StudentStudyPathDashboardProps {
  studentId: string;
  authToken?: string;
  onNavigateToTask?: (task: StudyTask) => void;
}

export const StudentStudyPathDashboard: React.FC<StudentStudyPathDashboardProps> = ({
  studentId,
  authToken,
  onNavigateToTask: _onNavigateToTask
}) => {
  const [activeTab, setActiveTab] = useState<"today" | "week" | "goals">("today");

  const [todayPlan, setTodayPlan] = useState<DailyStudyPlan | null>(null);
  const [weekPlan, setWeekPlan] = useState<WeeklyStudyPlan | null>(null);
  const [activeGoal, setActiveGoal] = useState<LearningGoal | null>(null);
  const [preferences, setPreferences] = useState<StudentLearningPreferences | null>(null);
  const [nextBestAction, setNextBestAction] = useState<NextBestAction | null>(null);
  const [_progress, setProgress] = useState<PlanProgress | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRebalancing, setIsRebalancing] = useState<boolean>(false);

  const fetchHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      const token = authToken || (await AuthService.getClientToken(studentId));
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn("Could not retrieve client auth token for planning dashboard:", e);
    }
    return headers;
  }, [authToken, studentId]);

  const loadData = useCallback(async () => {
    try {
      const headers = await fetchHeaders();
      const [todayRes, weekRes, goalRes, prefsRes, nextActionRes, progressRes] = await Promise.all([
        fetch("/api/planning/today", { headers }).then(r => r.ok ? r.json() : null),
        fetch("/api/planning/week", { headers }).then(r => r.ok ? r.json() : null),
        fetch("/api/planning/goals", { headers }).then(r => r.ok ? r.json() : null),
        fetch("/api/planning/preferences", { headers }).then(r => r.ok ? r.json() : null),
        fetch("/api/planning/next-action", { headers }).then(r => r.ok ? r.json() : null),
        fetch("/api/planning/progress", { headers }).then(r => r.ok ? r.json() : null)
      ]);

      if (todayRes) setTodayPlan(todayRes);
      if (weekRes) setWeekPlan(weekRes);
      if (goalRes) setActiveGoal(goalRes.activeGoal || goalRes.goals?.[0] || null);
      if (prefsRes) setPreferences(prefsRes);
      if (nextActionRes) setNextBestAction(nextActionRes);
      if (progressRes) setProgress(progressRes);
    } catch (err) {
      console.error("[StudentStudyPathDashboard] Error loading planning data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchHeaders]);

  useEffect(() => {
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (active) {
        await loadData();
      }
    })();
    return () => {
      active = false;
    };
  }, [loadData]);

  const handleStartTask = async (taskId: string) => {
    try {
      const headers = await fetchHeaders();
      const res = await fetch(`/api/planning/tasks/${taskId}/start`, {
        method: "POST",
        headers
      });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error("Error starting task:", e);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const headers = await fetchHeaders();
      const res = await fetch(`/api/planning/tasks/${taskId}/complete`, {
        method: "POST",
        headers,
        body: JSON.stringify({ actualDurationMinutes: 20 })
      });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error("Error completing task:", e);
    }
  };

  const handleSkipTask = async (taskId: string) => {
    try {
      const headers = await fetchHeaders();
      const res = await fetch(`/api/planning/tasks/${taskId}/skip`, {
        method: "POST",
        headers
      });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error("Error skipping task:", e);
    }
  };

  const handleRebalancePlan = async () => {
    setIsRebalancing(true);
    try {
      const headers = await fetchHeaders();
      const res = await fetch("/api/planning/rebalance", {
        method: "POST",
        headers
      });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error("Error rebalancing plan:", e);
    } finally {
      setIsRebalancing(false);
    }
  };

  const handleSavePreferences = async (newPrefs: Partial<StudentLearningPreferences>) => {
    try {
      const headers = await fetchHeaders();
      const res = await fetch("/api/planning/preferences", {
        method: "POST",
        headers,
        body: JSON.stringify(newPrefs)
      });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error("Error saving preferences:", e);
    }
  };

  return (
    <div id="student-study-path-dashboard" className="max-w-6xl mx-auto p-4 md:p-6 space-y-6" dir="rtl">
      {/* Title & Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Compass className="w-7 h-7 text-emerald-400" />
            <span>نەخشەڕێگای خوێندن و پلاندانەر</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            پلانی تایبەتی خوێندن و باشترین هەنگاوەکانی داهاتوو
          </p>
        </div>

        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab("today")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "today"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/50"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>ئەمڕۆ</span>
          </button>

          <button
            onClick={() => setActiveTab("week")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "week"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/50"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>هەفتانە</span>
          </button>

          <button
            onClick={() => setActiveTab("goals")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "goals"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/50"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
            }`}
          >
            <Target className="w-4 h-4" />
            <span>ئامانجەکان</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === "today" && (
        <TodayPlanView
          todayPlan={todayPlan}
          nextBestAction={nextBestAction}
          onStartTask={handleStartTask}
          onCompleteTask={handleCompleteTask}
          onSkipTask={handleSkipTask}
          onExecuteNextAction={(action) => {
            if (action.taskId) {
              void handleStartTask(action.taskId);
            }
          }}
          isLoading={isLoading}
        />
      )}

      {activeTab === "week" && (
        <WeeklyPlanView
          weekPlan={weekPlan}
          onRebalancePlan={handleRebalancePlan}
          isRebalancing={isRebalancing}
        />
      )}

      {activeTab === "goals" && (
        <GoalManagementView
          goal={activeGoal}
          preferences={preferences}
          onSavePreferences={handleSavePreferences}
          onSaveGoal={() => {}}
        />
      )}
    </div>
  );
};
