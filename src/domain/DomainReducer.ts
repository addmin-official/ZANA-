import { DomainEvent, DerivedDomainState } from "./types.ts";

export class DomainReducer {
  /**
   * Reduces an array of DomainEvents into a unified snapshot of derived state.
   */
  public static reduceEvents(events: DomainEvent[], studentId?: string): DerivedDomainState {
    const filteredEvents = studentId
      ? events.filter(event => event.studentId === studentId)
      : events;

    const state: DerivedDomainState = {
      studentActivityCount: 0,
      completedLessons: [],
      completedConcepts: [],
      assessmentCount: 0,
      reportCount: 0,
      lastActiveTime: null,
      currentSubject: null,
      currentSessionId: null
    };

    // Sort events chronologically to process states correctly
    const sortedEvents = [...filteredEvents].sort((a, b) =>
      a.occurredAt.localeCompare(b.occurredAt)
    );

    for (const event of sortedEvents) {
      state.studentActivityCount += 1;
      state.lastActiveTime = event.occurredAt;

      // Extract subject/session metadata from event metadata if present
      if (event.metadata) {
        if (event.metadata.subject) {
          state.currentSubject = event.metadata.subject;
        }
        if (event.metadata.sessionId) {
          state.currentSessionId = event.metadata.sessionId;
        }
      }

      switch (event.type) {
        case "SESSION_STARTED": {
          const payload = event.payload as import("./types.ts").SessionStartedPayload;
          state.currentSessionId = payload.sessionId;
          state.currentSubject = payload.subject;
          break;
        }
        case "SESSION_FINISHED": {
          state.currentSessionId = null;
          break;
        }
        case "LESSON_COMPLETED": {
          const payload = event.payload as import("./types.ts").LessonCompletedPayload;
          if (payload.lessonId && !state.completedLessons.includes(payload.lessonId)) {
            state.completedLessons.push(payload.lessonId);
          }
          break;
        }
        case "CONCEPT_COMPLETED": {
          const payload = event.payload as import("./types.ts").ConceptCompletedPayload;
          if (payload.conceptId && !state.completedConcepts.includes(payload.conceptId)) {
            state.completedConcepts.push(payload.conceptId);
          }
          break;
        }
        case "ASSESSMENT_FINISHED": {
          state.assessmentCount += 1;
          break;
        }
        case "REPORT_GENERATED": {
          state.reportCount += 1;
          break;
        }
        default:
          break;
      }
    }

    return state;
  }
}
