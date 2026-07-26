import { useCallback, useMemo, useState } from "react";
import { StudentProfile } from "../../student/studentTypes.ts";
import { CurriculumIntelligenceSnapshot } from "../../../curriculum/types.ts";
import { SessionSnapshot } from "../../../session/types.ts";
import { PracticeSnapshot, PracticeAttempt } from "./practiceTypes.ts";
import { PracticeModeEngine } from "./PracticeModeEngine.ts";
import { DomainEventBus } from "../../../domain/DomainEventBus.ts";
import { DomainEventFactory } from "../../../domain/DomainEventFactory.ts";

export interface UsePracticeModeProps {
  studentProfile: StudentProfile;
  curriculumSnapshot: CurriculumIntelligenceSnapshot;
  sessionSnapshot: SessionSnapshot;
}

interface ConceptAttemptState {
  conceptId: string;
  attempts: PracticeAttempt[];
}

interface ConceptErrorState {
  conceptId: string;
  message: string | null;
}

interface PracticeBuildResult {
  snapshot: PracticeSnapshot | null;
  error: string | null;
}

const EMPTY_ATTEMPTS: PracticeAttempt[] = [];

export function usePracticeMode({
  studentProfile,
  curriculumSnapshot,
  sessionSnapshot,
}: UsePracticeModeProps) {
  const currentSession = sessionSnapshot.currentSession;
  const conceptId = currentSession?.currentNodeId || "12_sci_math_con1";
  const sessionId = currentSession?.id;

  const [attemptState, setAttemptState] = useState<ConceptAttemptState>({
    conceptId,
    attempts: [],
  });
  const [errorState, setErrorState] = useState<ConceptErrorState>({
    conceptId,
    message: null,
  });

  // A concept change invalidates prior attempts by derivation. No state is
  // changed during render; the next submission replaces the keyed state.
  const attempts = attemptState.conceptId === conceptId
    ? attemptState.attempts
    : EMPTY_ATTEMPTS;
  const submissionError = errorState.conceptId === conceptId
    ? errorState.message
    : null;

  const buildResult = useMemo<PracticeBuildResult>(() => {
    try {
      return {
        snapshot: PracticeModeEngine.buildPracticeSnapshot({
          studentProfile,
          curriculumSnapshot,
          sessionSnapshot,
          attempts,
        }),
        error: null,
      };
    } catch {
      return {
        snapshot: null,
        error: "هەڵەیەک لە ئامادەکردنی ڕاهێنانەکەدا ڕوویدا. تکایە دووبارە هەوڵ بدەرەوە.",
      };
    }
  }, [studentProfile, curriculumSnapshot, sessionSnapshot, attempts]);

  const snapshot = buildResult.snapshot;
  const error = submissionError ?? buildResult.error;

  const submitAnswer = useCallback((questionId: string, answer: string) => {
    if (!snapshot) return;

    const question = snapshot.questions.find((item) => item.id === questionId);
    if (!question) {
      setErrorState({ conceptId, message: "پرسیارەکە نەدۆزرایەوە." });
      return;
    }

    try {
      const evaluation = PracticeModeEngine.evaluatePracticeAnswer(question, answer);
      const newAttempt: PracticeAttempt = {
        questionId,
        studentAnswer: answer,
        isCorrect: evaluation.isCorrect,
        submittedAt: new Date().toISOString(),
      };

      const updatedAttempts = [
        ...attempts.filter((attempt) => attempt.questionId !== questionId),
        newAttempt,
      ];
      setAttemptState({ conceptId, attempts: updatedAttempts });
      setErrorState({ conceptId, message: null });

      try {
        const eventBus = DomainEventBus.getInstance();
        const submittedEvent = DomainEventFactory.createEvent(
          "ANSWER_SUBMITTED",
          studentProfile.id,
          "student-portal",
          {
            questionId,
            studentAnswer: answer,
            conceptId,
          },
          {
            nodeId: conceptId,
            sessionId,
            subject: studentProfile.activeSubject,
            grade: studentProfile.grade,
            stream: studentProfile.stream,
          },
        );
        void eventBus.publish(submittedEvent);
      } catch {
        // Domain-event telemetry must never break the learning interaction.
      }

      try {
        const eventBus = DomainEventBus.getInstance();
        const evaluatedEvent = DomainEventFactory.createEvent(
          "ANSWER_EVALUATED",
          studentProfile.id,
          "ai-tutor",
          {
            questionId,
            isCorrect: evaluation.isCorrect,
            score: evaluation.isCorrect ? 100 : 0,
            feedbackKu: evaluation.feedback,
          },
          {
            nodeId: conceptId,
            sessionId,
            subject: studentProfile.activeSubject,
            grade: studentProfile.grade,
            stream: studentProfile.stream,
          },
        );
        void eventBus.publish(evaluatedEvent);
      } catch {
        // Domain-event telemetry must never break the learning interaction.
      }

      const attemptMap = new Map(
        updatedAttempts.map((attempt) => [attempt.questionId, attempt]),
      );
      const completedAll = snapshot.questions.every((item) => attemptMap.has(item.id));

      if (completedAll) {
        const correctCount = snapshot.questions.filter(
          (item) => attemptMap.get(item.id)?.isCorrect,
        ).length;
        const score = snapshot.questions.length > 0
          ? (correctCount / snapshot.questions.length) * 100
          : 0;

        if (score >= 70) {
          try {
            const eventBus = DomainEventBus.getInstance();
            const completedEvent = DomainEventFactory.createEvent(
              "CONCEPT_COMPLETED",
              studentProfile.id,
              "ai-tutor",
              { conceptId, sessionId },
              {
                nodeId: conceptId,
                sessionId,
                subject: studentProfile.activeSubject,
                grade: studentProfile.grade,
                stream: studentProfile.stream,
              },
            );
            void eventBus.publish(completedEvent);
          } catch {
            // Domain-event telemetry must never break the learning interaction.
          }
        }
      }
    } catch {
      setErrorState({
        conceptId,
        message: "کێشەیەک لە پێشکەشکردنی وەڵامدا ڕوویدا.",
      });
    }
  }, [attempts, conceptId, sessionId, snapshot, studentProfile]);

  const resetPractice = useCallback(() => {
    setAttemptState({ conceptId, attempts: [] });
    setErrorState({ conceptId, message: null });
  }, [conceptId]);

  const isCompleted = useMemo(() => {
    if (!snapshot || snapshot.questions.length === 0) return false;
    if (attempts.length < snapshot.questions.length) return false;

    const correctCount = attempts.filter((attempt) => attempt.isCorrect).length;
    return (correctCount / snapshot.questions.length) * 100 >= 70;
  }, [snapshot, attempts]);

  return {
    snapshot,
    submitAnswer,
    resetPractice,
    isCompleted,
    error,
  };
}
