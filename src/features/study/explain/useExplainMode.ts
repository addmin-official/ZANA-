import { useCallback, useMemo, useState } from "react";
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

interface ExplainModeResult {
  snapshot: ExplainSnapshot | null;
  error: string | null;
}

export function useExplainMode({
  studentProfile,
  curriculumSnapshot,
  sessionSnapshot,
}: UseExplainModeProps) {
  const [refreshVersion, setRefreshVersion] = useState(0);

  const result = useMemo<ExplainModeResult>(() => {
    // The version is intentionally consumed so an explicit refresh performs
    // one deterministic recomputation without introducing effect-driven state.
    void refreshVersion;

    try {
      return {
        snapshot: ExplainModeEngine.buildExplainSnapshot({
          studentProfile,
          curriculumSnapshot,
          sessionSnapshot,
        }),
        error: null,
      };
    } catch {
      return {
        snapshot: null,
        error: "هەڵەیەک لە کاتی ئامادەکردنی وانەکەدا ڕوویدا. تکایە دووبارە هەوڵ بدەرەوە.",
      };
    }
  }, [studentProfile, curriculumSnapshot, sessionSnapshot, refreshVersion]);

  const refresh = useCallback(() => {
    setRefreshVersion((current) => current + 1);
  }, []);

  return {
    snapshot: result.snapshot,
    isLoading: false,
    error: result.error,
    refresh,
  };
}
