import { DomainEventBus } from "../../../domain/DomainEventBus.ts";
import { DomainEventFactory } from "../../../domain/DomainEventFactory.ts";
import { EventMetadata } from "../../../domain/types.ts";

/**
 * AssessmentEventBridge: Safely translates and emits ZANA assessment actions
 * to the core domain event-bus, preventing any app crash if the event system is not fully loaded.
 */
export class AssessmentEventBridge {
  private static getBus() {
    return DomainEventBus.getInstance();
  }

  public static emitAssessmentStarted(
    studentId: string,
    assessmentId: string,
    mode: string,
    totalQuestions: number,
    metadata?: EventMetadata
  ): void {
    try {
      const event = DomainEventFactory.createEvent(
        "ASSESSMENT_STARTED",
        studentId,
        "assessment-engine",
        {
          assessmentId,
          type: mode,
          totalQuestions,
        },
        metadata
      );
      this.getBus().publish(event).catch(err => {
        console.warn("Failed to publish ASSESSMENT_STARTED async:", err);
      });
    } catch (err) {
      console.warn("Could not emit ASSESSMENT_STARTED:", err);
    }
  }

  public static emitAnswerSubmitted(
    studentId: string,
    questionId: string,
    studentAnswer: string,
    conceptId: string,
    metadata?: EventMetadata
  ): void {
    try {
      const event = DomainEventFactory.createEvent(
        "ANSWER_SUBMITTED",
        studentId,
        "assessment-engine",
        {
          questionId,
          studentAnswer,
          conceptId,
        },
        metadata
      );
      this.getBus().publish(event).catch(err => {
        console.warn("Failed to publish ANSWER_SUBMITTED async:", err);
      });
    } catch (err) {
      console.warn("Could not emit ANSWER_SUBMITTED:", err);
    }
  }

  public static emitAnswerEvaluated(
    studentId: string,
    questionId: string,
    isCorrect: boolean,
    score: number,
    feedbackKu?: string,
    metadata?: EventMetadata
  ): void {
    try {
      const event = DomainEventFactory.createEvent(
        "ANSWER_EVALUATED",
        studentId,
        "assessment-engine",
        {
          questionId,
          isCorrect,
          score,
          feedbackKu,
        },
        metadata
      );
      this.getBus().publish(event).catch(err => {
        console.warn("Failed to publish ANSWER_EVALUATED async:", err);
      });
    } catch (err) {
      console.warn("Could not emit ANSWER_EVALUATED:", err);
    }
  }

  public static emitAssessmentFinished(
    studentId: string,
    assessmentId: string,
    correctAnswers: number,
    totalQuestions: number,
    score: number,
    metadata?: EventMetadata
  ): void {
    try {
      const event = DomainEventFactory.createEvent(
        "ASSESSMENT_FINISHED",
        studentId,
        "assessment-engine",
        {
          assessmentId,
          correctAnswers,
          totalQuestions,
          score,
        },
        metadata
      );
      this.getBus().publish(event).catch(err => {
        console.warn("Failed to publish ASSESSMENT_FINISHED async:", err);
      });
    } catch (err) {
      console.warn("Could not emit ASSESSMENT_FINISHED:", err);
    }
  }

  public static emitWeaknessDetected(
    studentId: string,
    conceptId: string,
    wrongAttemptsCount: number,
    priority: "low" | "medium" | "high",
    metadata?: EventMetadata
  ): void {
    try {
      const event = DomainEventFactory.createEvent(
        "WEAKNESS_DETECTED",
        studentId,
        "assessment-engine",
        {
          conceptId,
          wrongAttemptsCount,
          priority,
        },
        metadata
      );
      this.getBus().publish(event).catch(err => {
        console.warn("Failed to publish WEAKNESS_DETECTED async:", err);
      });
    } catch (err) {
      console.warn("Could not emit WEAKNESS_DETECTED:", err);
    }
  }

  public static emitMasteryUpdated(
    studentId: string,
    conceptId: string,
    oldValue: number,
    newValue: number,
    status: string,
    metadata?: EventMetadata
  ): void {
    try {
      const event = DomainEventFactory.createEvent(
        "MASTERY_UPDATED",
        studentId,
        "assessment-engine",
        {
          conceptId,
          oldValue,
          newValue,
          status,
        },
        metadata
      );
      this.getBus().publish(event).catch(err => {
        console.warn("Failed to publish MASTERY_UPDATED async:", err);
      });
    } catch (err) {
      console.warn("Could not emit MASTERY_UPDATED:", err);
    }
  }

  public static emitConfidenceUpdated(
    studentId: string,
    conceptId: string,
    oldScore: number,
    newScore: number,
    metadata?: EventMetadata
  ): void {
    try {
      const event = DomainEventFactory.createEvent(
        "CONFIDENCE_UPDATED",
        studentId,
        "assessment-engine",
        {
          conceptId,
          oldScore,
          newScore,
        },
        metadata
      );
      this.getBus().publish(event).catch(err => {
        console.warn("Failed to publish CONFIDENCE_UPDATED async:", err);
      });
    } catch (err) {
      console.warn("Could not emit CONFIDENCE_UPDATED:", err);
    }
  }
}
