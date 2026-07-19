import { useState, useEffect, useCallback, useMemo } from "react";
import { StudentProfile } from "../../student/studentTypes.ts";
import {
  AssessmentSession,
  AssessmentSnapshot,
  AssessmentMode,
} from "./assessmentTypes.ts";
import { AssessmentStateEngine } from "./AssessmentStateEngine.ts";
import { generateAssessmentRecommendation } from "./AssessmentRecommendationEngine.ts";
import { StudentIntelligenceEngine } from "../../../intelligence/StudentIntelligenceEngine.ts";
import { CurriculumIntelligenceEngine } from "../../../curriculum/CurriculumIntelligenceEngine.ts";
import { learningSessionEngineInstance } from "../../../session/LearningSessionEngine.ts";
import { safeGet, safeSet, safeRemove, ZanaStorage } from "../../../services/storage.ts";
import { AdaptiveLearningEngine } from "../../adaptive/AdaptiveLearningEngine.ts";
import { AdaptiveEventBridge } from "../../adaptive/AdaptiveEventBridge.ts";
import { LocalStorageLearningRecordProvider } from "../../../learning/providers/LearningRecordProvider.ts";
import { AdaptiveLearningEngine as StudentMasteryAdaptiveEngine } from "../../../learning/engine/AdaptiveLearningEngine.ts";

/**
 * Hook to manage Assessment Intelligence Platform state,
 * integrating with SIP, CIP, LSE, and persistence mechanisms.
 */
export function useAssessmentIntelligence(
  profile: StudentProfile,
  onProfileUpdate: (profile: Partial<StudentProfile>) => void
) {
  const studentId = profile.id;
  const storageKey = `zana:assessment-session:${studentId}`;

  const [session, setSession] = useState<AssessmentSession | null>(() => {
    return safeGet<AssessmentSession | null>(storageKey, null);
  });
  const [error, setError] = useState<string | null>(null);

  // Sync session to localStorage
  useEffect(() => {
    if (session) {
      safeSet(storageKey, session);
    } else {
      safeRemove(storageKey);
    }
  }, [session, storageKey]);

  // Build SIP, CIP snapshots for lookups
  const { sipSnapshot, cipSnapshot, lseSnapshot } = useMemo(() => {
    try {
      const sipEngine = StudentIntelligenceEngine.getInstance(profile);
      const sip = sipEngine.getSnapshot();

      const cipEngine = new CurriculumIntelligenceEngine();
      const cip = cipEngine.buildCurriculumIntelligenceSnapshot({
        grade: profile.grade,
        stream: profile.stream,
        subject: profile.activeSubject,
        completedNodeIds: Array.from(sip.graph.completedNodeIds || []),
      });

      const lse = learningSessionEngineInstance.initializeOrResume(
        profile,
        sip,
        cip
      );

      return { sipSnapshot: sip, cipSnapshot: cip, lseSnapshot: lse };
    } catch (err) {
      console.warn("SIP/CIP/LSE snapshot building failed:", err);
      return { sipSnapshot: undefined, cipSnapshot: undefined, lseSnapshot: undefined };
    }
  }, [profile]);

  /**
   * Starts a new assessment session
   */
  const start = useCallback(
    (mode: AssessmentMode) => {
      setError(null);
      try {
        const activeNode = (lseSnapshot as any)?.activeNode;
        const activeLesson = (lseSnapshot as any)?.activeLesson;

        const newSession = AssessmentStateEngine.startAssessment({
          studentId,
          mode,
          grade: profile.grade,
          stream: profile.stream,
          subject: profile.activeSubject,
          level: profile.level || "intermediate",
          activeConceptId: activeNode?.id,
          activeConceptTitle: activeNode?.title,
          activeLessonId: activeLesson?.id,
          activeLessonTitle: activeLesson?.title,
        });

        setSession(newSession);
      } catch (err: unknown) {
        console.error("Failed to start assessment:", err);
        setError("نەتوانرا تاقیکردنەوەکە دەستپێبکرێت. تکایە دووبارە تاقیبکەرەوە.");
      }
    },
    [studentId, profile, lseSnapshot]
  );

  /**
   * Submits student's answer to the current question
   */
  const submitAnswer = useCallback(
    (answerText: string): { isCorrect: boolean; feedback: string } => {
      setError(null);
      if (!session) {
        throw new Error("هیچ تاقیکردنەوەیەکی کارا نییە.");
      }

      try {
        const currentQuestion = session.questions[session.currentQuestionIndex];
        const { updatedSession, isCorrect, feedback } = AssessmentStateEngine.submitAnswer(
          session,
          currentQuestion.id,
          answerText
        );

        // PHASE 15 - RECORD ATTEMPT FOR STUDENT MASTERY ENGINE
        if (currentQuestion.conceptId) {
          const lp = new LocalStorageLearningRecordProvider();
          lp.getStudentMasteryProfile(studentId).then(async (profileData) => {
            const currentState = await lp.getConceptMastery(studentId, currentQuestion.conceptId!);
            const newState = StudentMasteryAdaptiveEngine.calculateNewMastery(currentState, {
              isCorrect,
              responseTimeMs: 8000,
              difficulty: 2
            });
            await lp.saveMasteryChange(studentId, currentQuestion.conceptId!, newState);

            // Misconception analysis
            const attemptObj = {
              id: "att_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now(),
              studentId,
              conceptId: currentQuestion.conceptId!,
              isCorrect,
              responseTimeMs: 8000,
              difficulty: 2,
              questionText: currentQuestion.text,
              studentResponse: answerText,
              timestamp: new Date().toISOString()
            };
            const detectedMisc = StudentMasteryAdaptiveEngine.detectMisconception(attemptObj, profileData.activeMisconceptions);
            let updatedMisconceptions = [...profileData.activeMisconceptions];
            if (detectedMisc) {
              const idx = updatedMisconceptions.findIndex(m => m.misconceptionId === detectedMisc.misconceptionId && m.resolvedAt === null);
              if (idx >= 0) {
                updatedMisconceptions[idx] = detectedMisc;
              } else {
                updatedMisconceptions.push(detectedMisc);
              }
            } else if (isCorrect) {
              updatedMisconceptions = updatedMisconceptions.map(m => {
                if (m.conceptId === currentQuestion.conceptId && m.resolvedAt === null) {
                  return { ...m, resolvedAt: new Date().toISOString() };
                }
                return m;
              });
            }

            profileData.activeMisconceptions = updatedMisconceptions;
            await lp.appendLearningEvent(studentId, {
              id: "evt_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now(),
              studentId,
              timestamp: new Date().toISOString(),
              type: "EXERCISE_ATTEMPT",
              data: attemptObj
            });

            // Recommendation
            const recommendation = StudentMasteryAdaptiveEngine.generateRecommendation(
              studentId,
              currentQuestion.conceptId!,
              currentQuestion.conceptId!,
              profileData,
              []
            );
            await lp.saveRecommendation(recommendation);
          }).catch(err => console.warn("Error running local mastery engine in assessment:", err));
        }

        setSession(updatedSession);
        return { isCorrect, feedback };
      } catch (err: unknown) {
        console.error("Failed to submit answer:", err);
        setError("کێشەیەک ڕوویدا لە کاتی ناردنی وەڵامەکەتدا.");
        return { isCorrect: false, feedback: "داوای لێبوردن دەکەین، کێشەیەک لە پێشکەشکردنی وەڵامەکەدا ڕوویدا." };
      }
    },
    [session]
  );

  /**
   * Advances index to next question
   */
  const nextQuestion = useCallback(() => {
    setError(null);
    if (!session) return;
    try {
      const updated = AssessmentStateEngine.moveNext(session);
      setSession(updated);
    } catch (err: unknown) {
      console.error("Failed to advance question:", err);
      setError("نەتوانرا بچێتە پرسیاری داهاتوو.");
    }
  }, [session]);

  /**
   * Finishes and scores the assessment
   */
  const finish = useCallback(() => {
    setError(null);
    if (!session) return;
    try {
      const completed = AssessmentStateEngine.finishAssessment(session);
      setSession(completed);

      // Increment progress counters in ZanaStorage for analytics/goals
      ZanaStorage.incrementQuestions(completed.totalQuestions);
      ZanaStorage.incrementSessions();

      // Trigger Adaptive Learning Loop propagation
      try {
        const sipEngine = StudentIntelligenceEngine.getInstance(profile);
        const sipSnapshot = sipEngine.getSnapshot();

        const cipEngine = new CurriculumIntelligenceEngine();
        const cipSnapshot = cipEngine.buildCurriculumIntelligenceSnapshot({
          grade: profile.grade,
          stream: profile.stream,
          subject: profile.activeSubject,
          completedNodeIds: Array.from(sipSnapshot.graph.completedNodeIds || []),
        });

        const lseSnapshot = learningSessionEngineInstance.initializeOrResume(
          profile,
          sipSnapshot,
          cipSnapshot
        );

        // Build adaptive snapshot
        const adaptiveSnapshot = AdaptiveLearningEngine.buildAdaptiveSnapshot({
          studentProfile: profile,
          assessmentSession: completed,
          sipSnapshot,
          cipSnapshot,
          lseSnapshot
        });

        // Resolve concept labels
        const conceptLabels: Record<string, string> = {};
        cipSnapshot.resolution.availableNodes.forEach(node => {
          conceptLabels[node.id] = node.title;
        });

        // Propagate results
        AdaptiveEventBridge.propagateResults(profile, adaptiveSnapshot, conceptLabels);

        // Sync adaptive snapshot in storage
        const storageKey = `zana:adaptive-snapshot:${profile.id}`;
        safeSet(storageKey, adaptiveSnapshot);
      } catch (adaptErr) {
        console.warn("Could not process adaptive feedback in finish:", adaptErr);
      }

      // Update student level if diagnostic recommends an update
      const rec = generateAssessmentRecommendation(completed.scorePercentage);
      if (completed.mode === "diagnostic") {
        let newLevel: "beginner" | "intermediate" | "advanced" = "intermediate";
        if (completed.scorePercentage >= 80) {
          newLevel = "advanced";
        } else if (completed.scorePercentage >= 50) {
          newLevel = "intermediate";
        } else {
          newLevel = "beginner";
        }
        onProfileUpdate({ level: newLevel });
      }
    } catch (err: unknown) {
      console.error("Failed to finish assessment:", err);
      setError("کێشەیەک ڕوویدا لە کاتی بەکۆتاهێنانی تاقیکردنەوەکەدا.");
    }
  }, [session, onProfileUpdate, profile]);

  /**
   * Resets active assessment
   */
  const reset = useCallback(() => {
    setError(null);
    setSession(null);
    safeRemove(storageKey);
  }, [storageKey]);

  // Build the live snapshot
  const snapshot: AssessmentSnapshot | null = useMemo(() => {
    if (!session) return null;

    const currentQuestion = session.completed
      ? undefined
      : session.questions[session.currentQuestionIndex];

    const progressPercentage = session.completed
      ? 100
      : Math.round((session.answers.length / session.totalQuestions) * 100);

    let resultSummary: AssessmentSnapshot["resultSummary"] = undefined;

    if (session.completed) {
      const rec = generateAssessmentRecommendation(session.scorePercentage);

      // Map concept IDs to readable titles using CIP snapshot
      const weakAreas = session.weakConceptIds.map(id => {
        if (cipSnapshot && (cipSnapshot as any).graph && (cipSnapshot as any).graph.nodes) {
          const node = (cipSnapshot as any).graph.nodes.find((n: any) => n.id === id);
          if (node) return node.title;
        }
        return "بەهێزکردنی لایەنەکان";
      });

      const strongAreas = session.strongConceptIds.map(id => {
        if (cipSnapshot && (cipSnapshot as any).graph && (cipSnapshot as any).graph.nodes) {
          const node = (cipSnapshot as any).graph.nodes.find((n: any) => n.id === id);
          if (node) return node.title;
        }
        return "خاڵە متمانەبەخشەکان";
      });

      // Default lists if empty
      if (weakAreas.length === 0 && session.scorePercentage < 100) {
        weakAreas.push("پێویستە پێداچوونەوەی زیاتر لەسەر هاوکێشەکان بکرێت");
      }
      if (strongAreas.length === 0 && session.scorePercentage > 0) {
        strongAreas.push("توانای گشتی باش و متمانەی بەرز");
      }

      resultSummary = {
        title: "ئەنجامی هەڵسەنگاندنی زانا",
        message: rec.message,
        scoreLabel: `${session.answers.filter(a => a.isCorrect).length} لە ${session.totalQuestions} وەڵامی ڕاست`,
        weakAreas,
        strongAreas,
        nextStep: rec.nextAction === "advance_next_lesson"
          ? "چوونە وانەی داهاتوو"
          : rec.nextAction === "practice_more"
          ? "ڕاهێنانی زیاتر لەسەر بابەتەکە"
          : "پێداچوونەوە بە خاڵە لاوازەکان",
      };
    }

    return {
      session,
      currentQuestion,
      progressPercentage,
      resultSummary,
      warnings: [],
    };
  }, [session, cipSnapshot]);

  const isCompleted = session?.completed || false;

  return {
    snapshot,
    start,
    submitAnswer,
    nextQuestion,
    finish,
    reset,
    isCompleted,
    error,
  };
}
