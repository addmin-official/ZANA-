import { useState, useEffect, useCallback } from "react";
import { useStudentProfile } from "../student/useStudentProfile.ts";
import { StudentIntelligenceEngine } from "../../intelligence/StudentIntelligenceEngine.ts";
import { CurriculumIntelligenceEngine } from "../../curriculum/CurriculumIntelligenceEngine.ts";
import { learningSessionEngineInstance } from "../../session/LearningSessionEngine.ts";
import { DailySparkEngine } from "./DailySparkEngine.ts";
import { DailySparkSnapshot } from "./dailySparkTypes.ts";

export function useDailySpark() {
  const { profile } = useStudentProfile();
  const [snapshot, setSnapshot] = useState<DailySparkSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshDailySpark = useCallback(() => {
    if (!profile) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Get SIP Snapshot
      const sipEngine = StudentIntelligenceEngine.getInstance(profile);
      const sipSnapshot = sipEngine.getSnapshot();

      // 2. Get CIP Snapshot
      const cipEngine = new CurriculumIntelligenceEngine();
      const cipSnapshot = cipEngine.buildCurriculumIntelligenceSnapshot({
        grade: profile.grade,
        stream: profile.stream,
        subject: profile.activeSubject,
        completedNodeIds: Array.from(sipSnapshot.graph.completedNodeIds || [])
      });

      // 3. Get LSE Snapshot (using the Master Orchestrator)
      const lseSnapshot = learningSessionEngineInstance.initializeOrResume(
        profile,
        sipSnapshot,
        cipSnapshot
      );

      // 4. Generate Daily Spark Snapshot
      const dailySparkSnapshot = DailySparkEngine.buildDailySparkSnapshot({
        studentProfile: profile,
        sipSnapshot,
        cipSnapshot,
        lseSnapshot
      });

      setSnapshot(dailySparkSnapshot);
    } catch (err) {
      console.error("Failed to generate Daily Spark snapshot:", err);
      setError(err instanceof Error ? err : new Error("Failed to load Daily Spark"));
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      refreshDailySpark();
    }
  }, [profile, refreshDailySpark]);

  return {
    snapshot,
    isLoading,
    error,
    refreshDailySpark
  };
}
