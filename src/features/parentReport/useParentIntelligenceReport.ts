import { useState, useCallback, useEffect } from "react";
import { StudentProfile } from "../student/studentTypes.ts";
import { ParentReportSnapshot } from "./parentReportTypes.ts";
import { ParentReportIntelligenceEngine } from "./ParentReportIntelligenceEngine.ts";
import { ParentReportEventBridge } from "./ParentReportEventBridge.ts";
import { StudentIntelligenceEngine } from "../../intelligence/StudentIntelligenceEngine.ts";
import { CurriculumIntelligenceEngine } from "../../curriculum/CurriculumIntelligenceEngine.ts";
import { learningSessionEngineInstance } from "../../session/LearningSessionEngine.ts";
import { safeGet, safeSet } from "../../services/storage.ts";
import { useStudentProfile } from "../student/useStudentProfile.ts";
import { AdaptiveSnapshot } from "../adaptive/adaptiveTypes.ts";

export function useParentIntelligenceReport(passedProfile?: StudentProfile) {
  const { profile: hookedProfile } = useStudentProfile();
  const profile = passedProfile || hookedProfile;

  const studentId = profile?.id || "guest-student";
  const storageKey = `zana:parent-report-snapshot:${studentId}`;

  const [snapshot, setSnapshot] = useState<ParentReportSnapshot | null>(() => {
    return safeGet<ParentReportSnapshot | null>(storageKey, null);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = useCallback((forceRefresh = false) => {
    if (!profile) {
      setError("قوتابی چالاک نەدۆزرایەوە.");
      return;
    }

    if (snapshot && !forceRefresh) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Resolve SIP Snapshot
      const sipEngine = StudentIntelligenceEngine.getInstance(profile);
      const sipSnapshot = sipEngine.getSnapshot();

      // 2. Resolve CIP Snapshot
      const cipEngine = new CurriculumIntelligenceEngine();
      const cipSnapshot = cipEngine.buildCurriculumIntelligenceSnapshot({
        grade: profile.grade,
        stream: profile.stream,
        subject: profile.activeSubject,
        completedNodeIds: Array.from(sipSnapshot.graph.completedNodeIds || []),
      });

      // 3. Resolve LSE Snapshot
      const lseSnapshot = learningSessionEngineInstance.initializeOrResume(
        profile,
        sipSnapshot,
        cipSnapshot
      );

      // 4. Resolve Adaptive Snapshot
      const adaptiveStorageKey = `zana:adaptive-snapshot:${profile.id}`;
      const adaptiveSnapshot = safeGet<AdaptiveSnapshot | null>(adaptiveStorageKey, null);

      // 5. Generate Snapshot
      const reportSnapshot = ParentReportIntelligenceEngine.generateSnapshot({
        studentProfile: profile,
        sipSnapshot,
        cipSnapshot,
        lseSnapshot,
        adaptiveSnapshot
      });

      // 6. Log Domain Event
      ParentReportEventBridge.emitReportGenerated(profile, reportSnapshot);

      // 7. Persist
      setSnapshot(reportSnapshot);
      safeSet(storageKey, reportSnapshot);

    } catch (err: any) {
      console.error("Failed to generate parent intelligence report:", err);
      setError("نەتوانرا لە ئێستادا ڕاپۆرتی زیرەکی بۆ دایک و باوک ئامادە بکرێت.");
    } finally {
      setLoading(false);
    }
  }, [profile, snapshot, storageKey]);

  useEffect(() => {
    if (profile?.onboardingCompleted) {
      generateReport();
    }
  }, [profile?.onboardingCompleted, profile?.activeSubject, profile?.level]);

  const printReport = useCallback(() => {
    window.print();
  }, []);

  return {
    snapshot,
    loading,
    error,
    generateReport: () => generateReport(true),
    printReport,
  };
}
