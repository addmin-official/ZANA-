import { useState, useEffect, useCallback, useRef } from "react";
import {
  StudentMasteryProfile,
  AdaptiveRecommendation,
  DifficultyLevel,
  MisconceptionStatus
} from "../domain/MasteryTypes.ts";
import { LocalStorageLearningRecordProvider } from "../providers/LearningRecordProvider.ts";
import { AdaptiveLearningEngine as StudentMasteryAdaptiveEngine } from "../engine/AdaptiveLearningEngine.ts";
import { AuthService } from "../../services/authService.ts";

const localProvider = new LocalStorageLearningRecordProvider();

export function useStudentMastery(studentId: string, onAuthFailure?: () => void) {
  const [profile, setProfile] = useState<StudentMasteryProfile | null>(null);
  const [recommendations, setRecommendations] = useState<AdaptiveRecommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Safe fetch client that checks for token existence before making requests
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}): Promise<Response | null> => {
    if (!studentId || studentId === "default-guest") {
      return null;
    }

    // Retrieve cached or new identity token
    let token = await AuthService.getClientToken(studentId);
    if (!token) {
      return null;
    }

    let headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };

    let response = await fetch(url, { ...options, headers });

    // Handle token expiration or token validation failure gracefully (401 response)
    if (response.status === 401) {
      try {
        // Enforce token refresh and retry request
        token = await AuthService.getClientToken(studentId, true);
        if (!token) {
          if (onAuthFailure) {
            onAuthFailure();
          }
          return null;
        }
        headers = {
          ...(options.headers as Record<string, string>),
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        };
        response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
          if (onAuthFailure) {
            onAuthFailure();
          }
          return null;
        }
      } catch {
        if (onAuthFailure) {
          onAuthFailure();
        }
        return null;
      }
    }

    return response;
  }, [studentId, onAuthFailure]);

  // Load profile and active recommendations with local storage fallback
  const loadProfile = useCallback(async () => {
    const effectiveId = studentId || "default-guest";

    try {
      // 1. Always load instantly from local storage provider
      const localP = await localProvider.getStudentMasteryProfile(effectiveId);
      const localRecs = await localProvider.listRecommendations(effectiveId, "ACTIVE");
      if (isMountedRef.current) {
        setProfile(localP);
        setRecommendations(localRecs);
      }

      // 2. If authenticated, sync with server
      if (effectiveId !== "default-guest") {
        const profileRes = await fetchWithAuth(`/api/learning/mastery?studentId=${encodeURIComponent(effectiveId)}`);
        if (profileRes && profileRes.ok) {
          const serverP: StudentMasteryProfile = await profileRes.json();
          if (isMountedRef.current) {
            setProfile(serverP);
          }
          // Save server state to local cache
          for (const [cId, state] of Object.entries(serverP.conceptMasteries || {})) {
            await localProvider.saveMasteryChange(effectiveId, cId, state);
          }
        }

        const recsRes = await fetchWithAuth(`/api/learning/recommendations?studentId=${encodeURIComponent(effectiveId)}&status=ACTIVE`);
        if (recsRes && recsRes.ok) {
          const serverRecs: AdaptiveRecommendation[] = await recsRes.json();
          if (isMountedRef.current) {
            setRecommendations(serverRecs);
          }
          for (const rec of serverRecs) {
            await localProvider.saveRecommendation(rec);
          }
        }
      }
    } catch {
      // Fallback silently without breaking UI
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [studentId, fetchWithAuth]);

  useEffect(() => {
    let active = true;
    void localProvider.getStudentMasteryProfile(studentId || "default-guest").then(p => {
      if (active) {
        setProfile(p);
        void loadProfile();
      }
    });
    return () => {
      active = false;
    };
  }, [studentId, loadProfile]);

  // Record an exercise attempt securely on the server and local storage
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
    const effectiveId = studentId || "default-guest";

    try {
      const currentState = await localProvider.getConceptMastery(effectiveId, attemptInput.conceptId);
      const currentProfile = await localProvider.getStudentMasteryProfile(effectiveId);

      const newState = StudentMasteryAdaptiveEngine.calculateNewMastery(currentState, {
        isCorrect: attemptInput.isCorrect,
        responseTimeMs: attemptInput.responseTimeMs || 5000,
        difficulty: attemptInput.difficulty,
        hintUsed: !!attemptInput.hintUsed,
        unreliableTiming: !!attemptInput.unreliableTiming
      });

      await localProvider.saveMasteryChange(effectiveId, attemptInput.conceptId, newState);

      const attempt = {
        id: "att_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now(),
        studentId: effectiveId,
        conceptId: attemptInput.conceptId,
        isCorrect: attemptInput.isCorrect,
        responseTimeMs: attemptInput.responseTimeMs || 5000,
        difficulty: attemptInput.difficulty,
        questionText: attemptInput.questionText || "",
        studentResponse: attemptInput.studentResponse || "",
        misconceptionDetected: attemptInput.misconceptionDetected,
        timestamp: new Date().toISOString()
      };

      const detectedMisc = StudentMasteryAdaptiveEngine.detectMisconception(attempt, currentProfile.activeMisconceptions);
      if (detectedMisc) {
        const index = currentProfile.activeMisconceptions.findIndex(
          (m) => m.misconceptionId === detectedMisc.misconceptionId && m.resolvedAt === null
        );
        if (index >= 0) {
          currentProfile.activeMisconceptions[index] = detectedMisc;
        } else {
          currentProfile.activeMisconceptions.push(detectedMisc);
        }
      } else if (attemptInput.isCorrect) {
        currentProfile.activeMisconceptions = currentProfile.activeMisconceptions.map((m) => {
          if (m.conceptId === attemptInput.conceptId && m.resolvedAt === null) {
            if (m.status === MisconceptionStatus.SUSPECTED || m.status === MisconceptionStatus.CONFIRMED) {
              return {
                ...m,
                status: MisconceptionStatus.IMPROVING,
                confidence: "medium" as const,
                lastDetectedAt: new Date().toISOString()
              };
            } else if (m.status === MisconceptionStatus.IMPROVING) {
              return {
                ...m,
                status: MisconceptionStatus.RESOLVED,
                confidence: "high" as const,
                resolvedAt: new Date().toISOString()
              };
            }
          }
          return m;
        });
      }

      await localProvider.appendLearningEvent(effectiveId, {
        id: "evt_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now(),
        studentId: effectiveId,
        timestamp: new Date().toISOString(),
        type: "EXERCISE_ATTEMPT",
        data: attempt
      });

      const recommendation = StudentMasteryAdaptiveEngine.generateRecommendation(
        effectiveId,
        attemptInput.conceptId,
        attemptInput.conceptTitleKu,
        currentProfile,
        []
      );
      await localProvider.saveRecommendation(recommendation);

      // Async sync with server if online & authenticated
      if (effectiveId !== "default-guest") {
        void fetchWithAuth("/api/learning/attempts", {
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
      }

      await loadProfile();

      return {
        masteryState: newState,
        misconception: detectedMisc,
        recommendation
      };
    } catch (e) {
      console.warn("Could not record attempt locally:", e);
      return null;
    }
  }, [studentId, loadProfile, fetchWithAuth]);

  // Start a learning session
  const startSession = useCallback(async () => {
    const effectiveId = studentId || "default-guest";
    const sessionId = "ses_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
    setActiveSessionId(sessionId);

    const session = {
      id: sessionId,
      studentId: effectiveId,
      startTime: new Date().toISOString(),
      endTime: null,
      events: [],
      focusScore: 1.0
    };

    await localProvider.createLearningSession(session);

    if (effectiveId !== "default-guest") {
      void fetchWithAuth("/api/learning/sessions/start", {
        method: "POST",
        body: JSON.stringify({})
      });
    }

    return sessionId;
  }, [studentId, fetchWithAuth]);

  // End a learning session
  const endSession = useCallback(async (focusScore: number = 1.0) => {
    const effectiveId = studentId || "default-guest";
    if (!activeSessionId) return;

    const session = {
      id: activeSessionId,
      studentId: effectiveId,
      startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      endTime: new Date().toISOString(),
      events: [],
      focusScore
    };

    await localProvider.updateLearningSession(session);
    setActiveSessionId(null);

    if (effectiveId !== "default-guest") {
      void fetchWithAuth(`/api/learning/sessions/${encodeURIComponent(activeSessionId)}/end`, {
        method: "POST",
        body: JSON.stringify({ focusScore })
      });
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
