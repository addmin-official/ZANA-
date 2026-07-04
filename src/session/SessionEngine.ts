import { StudentSession, LearningMode, SessionGoal } from "./types.ts";
import { SessionStateEngine } from "./SessionStateEngine.ts";
import { CurriculumNode } from "../curriculum/types.ts";

export class SessionEngine {
  private stateEngine: SessionStateEngine;

  constructor() {
    this.stateEngine = new SessionStateEngine();
  }

  public getActiveSession(): StudentSession | null {
    return this.stateEngine.getSession();
  }

  public startNewSession(
    studentId: string,
    grade: "9" | "10" | "11" | "12",
    stream: "scientific" | "literary" | "general",
    subject: "math" | "physics" | "chemistry" | "english",
    initialNodeId: string,
    initialLessonId: string,
    initialConceptId: string,
    mode: LearningMode,
    completedNodeIds: string[] = [],
    reviewQueue: string[] = [],
    practiceQueue: string[] = [],
    goal?: Partial<SessionGoal>
  ): StudentSession {
    return this.stateEngine.startSession(
      studentId,
      grade,
      stream,
      subject,
      initialNodeId,
      initialLessonId,
      initialConceptId,
      mode,
      completedNodeIds,
      reviewQueue,
      practiceQueue,
      goal
    );
  }

  public resumeExistingSession(session: StudentSession): StudentSession {
    return this.stateEngine.resumeSession(session);
  }

  public pauseActiveSession(): StudentSession | null {
    return this.stateEngine.pauseSession();
  }

  public finishActiveSession(): StudentSession | null {
    return this.stateEngine.finishSession();
  }

  public switchMode(mode: LearningMode): StudentSession | null {
    return this.stateEngine.switchMode(mode);
  }

  public addToReviewQueue(nodeId: string): StudentSession | null {
    const session = this.getActiveSession();
    if (!session) return null;

    if (!session.reviewQueue.includes(nodeId)) {
      session.reviewQueue.push(nodeId);
      this.stateEngine.setSession(session);
    }
    return { ...session };
  }

  public removeFromReviewQueue(nodeId: string): StudentSession | null {
    const session = this.getActiveSession();
    if (!session) return null;

    session.reviewQueue = session.reviewQueue.filter(id => id !== nodeId);
    this.stateEngine.setSession(session);
    return { ...session };
  }

  public addToPracticeQueue(nodeId: string): StudentSession | null {
    const session = this.getActiveSession();
    if (!session) return null;

    if (!session.practiceQueue.includes(nodeId)) {
      session.practiceQueue.push(nodeId);
      this.stateEngine.setSession(session);
    }
    return { ...session };
  }

  public removeFromPracticeQueue(nodeId: string): StudentSession | null {
    const session = this.getActiveSession();
    if (!session) return null;

    session.practiceQueue = session.practiceQueue.filter(id => id !== nodeId);
    this.stateEngine.setSession(session);
    return { ...session };
  }

  public completeNode(nodeId: string): StudentSession | null {
    const session = this.getActiveSession();
    if (!session) return null;

    if (!session.completedNodeIds.includes(nodeId)) {
      session.completedNodeIds.push(nodeId);
      this.stateEngine.setSession(session);
    }
    return { ...session };
  }

  public navigateToNode(nodeId: string, nodeType: "lesson" | "concept"): StudentSession | null {
    if (nodeType === "lesson") {
      return this.stateEngine.updateLesson(nodeId, nodeId);
    } else {
      return this.stateEngine.updateConcept(nodeId, nodeId);
    }
  }
}
export const sessionEngineInstance = new SessionEngine();
