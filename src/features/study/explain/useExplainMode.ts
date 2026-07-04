import { useState, useEffect, useCallback } from "react";
import { StudentProfile } from "../../student/studentTypes.ts";
import { CurriculumIntelligenceSnapshot } from "../../../curriculum/types.ts";
import { SessionSnapshot } from "../../../session/types.ts";
import { ExplainSnapshot } from "./explainTypes.ts";
import { ExplainModeEngine } from "./ExplainModeEngine.ts";

export interface UseExplainModeProps {
  studentProfile: StudentProfile;
  curriculumSnapshot: CurriculumIntelligenceSnapshot;
  sessionSnapshot: SessionSnapshot;
}

export function useExplainMode({
  studentProfile,
  curriculumSnapshot,
  sessionSnapshot
}: UseExplainModeProps) {
  const [snapshot, setSnapshot] = useState<ExplainSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const calculateSnapshot = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const snap = ExplainModeEngine.buildExplainSnapshot({
        studentProfile,
        curriculumSnapshot,
        sessionSnapshot
      });
      setSnapshot(snap);
    } catch (e: any) {
      console.error("Error building ExplainSnapshot:", e);
      setError(e?.message || "هەڵەیەک ڕوویدا لە کاتی داڕشتنی وانەکەدا.");
    } finally {
      setIsLoading(false);
    }
  }, [studentProfile, curriculumSnapshot, sessionSnapshot]);

  // Recalculate when dependency states or current active node changes
  useEffect(() => {
    calculateSnapshot();
  }, [calculateSnapshot]);

  const refresh = useCallback(() => {
    calculateSnapshot();
  }, [calculateSnapshot]);

  return {
    snapshot,
    isLoading,
    error,
    refresh
  };
}
