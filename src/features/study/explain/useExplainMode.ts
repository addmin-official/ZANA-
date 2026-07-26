import { useState, useCallback, useMemo } from "react";
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
  const [forceKey, setForceKey] = useState(0);

  const { snapshot, error } = useMemo(() => {
    try {
      const snap = ExplainModeEngine.buildExplainSnapshot({
        studentProfile,
        curriculumSnapshot,
        sessionSnapshot
      });
      return { snapshot: snap, error: null };
    } catch (e: unknown) {
      console.error("Error building ExplainSnapshot:", e);
      const errMessage = e instanceof Error ? e.message : "هەڵەیەک ڕوویدا لە کاتی داڕشتنی وانەکەدا.";
      return { snapshot: null, error: errMessage };
    }
  }, [studentProfile, curriculumSnapshot, sessionSnapshot, forceKey]);

  const refresh = useCallback(() => {
    setForceKey(k => k + 1);
  }, []);

  return {
    snapshot: snapshot as ExplainSnapshot | null,
    isLoading: false,
    error,
    refresh
  };
}
