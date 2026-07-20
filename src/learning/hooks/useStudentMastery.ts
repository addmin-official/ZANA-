import { useState, useEffect, useCallback } from "react";
import {
  StudentMasteryProfile,
  ConceptMasteryState,
  AdaptiveRecommendation,
  DifficultyLevel
} from "../domain/MasteryTypes.ts";
import { AuthService } from "../../services/authService.ts";

export function useStudentMastery(studentId: string, onAuthFailure?: () => void) {
  const [profile, setProfile] = useState<StudentMasteryProfile | null>(null);
  const [recommendations, setRecommendations] = useState<AdaptiveRecommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Isomorphic, robust fetch client with automatic token refresh, 401-retry, and persistent failure handler
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    if (!studentId || studentId === "default-guest") {
      throw new Error("No authenticated student identity available");
    }

    // Retrieve cached or new identity token
    let token = await AuthService.getClientToken(studentId);

    let headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };

    let response = await fetch(url, { ...options, headers });

    // Handle token expiration or token validation failure gracefully (401 response)
    if (response.status === 401) {
      console.warn("ZANA Auth token invalid/expired, attempting silent credential verification...");
      AuthService.clearClientToken(studentId);
      
      try {
        // Enforce token refresh and retry request
        token = await AuthService.getClientToken(studentId, true);
        headers = {
          ...(options.headers as Record<string, string>),
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        };
        response = await fetch(url, { ...options, headers });
      } catch (refreshErr) {
        console.error("Cryptographic credential verification failed permanently:", refreshErr);
        AuthService.clearClientToken(studentId);
        if (onAuthFailure) {
          onAuthFailure();
        }
        throw new Error("ZANA_SESSION_EXPIRED");
      }
    }

    return response;
  }, [studentId, onAuthFailure]);

  // Load profile and active recommendations from secure server endpoints
  const loadProfile = useCallback(async () => {
    if (!studentId || studentId === "default-guest") return;
    try {
      setLoading(true);

      // 1. Fetch Student Profile via authenticated tunnel
      const profileRes = await fetchWithAuth(`/api/learning/mastery?studentId=${encodeURIComponent(studentId)}`);
      if (profileRes.ok) {
        const p = await profileRes.json();
        setProfile(p);
      } else if (profileRes.status === 401 || profileRes.status === 403) {
        console.warn("Unauthorized profile access attempt.");
      }

      // 2. Fetch Active Recommendations via authenticated tunnel
      const recsRes = await fetchWithAuth(`/api/learning/recommendations?studentId=${encodeURIComponent(studentId)}&status=ACTIVE`);
      if (recsRes.ok) {
        const recs = await recsRes.json();
        setRecommendations(recs);
      }
    } catch (e) {
      console.error("Error loading student mastery profile from server:", e);
    } finally {
      setLoading(false);
    }
  }, [studentId, fetchWithAuth]);

  useEffect(() => {
    if (studentId && studentId !== "default-guest") {
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
    if (!studentId || studentId === "default-guest") return null;

    try {
      const response = await fetchWithAuth("/api/learning/attempts", {
        method: "POST",
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
  }, [studentId, loadProfile, fetchWithAuth]);

  // Start a learning session securely on the server
  const startSession = useCallback(async () => {
    if (!studentId || studentId === "default-guest") return null;

    try {
      const response = await fetchWithAuth("/api/learning/sessions/start", {
        method: "POST",
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
  }, [studentId, fetchWithAuth]);

  // End a learning session securely on the server
  const endSession = useCallback(async (focusScore: number = 1.0) => {
    if (!activeSessionId || !studentId || studentId === "default-guest") return;

    try {
      const response = await fetchWithAuth(`/api/learning/sessions/${encodeURIComponent(activeSessionId)}/end`, {
        method: "POST",
        body: JSON.stringify({ focusScore })
      });

      if (response.ok) {
        setActiveSessionId(null);
      }
    } catch (e) {
      console.error("Error ending session on server:", e);
    }
  }, [activeSessionId, studentId, fetchWithAuth]);


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
