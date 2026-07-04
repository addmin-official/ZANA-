import { useState, useCallback, useMemo } from "react";
import { StudentProfile } from "../student/studentTypes.ts";
import { AssessmentSession } from "../assessment/intelligence/assessmentTypes.ts";
import { AdaptiveSnapshot, AdaptiveDecision } from "./adaptiveTypes.ts";
import { AdaptiveLearningEngine } from "./AdaptiveLearningEngine.ts";
import { AdaptiveEventBridge } from "./AdaptiveEventBridge.ts";
import { StudentIntelligenceEngine } from "../../intelligence/StudentIntelligenceEngine.ts";
import { CurriculumIntelligenceEngine } from "../../curriculum/CurriculumIntelligenceEngine.ts";
import { learningSessionEngineInstance } from "../../session/LearningSessionEngine.ts";
import { safeGet, safeSet } from "../../services/storage.ts";
import { useStudentProfile } from "../student/useStudentProfile.ts";

/**
 * Hook to manage and apply Adaptive Learning Loop updates.
 */
export function useAdaptiveLearning(
  passedProfile?: StudentProfile,
  passedOnProfileUpdate?: (profile: Partial<StudentProfile>) => void
) {
  // Use passed hooks/props or fallback to the student profile hook
  const { profile: hookedProfile, updateProfile: hookedUpdateProfile } = useStudentProfile();
  
  const profile = passedProfile || hookedProfile;
  const onProfileUpdate = passedOnProfileUpdate || hookedUpdateProfile;

  const studentId = profile?.id || "guest-student";
  const storageKey = `zana:adaptive-snapshot:${studentId}`;

  const [snapshot, setSnapshot] = useState<AdaptiveSnapshot | null>(() => {
    return safeGet<AdaptiveSnapshot | null>(storageKey, null);
  });
  
  const [error, setError] = useState<Error | null>(null);

  const lastDecision = useMemo<AdaptiveDecision | null>(() => {
    return snapshot ? snapshot.decision : null;
  }, [snapshot]);

  const applyAssessmentResult = useCallback(
    (assessmentSession: AssessmentSession) => {
      if (!profile) {
        const err = new Error("No active student profile loaded.");
        setError(err);
        return null;
      }

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

        // 4. Generate Adaptive Snapshot
        const adaptiveSnapshot = AdaptiveLearningEngine.buildAdaptiveSnapshot({
          studentProfile: profile,
          assessmentSession,
          sipSnapshot,
          cipSnapshot,
          lseSnapshot,
        });

        // 5. Gather Kurdish Concept Labels for event logging & timeline
        const conceptLabels: Record<string, string> = {};
        cipSnapshot.resolution.availableNodes.forEach(node => {
          conceptLabels[node.id] = node.title;
        });

        // 6. Propagate results through AdaptiveEventBridge (updates LSE and SIP)
        AdaptiveEventBridge.propagateResults(profile, adaptiveSnapshot, conceptLabels);

        // 7. Sync profile level if assessment was diagnostic and score is extremely low/high
        if (assessmentSession.mode === "diagnostic" && onProfileUpdate) {
          if (assessmentSession.scorePercentage >= 80 && profile.level !== "advanced") {
            onProfileUpdate({ level: "advanced" });
          } else if (assessmentSession.scorePercentage < 50 && profile.level !== "beginner") {
            onProfileUpdate({ level: "beginner" });
          } else if (assessmentSession.scorePercentage >= 50 && assessmentSession.scorePercentage < 80 && profile.level !== "intermediate") {
            onProfileUpdate({ level: "intermediate" });
          }
        }

        // 8. Persist results
        setSnapshot(adaptiveSnapshot);
        safeSet(storageKey, adaptiveSnapshot);

        return adaptiveSnapshot;
      } catch (err: unknown) {
        console.error("Failed to apply assessment adaptive feedback loop:", err);
        const errorObj = err instanceof Error ? err : new Error("Failed to process adaptive learning loop");
        setError(errorObj);
        return null;
      }
    },
    [profile, onProfileUpdate, storageKey]
  );

  return {
    snapshot,
    applyAssessmentResult,
    lastDecision,
    error,
  };
}
