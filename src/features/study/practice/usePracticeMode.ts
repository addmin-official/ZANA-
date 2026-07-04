import { useState, useEffect, useCallback, useMemo } from "react";
import { StudentProfile } from "../../student/studentTypes.ts";
import { CurriculumIntelligenceSnapshot } from "../../../curriculum/types.ts";
import { SessionSnapshot } from "../../../session/types.ts";
import { PracticeSnapshot, PracticeAttempt, PracticeQuestion } from "./practiceTypes.ts";
import { PracticeModeEngine } from "./PracticeModeEngine.ts";
import { DomainEventBus } from "../../../domain/DomainEventBus.ts";
import { DomainEventFactory } from "../../../domain/DomainEventFactory.ts";

export interface UsePracticeModeProps {
  studentProfile: StudentProfile;
  curriculumSnapshot: CurriculumIntelligenceSnapshot;
  sessionSnapshot: SessionSnapshot;
}

export function usePracticeMode({
  studentProfile,
  curriculumSnapshot,
  sessionSnapshot
}: UsePracticeModeProps) {
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [error, setError] = useState<string | null>(null);

  const conceptId = sessionSnapshot.currentSession?.currentNodeId || "12_sci_math_con1";

  // Reset attempts when active concept changes
  useEffect(() => {
    setAttempts([]);
    setError(null);
  }, [conceptId]);

  // Build the snapshot dynamically using the engine
  const snapshot = useMemo<PracticeSnapshot | null>(() => {
    try {
      return PracticeModeEngine.buildPracticeSnapshot({
        studentProfile,
        curriculumSnapshot,
        sessionSnapshot,
        attempts
      });
    } catch (e: any) {
      console.error("Error building practice snapshot:", e);
      setError(e?.message || "هەڵەیەک لە داڕشتنی پانێلی ڕاهێناندا ڕوویدا.");
      return null;
    }
  }, [studentProfile, curriculumSnapshot, sessionSnapshot, attempts]);

  // Submit Answer function
  const submitAnswer = useCallback((questionId: string, answer: string) => {
    if (!snapshot) return;

    const question = snapshot.questions.find(q => q.id === questionId);
    if (!question) {
      setError("پرسیارەکە نەدۆزرایەوە.");
      return;
    }

    try {
      // 1. Evaluate answer using the engine
      const evaluation = PracticeModeEngine.evaluatePracticeAnswer(question, answer);

      // 2. Add attempt to state
      const newAttempt: PracticeAttempt = {
        questionId,
        studentAnswer: answer,
        isCorrect: evaluation.isCorrect,
        submittedAt: new Date().toISOString()
      };

      const updatedAttempts = [...attempts.filter(a => a.questionId !== questionId), newAttempt];
      setAttempts(updatedAttempts);

      // 3. Dispatch Domain Event ANSWER_SUBMITTED
      try {
        const eventBus = DomainEventBus.getInstance();
        const subEvent = DomainEventFactory.createEvent(
          "ANSWER_SUBMITTED",
          studentProfile.id,
          "student-portal",
          {
            questionId,
            studentAnswer: answer,
            conceptId: conceptId
          },
          {
            nodeId: conceptId,
            sessionId: sessionSnapshot.currentSession?.id,
            subject: studentProfile.activeSubject,
            grade: studentProfile.grade,
            stream: studentProfile.stream
          }
        );
        eventBus.publish(subEvent);
      } catch (evtErr) {
        console.warn("Domain events could not publish ANSWER_SUBMITTED:", evtErr);
      }

      // 4. Dispatch Domain Event ANSWER_EVALUATED
      try {
        const eventBus = DomainEventBus.getInstance();
        const evalEvent = DomainEventFactory.createEvent(
          "ANSWER_EVALUATED",
          studentProfile.id,
          "ai-tutor",
          {
            questionId,
            isCorrect: evaluation.isCorrect,
            score: evaluation.isCorrect ? 100 : 0,
            feedbackKu: evaluation.feedback
          },
          {
            nodeId: conceptId,
            sessionId: sessionSnapshot.currentSession?.id,
            subject: studentProfile.activeSubject,
            grade: studentProfile.grade,
            stream: studentProfile.stream
          }
        );
        eventBus.publish(evalEvent);
      } catch (evtErr) {
        console.warn("Domain events could not publish ANSWER_EVALUATED:", evtErr);
      }

      // 5. Check if all questions are completed and evaluate for CONCEPT_COMPLETED
      const allQuestions = snapshot.questions;
      const allAttemptsMap = new Map(updatedAttempts.map(a => [a.questionId, a]));
      const completedAll = allQuestions.every(q => allAttemptsMap.has(q.id));

      if (completedAll) {
        const correctCount = allQuestions.filter(q => allAttemptsMap.get(q.id)?.isCorrect).length;
        const totalCount = allQuestions.length;
        const score = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

        if (score >= 70) {
          try {
            const eventBus = DomainEventBus.getInstance();
            const conceptCompEvent = DomainEventFactory.createEvent(
              "CONCEPT_COMPLETED",
              studentProfile.id,
              "ai-tutor",
              {
                conceptId: conceptId,
                sessionId: sessionSnapshot.currentSession?.id
              },
              {
                nodeId: conceptId,
                sessionId: sessionSnapshot.currentSession?.id,
                subject: studentProfile.activeSubject,
                grade: studentProfile.grade,
                stream: studentProfile.stream
              }
            );
            eventBus.publish(conceptCompEvent);
          } catch (evtErr) {
            console.warn("Domain events could not publish CONCEPT_COMPLETED:", evtErr);
          }
        }
      }
    } catch (err: any) {
      console.error("Error during answer submission:", err);
      setError("کێشەیەک لە پێشکەشکردنی وەڵامدا دروست بوو.");
    }
  }, [snapshot, attempts, studentProfile, conceptId, sessionSnapshot.currentSession?.id]);

  // Reset practice state
  const resetPractice = useCallback(() => {
    setAttempts([]);
    setError(null);
  }, []);

  // Determine if all questions have been answered and overall score is >= 70%
  const isCompleted = useMemo(() => {
    if (!snapshot || snapshot.questions.length === 0) return false;
    const answeredCount = attempts.length;
    const totalCount = snapshot.questions.length;
    if (answeredCount < totalCount) return false;

    const correctCount = attempts.filter(a => a.isCorrect).length;
    const score = (correctCount / totalCount) * 100;
    return score >= 70;
  }, [snapshot, attempts]);

  return {
    snapshot,
    submitAnswer,
    resetPractice,
    isCompleted,
    error
  };
}
