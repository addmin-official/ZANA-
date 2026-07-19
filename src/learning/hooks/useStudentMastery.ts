import { useState, useEffect, useCallback } from "react";
import { LocalStorageLearningRecordProvider } from "../providers/LearningRecordProvider.ts";
import { AdaptiveLearningEngine } from "../engine/AdaptiveLearningEngine.ts";
import {
  StudentMasteryProfile,
  ConceptMasteryState,
  AdaptiveRecommendation,
  MisconceptionState,
  ExerciseAttempt,
  LearningEvent
} from "../domain/MasteryTypes.ts";

export function useStudentMastery(studentId: string) {
  const [profile, setProfile] = useState<StudentMasteryProfile | null>(null);
  const [recommendations, setRecommendations] = useState<AdaptiveRecommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const provider = useCallback(() => new LocalStorageLearningRecordProvider(), []);

  // Load profile and active recommendations
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const lp = provider();
      const p = await lp.getStudentMasteryProfile(studentId);
      const recs = await lp.listRecommendations(studentId, "ACTIVE");
      setProfile(p);
      setRecommendations(recs);
    } catch (e) {
      console.error("Error loading student mastery profile:", e);
    } finally {
      setLoading(false);
    }
  }, [studentId, provider]);

  useEffect(() => {
    if (studentId) {
      loadProfile();
    }
  }, [studentId, loadProfile]);

  // Record an exercise attempt
  const recordAttempt = useCallback(async (attemptInput: {
    conceptId: string;
    conceptTitleKu: string;
    isCorrect: boolean;
    responseTimeMs: number;
    difficulty: number;
    questionText: string;
    studentResponse: string;
    misconceptionDetected?: string;
    prerequisites?: string[];
  }) => {
    if (!studentId) return null;

    try {
      const lp = provider();
      const currentProfile = await lp.getStudentMasteryProfile(studentId);
      const currentState = await lp.getConceptMastery(studentId, attemptInput.conceptId);

      // 1. Calculate new concept mastery state
      const newState = AdaptiveLearningEngine.calculateNewMastery(currentState, {
        isCorrect: attemptInput.isCorrect,
        responseTimeMs: attemptInput.responseTimeMs,
        difficulty: attemptInput.difficulty
      });
      await lp.saveMasteryChange(studentId, attemptInput.conceptId, newState);

      // 2. Detect misconceptions
      const attempt: ExerciseAttempt = {
        id: "att_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now(),
        studentId,
        conceptId: attemptInput.conceptId,
        isCorrect: attemptInput.isCorrect,
        responseTimeMs: attemptInput.responseTimeMs,
        difficulty: attemptInput.difficulty,
        questionText: attemptInput.questionText,
        studentResponse: attemptInput.studentResponse,
        timestamp: new Date().toISOString()
      };

      const detectedMisc = AdaptiveLearningEngine.detectMisconception(attempt, currentProfile.activeMisconceptions);
      let updatedMisconceptions = [...currentProfile.activeMisconceptions];
      if (detectedMisc) {
        const index = updatedMisconceptions.findIndex(
          m => m.misconceptionId === detectedMisc.misconceptionId && m.resolvedAt === null
        );
        if (index >= 0) {
          updatedMisconceptions[index] = detectedMisc;
        } else {
          updatedMisconceptions.push(detectedMisc);
        }
      } else if (attemptInput.isCorrect) {
        // Resolve active misconception on correct answer
        updatedMisconceptions = updatedMisconceptions.map(m => {
          if (m.conceptId === attemptInput.conceptId && m.resolvedAt === null) {
            return { ...m, resolvedAt: new Date().toISOString() };
          }
          return m;
        });
      }

      // Save updated profile
      const updatedProfile: StudentMasteryProfile = {
        ...currentProfile,
        conceptMasteries: {
          ...currentProfile.conceptMasteries,
          [attemptInput.conceptId]: newState
        },
        activeMisconceptions: updatedMisconceptions
      };

      // 3. Log event
      const event: LearningEvent = {
        id: "evt_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now(),
        studentId,
        timestamp: new Date().toISOString(),
        type: "EXERCISE_ATTEMPT",
        data: attempt
      };
      await lp.appendLearningEvent(studentId, event);

      // 4. Generate recommendation
      const recommendation = AdaptiveLearningEngine.generateRecommendation(
        studentId,
        attemptInput.conceptId,
        attemptInput.conceptTitleKu,
        updatedProfile,
        attemptInput.prerequisites || []
      );
      await lp.saveRecommendation(recommendation);

      // Sync with server as fire-and-forget or try/catch
      try {
        fetch("/api/learning/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            conceptId: attemptInput.conceptId,
            isCorrect: attemptInput.isCorrect,
            responseTimeMs: attemptInput.responseTimeMs,
            difficulty: attemptInput.difficulty,
            questionText: attemptInput.questionText,
            studentResponse: attemptInput.studentResponse,
            misconceptionDetected: attemptInput.misconceptionDetected
          })
        }).catch(err => console.warn("Backend sync pending, continuing offline-first."));
      } catch (err) {}

      // Reload UI states
      await loadProfile();

      return {
        masteryState: newState,
        misconception: detectedMisc,
        recommendation
      };
    } catch (e) {
      console.error("Error recording attempt:", e);
      return null;
    }
  }, [studentId, provider, loadProfile]);

  // Start a learning session
  const startSession = useCallback(async () => {
    if (!studentId) return null;
    const sId = "ses_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
    setActiveSessionId(sId);

    try {
      const lp = provider();
      await lp.createLearningSession({
        id: sId,
        studentId,
        startTime: new Date().toISOString(),
        endTime: null,
        events: [],
        focusScore: 1.0
      });

      // Try background backend sync
      fetch("/api/learning/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId })
      }).catch(() => {});
    } catch (e) {
      console.error("Error starting session:", e);
    }
    return sId;
  }, [studentId, provider]);

  // End a learning session
  const endSession = useCallback(async (focusScore: number = 1.0) => {
    if (!activeSessionId || !studentId) return;

    try {
      const lp = provider();
      await lp.updateLearningSession({
        id: activeSessionId,
        studentId,
        startTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
        events: [],
        focusScore
      });

      // Try background backend sync
      fetch(`/api/learning/sessions/${activeSessionId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, focusScore })
      }).catch(() => {});

      setActiveSessionId(null);
    } catch (e) {
      console.error("Error ending session:", e);
    }
  }, [activeSessionId, studentId, provider]);

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
