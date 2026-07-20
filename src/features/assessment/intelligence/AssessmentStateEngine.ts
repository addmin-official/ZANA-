import {
  AssessmentSession,
  AssessmentQuestion,
  AssessmentAnswer,
  AssessmentMode,
} from "./assessmentTypes.ts";
import { generateAssessmentQuestions, QuestionEngineInput } from "./AssessmentQuestionEngine.ts";
import { evaluateAnswer } from "./AssessmentEvaluationEngine.ts";
import { calculateAssessmentScore } from "./AssessmentScoringEngine.ts";
import { generateAssessmentRecommendation } from "./AssessmentRecommendationEngine.ts";
import { AssessmentEventBridge } from "./AssessmentEventBridge.ts";

export interface StartAssessmentInput {
  studentId: string;
  mode: AssessmentMode;
  grade: string;
  stream: string;
  subject: string;
  level: string;
  activeConceptId?: string;
  activeConceptTitle?: string;
  activeLessonId?: string;
  activeLessonTitle?: string;
}

/**
 * AssessmentStateEngine: Responsible for orchestrating the lifecycle transitions
 * of an assessment session. This contains pure functions that return updated states
 * and triggers event emissions via the AssessmentEventBridge.
 */
export const AssessmentStateEngine = {
  /**
   * Starts a new assessment session and emits an event.
   */
  startAssessment(input: StartAssessmentInput): AssessmentSession {
    const questionsInput: QuestionEngineInput = {
      studentId: input.studentId,
      grade: input.grade,
      stream: input.stream,
      subject: input.subject,
      level: input.level,
      activeConceptId: input.activeConceptId,
      activeConceptTitle: input.activeConceptTitle,
      activeLessonId: input.activeLessonId,
      activeLessonTitle: input.activeLessonTitle,
    };

    const questions = generateAssessmentQuestions(questionsInput);
    const id = `sess_${Math.random().toString(36).substring(7)}`;

    const session: AssessmentSession = {
      id,
      studentId: input.studentId,
      mode: input.mode,
      grade: input.grade,
      stream: input.stream,
      subject: input.subject,
      currentQuestionIndex: 0, // 0-indexed for questions array access
      totalQuestions: questions.length,
      questions,
      answers: [],
      startedAt: new Date().toISOString(),
      scorePercentage: 0,
      completed: false,
      weakConceptIds: [],
      strongConceptIds: [],
      recommendedNextAction: "continue_learning",
      authoritative: false,
    };

    // Emit event
    AssessmentEventBridge.emitAssessmentStarted(
      input.studentId,
      id,
      input.mode,
      questions.length,
      { grade: input.grade, stream: input.stream, subject: input.subject }
    );

    return session;
  },

  /**
   * Submits an answer for the current question. Evaluates it, adds it to answers,
   * and fires relevant events.
   */
  submitAnswer(
    session: AssessmentSession,
    questionId: string,
    answerText: string
  ): { updatedSession: AssessmentSession; isCorrect: boolean; feedback: string } {
    const question = session.questions.find(q => q.id === questionId);
    if (!question) {
      throw new Error("پرسیار نەدۆزرایەوە لەناو ئەم تاقیکردنەوەیەدا.");
    }

    // Evaluate answer
    const evalResult = evaluateAnswer(question, answerText);

    const answerRecord: AssessmentAnswer = {
      questionId,
      answer: answerText,
      isCorrect: evalResult.isCorrect,
      feedback: evalResult.feedback,
      answeredAt: new Date().toISOString(),
    };

    // Append new answer
    const updatedAnswers = [...session.answers, answerRecord];

    // Emit events
    AssessmentEventBridge.emitAnswerSubmitted(
      session.studentId,
      questionId,
      answerText,
      question.conceptId || "unknown",
      { subject: session.subject }
    );

    AssessmentEventBridge.emitAnswerEvaluated(
      session.studentId,
      questionId,
      evalResult.isCorrect,
      evalResult.isCorrect ? 1 : 0,
      evalResult.feedback,
      { subject: session.subject }
    );

    // If answer is incorrect, detect temporary weakness
    if (!evalResult.isCorrect && question.conceptId) {
      AssessmentEventBridge.emitWeaknessDetected(
        session.studentId,
        question.conceptId,
        1,
        "medium",
        { subject: session.subject }
      );
    }

    const updatedSession: AssessmentSession = {
      ...session,
      answers: updatedAnswers,
    };

    return {
      updatedSession,
      isCorrect: evalResult.isCorrect,
      feedback: evalResult.feedback,
    };
  },

  /**
   * Move index to next question.
   */
  moveNext(session: AssessmentSession): AssessmentSession {
    const nextIdx = session.currentQuestionIndex + 1;
    return {
      ...session,
      currentQuestionIndex: Math.min(nextIdx, session.totalQuestions - 1),
    };
  },

  /**
   * Finishes the assessment session, calculates the score, determines concepts
   * to recommend, and fires events.
   */
  finishAssessment(session: AssessmentSession): AssessmentSession {
    const scoreResult = calculateAssessmentScore(session.questions, session.answers);
    const recommendation = generateAssessmentRecommendation(scoreResult.scorePercentage);

    const completedSession: AssessmentSession = {
      ...session,
      completed: true,
      completedAt: new Date().toISOString(),
      scorePercentage: scoreResult.scorePercentage,
      weakConceptIds: scoreResult.weakConceptIds,
      strongConceptIds: scoreResult.strongConceptIds,
      recommendedNextAction: recommendation.nextAction,
    };

    // Emit event
    AssessmentEventBridge.emitAssessmentFinished(
      session.studentId,
      session.id,
      scoreResult.totalCorrect,
      session.totalQuestions,
      scoreResult.scorePercentage,
      { subject: session.subject }
    );

    // Emit updates for concepts mastered
    scoreResult.strongConceptIds.forEach(cid => {
      AssessmentEventBridge.emitMasteryUpdated(
        session.studentId,
        cid,
        50, // simulated old value
        100, // fully mastered
        "mastered",
        { subject: session.subject }
      );
      AssessmentEventBridge.emitConfidenceUpdated(
        session.studentId,
        cid,
        50,
        100,
        { subject: session.subject }
      );
    });

    // Emit updates for concepts weak
    scoreResult.weakConceptIds.forEach(cid => {
      AssessmentEventBridge.emitWeaknessDetected(
        session.studentId,
        cid,
        3, // high number of wrong attempts
        "high",
        { subject: session.subject }
      );
    });

    return completedSession;
  },
};
