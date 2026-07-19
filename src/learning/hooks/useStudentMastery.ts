import { useState, useEffect, useCallback } from "react";
import {
  StudentMasteryProfile,
  ConceptMasteryState,
  AdaptiveRecommendation,
  DifficultyLevel
} from "../domain/MasteryTypes.ts";

export function useStudentMastery(studentId: string) {
  const [profile, setProfile] = useState<StudentMasteryProfile | null>(null);
  const [recommendations, setRecommendations] = useState<AdaptiveRecommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Load profile and active recommendations from secure server endpoints
  const loadProfile = useCallback(async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${studentId}`
      };

      // 1. Fetch Student Profile
      const profileRes = await fetch(`/api/learning/mastery?studentId=${encodeURIComponent(studentId)}`, {
        headers
      });
      if (profileRes.ok) {
        const p = await profileRes.json();
        setProfile(p);
      } else if (profileRes.status === 401 || profileRes.status === 403) {
        console.warn("Unauthorized profile access attempt.");
      }

      // 2. Fetch Active Recommendations
      const recsRes = await fetch(`/api/learning/recommendations?studentId=${encodeURIComponent(studentId)}&status=ACTIVE`, {
        headers
      });
      if (recsRes.ok) {
        const recs = await recsRes.json();
        setRecommendations(recs);
      }
    } catch (e) {
      console.error("Error loading student mastery profile from server:", e);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId) {
      loadProfile();
    }
  }, [studentId, loadProfile]);

  // Record an exercise attempt securely on the server
  const recordAttempt = useCallback(async (attemptInput: {
    conceptId: string;
    conceptTitleKu: string;
    isCorrect: boolean;
    responseTimeMs: number;
    difficulty: DifficultyLevel;
    questionText: string;
    studentResponse: string;
    misconceptionDetected?: string;
    hintUsed?: boolean;
    unreliableTiming?: boolean;
  }) => {
    if (!studentId) return null;

    try {
      const response = await fetch("/api/learning/attempts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${studentId}`
        },
        body: JSON.stringify({
          conceptId: attemptInput.conceptId,
          isCorrect: attemptInput.isCorrect,
          responseTimeMs: attemptInput.responseTimeMs,
          difficulty: attemptInput.difficulty,
          questionText: attemptInput.questionText,
          studentResponse: attemptInput.studentResponse,
          misconceptionDetected: attemptInput.misconceptionDetected,
          hintUsed: attemptInput.hintUsed,
          unreliableTiming: attemptInput.unreliableTiming
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const result = await response.json();

      // Trigger hot reload of profile UI state
      await loadProfile();

      return {
        masteryState: result.masteryState as ConceptMasteryState,
        misconception: result.misconceptionDetected,
        recommendation: result.recommendation as AdaptiveRecommendation
      };
    } catch (e) {
      console.error("Error recording attempt on server:", e);
      return null;
    }
  }, [studentId, loadProfile]);

  // Start a learning session securely on the server
  const startSession = useCallback(async () => {
    if (!studentId) return null;

    try {
      const response = await fetch("/api/learning/sessions/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${studentId}`
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        const session = await response.json();
        setActiveSessionId(session.id);
        return session.id as string;
      }
    } catch (e) {
      console.error("Error starting session on server:", e);
    }
    return null;
  }, [studentId]);

  // End a learning session securely on the server
  const endSession = useCallback(async (focusScore: number = 1.0) => {
    if (!activeSessionId || !studentId) return;

    try {
      const response = await fetch(`/api/learning/sessions/${encodeURIComponent(activeSessionId)}/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${studentId}`
        },
        body: JSON.stringify({ focusScore })
      });

      if (response.ok) {
        setActiveSessionId(null);
      }
    } catch (e) {
      console.error("Error ending session on server:", e);
    }
  }, [activeSessionId, studentId]);

  return {
    profile,
    recommendations,
    loading,
    recordAttempt,
    startSession,
    endSession,
    activeSessionId,
    refresh: loadProfile
  };
}
