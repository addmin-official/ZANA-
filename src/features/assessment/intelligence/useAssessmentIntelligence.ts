import { useState, useEffect, useCallback, useMemo } from "react";
import { StudentProfile } from "../../student/studentTypes.ts";
import {
  AssessmentSession,
  AssessmentSnapshot,
  AssessmentMode,
  AssessmentQuestion,
  AssessmentAnswer,
  QuestionOption
} from "./assessmentTypes.ts";
import { AssessmentStateEngine } from "./AssessmentStateEngine.ts";
import { generateAssessmentRecommendation } from "./AssessmentRecommendationEngine.ts";
import { StudentIntelligenceEngine } from "../../../intelligence/StudentIntelligenceEngine.ts";
import { CurriculumIntelligenceEngine } from "../../../curriculum/CurriculumIntelligenceEngine.ts";
import { learningSessionEngineInstance } from "../../../session/LearningSessionEngine.ts";
import { safeGet, safeSet, safeRemove, ZanaStorage } from "../../../services/storage.ts";
import { AdaptiveLearningEngine } from "../../adaptive/AdaptiveLearningEngine.ts";
import { AdaptiveEventBridge } from "../../adaptive/AdaptiveEventBridge.ts";
import { AuthService } from "../../../services/authService.ts";
import { AnswerSubmission } from "../../../assessment/domain/AssessmentTypes.ts";

/**
 * Hook to manage Assessment Intelligence Platform state,
 * integrating with SIP, CIP, LSE, and server-side production endpoints.
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
  const [isLoading, setIsLoading] = useState(false);

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
    async (mode: AssessmentMode) => {
      setError(null);
      setIsLoading(true);
      try {
        // Enforce PRODUCTION safety: exchange token & query backend
        if (studentId && studentId !== "default-guest") {
          try {
            const token = await AuthService.getClientToken(studentId);
            const response = await fetch("/api/assessment/start", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                unitId: "foundations-of-algebra", // matches question-bank seed unit
                subjectId: profile.activeSubject || "math",
                type: mode === "diagnostic" ? "DIAGNOSTIC" : "MASTERY_CHECK",
                titleKu: mode === "diagnostic" ? "تاقیکردنەوەی ئاستی زانستی زانا" : "هەڵسەنگاندنی خێرا",
                instructionsKu: "تکایە بە وریاییەوە وەڵامی پرسیارەکان بدەرەوە تاوەکو زانا هەڵسەنگاندنێکی زانستیی ورد پێشکەش بکات."
              })
            });

            if (response.ok) {
              const data = await response.json();
              const { attempt, firstQuestion, blueprint } = data;

              const mappedQuestion: AssessmentQuestion = {
                id: firstQuestion.id,
                type: firstQuestion.type, // e.g. "MULTIPLE_CHOICE_SINGLE" or "TRUE_FALSE" etc.
                prompt: firstQuestion.promptKu,
                options: firstQuestion.options,
                explanation: "", // hidden until answer is submitted and graded
                conceptId: firstQuestion.conceptId,
                lessonId: firstQuestion.lessonId,
                difficulty: firstQuestion.difficulty.toLowerCase() as any,
                source: "ZANA_ORIGINAL"
              };

              const newSession: AssessmentSession = {
                id: attempt.id,
                studentId: attempt.studentId,
                mode,
                grade: profile.grade,
                stream: profile.stream,
                subject: profile.activeSubject,
                currentQuestionIndex: 0,
                totalQuestions: blueprint.totalQuestions,
                questions: [mappedQuestion],
                answers: [],
                startedAt: attempt.startedAt,
                completed: false,
                scorePercentage: 0,
                weakConceptIds: [],
                strongConceptIds: [],
                recommendedNextAction: "continue_learning",
                blueprint
              };

              setSession(newSession);
              setIsLoading(false);
              return;
            } else {
              const errBody = await response.json().catch(() => ({}));
              console.warn("Backend start endpoint failed:", errBody.error || response.statusText);
            }
          } catch (apiErr) {
            console.warn("Server connection error during start, falling back to local quiz generator:", apiErr);
          }
        }

        // Graceful Client-Side/Offline Fallback matching Heuristic quiz rules
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
      } finally {
        setIsLoading(false);
      }
    },
    [studentId, profile, lseSnapshot]
  );

  /**
   * Submits student's answer to the current question
   */
  const submitAnswer = useCallback(
    async (submissionInput: string | AnswerSubmission): Promise<{ isCorrect: boolean; feedback: string }> => {
      setError(null);
      if (!session) {
        throw new Error("هیچ تاقیکردنەوەیەکی کارا نییە.");
      }

      setIsLoading(true);
      try {
        const currentQuestion = session.questions[session.currentQuestionIndex];

        // Format AnswerSubmission structure dynamically
        let submission: AnswerSubmission;
        if (typeof submissionInput === "string") {
          if (currentQuestion.type === "MULTIPLE_CHOICE_SINGLE" || currentQuestion.type === "multiple_choice") {
            let optionId = submissionInput;
            if (currentQuestion.options) {
              const opt = currentQuestion.options.find(o => o.textKu === submissionInput || o.id === submissionInput);
              if (opt) optionId = opt.id;
            }
            submission = {
              questionId: currentQuestion.id,
              selectedOptionIds: [optionId],
              responseTimeMs: 8000
            };
          } else if (currentQuestion.type === "TRUE_FALSE") {
            const val = submissionInput === "ڕاست" || submissionInput === "true" || submissionInput === "yes";
            submission = {
              questionId: currentQuestion.id,
              trueFalseValue: val,
              responseTimeMs: 8000
            };
          } else if (currentQuestion.type === "NUMERIC") {
            submission = {
              questionId: currentQuestion.id,
              numericValue: Number(submissionInput),
              responseTimeMs: 8000
            };
          } else {
            submission = {
              questionId: currentQuestion.id,
              shortAnswerText: submissionInput,
              responseTimeMs: 8000
            };
          }
        } else {
          submission = submissionInput;
        }

        // Try submitting to secure Cloudflare backend if attempt uses server session
        if (studentId && studentId !== "default-guest" && session.blueprint) {
          try {
            const token = await AuthService.getClientToken(studentId);
            const response = await fetch("/api/assessment/submit", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                attemptId: session.id,
                questionId: currentQuestion.id,
                submission,
                blueprint: session.blueprint
              })
            });

            if (response.ok) {
              const data = await response.json();
              const { attempt, gradedAttempt, isFinished, nextQuestion } = data;

              const gradedQ = gradedAttempt.questionAttempts[currentQuestion.id];
              const isCorrect = gradedQ?.isCorrect || false;
              const feedback = gradedQ?.feedbackKu || "وەڵامەکەت بە سەرکەوتوویی تۆمارکرا.";

              const displayAnswerText = typeof submissionInput === "string" 
                ? submissionInput 
                : submission.shortAnswerText || submission.selectedOptionIds?.join(", ") || (submission.trueFalseValue ? "ڕاست" : "هەڵە");

              const newAnswer: AssessmentAnswer = {
                questionId: currentQuestion.id,
                answer: displayAnswerText,
                isCorrect,
                feedback,
                answeredAt: new Date().toISOString(),
                score: gradedQ?.partialCreditScore || 0
              };

              const updatedAnswers = [...session.answers, newAnswer];
              const updatedQuestions = [...session.questions];

              if (nextQuestion) {
                const mappedNext: AssessmentQuestion = {
                  id: nextQuestion.id,
                  type: nextQuestion.type,
                  prompt: nextQuestion.promptKu,
                  options: nextQuestion.options,
                  explanation: "",
                  conceptId: nextQuestion.conceptId,
                  lessonId: nextQuestion.lessonId,
                  difficulty: nextQuestion.difficulty.toLowerCase() as any,
                  source: "ZANA_ORIGINAL"
                };
                updatedQuestions.push(mappedNext);
              }

              const updatedSession: AssessmentSession = {
                ...session,
                questions: updatedQuestions,
                answers: updatedAnswers,
                completed: isFinished
              };

              setSession(updatedSession);
              setIsLoading(false);
              return { isCorrect, feedback };
            }
          } catch (apiErr) {
            console.warn("Server connection failed during submit, switching to local state engine:", apiErr);
          }
        }

        // Fallback Local Evaluation
        const legacyAnswerText = typeof submissionInput === "string"
          ? submissionInput
          : submission.shortAnswerText || submission.selectedOptionIds?.[0] || "";

        const { updatedSession, isCorrect, feedback } = AssessmentStateEngine.submitAnswer(
          session,
          currentQuestion.id,
          legacyAnswerText
        );

        // Record locally synced attempts for Student Mastery Engine
        if (currentQuestion.conceptId) {
          fetch("/api/learning/attempts", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${studentId}`
            },
            body: JSON.stringify({
              conceptId: currentQuestion.conceptId,
              isCorrect,
              responseTimeMs: 8000,
              difficulty: "STANDARD",
              questionText: currentQuestion.prompt,
              studentResponse: legacyAnswerText
            })
          }).catch(err => console.warn("Backend mastery attempt sync pending:", err));
        }

        setSession(updatedSession);
        setIsLoading(false);
        return { isCorrect, feedback };
      } catch (err: unknown) {
        console.error("Failed to submit answer:", err);
        setError("کێشەیەک ڕوویدا لە کاتی ناردنی وەڵامەکەتدا.");
        setIsLoading(false);
        return { isCorrect: false, feedback: "داوای لێبوردن دەکەین، کێشەیەک لە پێشکەشکردنی وەڵامەکەدا ڕوویدا." };
      }
    },
    [session, studentId]
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
  const finish = useCallback(
    async () => {
      setError(null);
      if (!session) return;
      setIsLoading(true);
      try {
        if (studentId && studentId !== "default-guest" && session.blueprint) {
          try {
            const token = await AuthService.getClientToken(studentId);
            const response = await fetch("/api/assessment/finish", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                attemptId: session.id,
                blueprint: session.blueprint
              })
            });

            if (response.ok) {
              const data = await response.json();
              const { result } = data;

              const scorePercent = result.scoreBreakdown.percentage;
              const completedSession: AssessmentSession = {
                ...session,
                completed: true,
                scorePercentage: scorePercent,
                weakConceptIds: result.weaknessesKu,
                strongConceptIds: result.strengthsKu,
                recommendedNextAction: scorePercent >= 70 ? "advance_next_lesson" : "review_weakness"
              };

              setSession(completedSession);
              ZanaStorage.incrementQuestions(completedSession.questions.length);
              ZanaStorage.incrementSessions();

              // Update student profile level if diagnostic recommended it
              if (completedSession.mode === "diagnostic") {
                let newLevel: "beginner" | "intermediate" | "advanced" = "intermediate";
                if (scorePercent >= 80) {
                  newLevel = "advanced";
                } else if (scorePercent >= 50) {
                  newLevel = "intermediate";
                } else {
                  newLevel = "beginner";
                }
                onProfileUpdate({ level: newLevel });
              }

              setIsLoading(false);
              return;
            }
          } catch (apiErr) {
            console.warn("Server connection failed during finish, using local grading fallback:", apiErr);
          }
        }

        // Local Evaluation Fallback
        const completed = AssessmentStateEngine.finishAssessment(session);
        setSession(completed);

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

          const adaptiveSnapshot = AdaptiveLearningEngine.buildAdaptiveSnapshot({
            studentProfile: profile,
            assessmentSession: completed,
            sipSnapshot,
            cipSnapshot,
            lseSnapshot
          });

          const conceptLabels: Record<string, string> = {};
          cipSnapshot.resolution.availableNodes.forEach(node => {
            conceptLabels[node.id] = node.title;
          });

          AdaptiveEventBridge.propagateResults(profile, adaptiveSnapshot, conceptLabels);

          const storageKey = `zana:adaptive-snapshot:${profile.id}`;
          safeSet(storageKey, adaptiveSnapshot);
        } catch (adaptErr) {
          console.warn("Could not process adaptive feedback in finish:", adaptErr);
        }

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
      } finally {
        setIsLoading(false);
      }
    },
    [session, onProfileUpdate, profile, studentId]
  );

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

      const weakAreas = session.weakConceptIds.map(id => {
        if (cipSnapshot && (cipSnapshot as any).graph && (cipSnapshot as any).graph.nodes) {
          const node = (cipSnapshot as any).graph.nodes.find((n: any) => n.id === id);
          if (node) return node.title;
        }
        return id;
      });

      const strongAreas = session.strongConceptIds.map(id => {
        if (cipSnapshot && (cipSnapshot as any).graph && (cipSnapshot as any).graph.nodes) {
          const node = (cipSnapshot as any).graph.nodes.find((n: any) => n.id === id);
          if (node) return node.title;
        }
        return id;
      });

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
    isLoading
  };
}
