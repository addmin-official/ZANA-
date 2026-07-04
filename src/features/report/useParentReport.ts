import { useState, useEffect } from "react";
import { ParentReport } from "./reportTypes.ts";
import { ZanaStorage, StudentProfile } from "../../services/storage.ts";
import { ZanaApiClient } from "../../services/apiClient.ts";

export function useParentReport(profile: StudentProfile) {
  const [report, setReport] = useState<ParentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async (forceRefresh = false) => {
    if (!profile.onboardingCompleted) return;

    setError(null);
    const progress = ZanaStorage.getProgress();

    // If recommendation is already saved in progress state and we are not forcing refresh, load cached version
    if (progress.recommendation && !forceRefresh) {
      setReport({
        studentName: profile.name,
        grade: profile.grade,
        subject: profile.activeSubject,
        level: profile.level,
        totalSessions: progress.totalSessions,
        weeklyQuestionCount: progress.weeklyQuestionCount,
        currentProgressPercent: progress.currentProgressPercent,
        weakAreas: progress.weakAreas.length > 0 ? progress.weakAreas : ["یاساکانی دۆزینەوەی گرتە (نموونە)"],
        recommendation: progress.recommendation
      });
      return;
    }

    setLoading(true);
    try {
      const stats = {
        totalSessions: progress.totalSessions,
        weeklyQuestionCount: progress.weeklyQuestionCount
      };

      const res = await ZanaApiClient.getParentReport(profile, stats);
      
      // Determine some smart mock weak areas based on the subject
      let weakAreas = ["هاوکێشەی هێڵی"];
      if (profile.activeSubject === "math") weakAreas = ["ڕێساکانی گرتە (Derivative Rules)", "ڕووبەری سێگۆشە"];
      else if (profile.activeSubject === "physics") weakAreas = ["یاسای ئۆم", "جووڵە بە تاودانی نەگۆڕ"];
      else if (profile.activeSubject === "chemistry") weakAreas = ["هاوسەنگکردنی کارلێکەکان", "پێوەری pH"];
      else if (profile.activeSubject === "english") weakAreas = ["Modal verbs", "Passive Voice"];

      const updatedProgress = {
        ...progress,
        weakAreas,
        recommendation: res.recommendation
      };

      ZanaStorage.saveProgress(updatedProgress);

      setReport({
        studentName: profile.name,
        grade: profile.grade,
        subject: profile.activeSubject,
        level: profile.level,
        totalSessions: progress.totalSessions,
        weeklyQuestionCount: progress.weeklyQuestionCount,
        currentProgressPercent: progress.currentProgressPercent,
        weakAreas,
        recommendation: res.recommendation
      });
    } catch (err: any) {
      setError(err.message || "نەتوانرا ڕاپۆرتەکە دروست بکرێت لە ئێستادا.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile.onboardingCompleted) {
      loadReport();
    }
  }, [profile.onboardingCompleted, profile.activeSubject, profile.level]);

  return {
    report,
    loading,
    error,
    refreshReport: () => loadReport(true)
  };
}
