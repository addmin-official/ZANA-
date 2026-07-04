import { DomainEvent, DomainEventType } from "./types.ts";
import { DomainClock } from "./DomainClock.ts";

export class DomainGuards {
  private static VALID_EVENT_TYPES: Set<DomainEventType> = new Set([
    "STUDENT_CREATED",
    "STUDENT_UPDATED",
    "SESSION_STARTED",
    "SESSION_PAUSED",
    "SESSION_RESUMED",
    "SESSION_FINISHED",
    "LESSON_STARTED",
    "LESSON_COMPLETED",
    "CONCEPT_STARTED",
    "CONCEPT_COMPLETED",
    "ANSWER_SUBMITTED",
    "ANSWER_EVALUATED",
    "ASSESSMENT_STARTED",
    "ASSESSMENT_FINISHED",
    "MASTERY_UPDATED",
    "CONFIDENCE_UPDATED",
    "WEAKNESS_DETECTED",
    "GOAL_CREATED",
    "GOAL_COMPLETED",
    "REPORT_GENERATED",
    "DAILY_SPARK_TRIGGERED",
  ]);

  /**
   * Performs rigorous validation of structural integrity and semantic requirements.
   */
  public static isValidEvent(event: unknown): event is DomainEvent {
    if (!event || typeof event !== "object") return false;

    const e = event as Record<string, unknown>;

    // 1. Validate ID
    if (typeof e.id !== "string" || e.id.trim() === "") return false;

    // 2. Validate Type
    if (typeof e.type !== "string" || !this.VALID_EVENT_TYPES.has(e.type as DomainEventType)) {
      return false;
    }

    // 3. Validate Student ID
    if (typeof e.studentId !== "string" || e.studentId.trim() === "") return false;

    // 4. Validate timestamp format
    if (typeof e.occurredAt !== "string" || !DomainClock.isValidIsoDate(e.occurredAt)) {
      return false;
    }

    // 5. Validate source
    if (typeof e.source !== "string" || e.source.trim() === "") return false;

    // 6. Validate payload existence
    if (typeof e.payload !== "object" || e.payload === null) return false;

    // 7. Event-specific payload validation
    return this.validatePayload(e.type as DomainEventType, e.payload as Record<string, unknown>);
  }

  private static validatePayload(type: DomainEventType, payload: Record<string, unknown>): boolean {
    switch (type) {
      case "STUDENT_CREATED":
        return typeof payload.name === "string" && typeof payload.grade === "string";
      case "SESSION_STARTED":
        return (
          typeof payload.sessionId === "string" &&
          typeof payload.grade === "string" &&
          typeof payload.subject === "string"
        );
      case "SESSION_FINISHED":
        return typeof payload.sessionId === "string" && Array.isArray(payload.completedNodeIds);
      case "LESSON_COMPLETED":
        return typeof payload.lessonId === "string";
      case "CONCEPT_COMPLETED":
        return typeof payload.conceptId === "string";
      case "ANSWER_SUBMITTED":
        return typeof payload.questionId === "string" && typeof payload.studentAnswer === "string";
      case "ANSWER_EVALUATED":
        return typeof payload.questionId === "string" && typeof payload.isCorrect === "boolean";
      case "ASSESSMENT_FINISHED":
        return typeof payload.assessmentId === "string" && typeof payload.score === "number";
      case "MASTERY_UPDATED":
        return typeof payload.conceptId === "string" && typeof payload.newValue === "number";
      default:
        // By default, if it's a valid object, we allow it (forward compatibility)
        return true;
    }
  }
}
