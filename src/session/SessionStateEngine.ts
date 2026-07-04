import { StudentSession, LearningMode, SessionGoal } from "./types.ts";
import { CurriculumGrade, CurriculumStream, CurriculumSubject } from "../curriculum/types.ts";

export class SessionStateEngine {
  private currentSession: StudentSession | null = null;
  private isPaused: boolean = false;
  private pauseTimestamp: string | null = null;

  public startSession(
    studentId: string,
    grade: CurriculumGrade,
    stream: CurriculumStream,
    subject: CurriculumSubject,
    initialNodeId: string,
    initialLessonId: string,
    initialConceptId: string,
    mode: LearningMode,
    completedNodeIds: string[] = [],
    reviewQueue: string[] = [],
    practiceQueue: string[] = [],
    goal?: Partial<SessionGoal>
  ): StudentSession {
    const nowStr = new Date().toISOString();
    
    const defaultGoal: SessionGoal = {
      targetMinutes: goal?.targetMinutes ?? 30,
      currentMinutes: goal?.currentMinutes ?? 0,
      targetConcepts: goal?.targetConcepts ?? 5,
      currentConcepts: goal?.currentConcepts ?? 0,
      targetLessons: goal?.targetLessons ?? 2,
      currentLessons: goal?.currentLessons ?? 0,
      isCompleted: goal?.isCompleted ?? false
    };

    this.currentSession = {
      id: `sess_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
      studentId,
      grade,
      stream,
      subject,
      currentNodeId: initialNodeId,
      currentLessonId: initialLessonId,
      currentConceptId: initialConceptId,
      currentMode: mode,
      startedAt: nowStr,
      lastActivity: nowStr,
      estimatedRemainingMinutes: 120, // Initial estimate
      completionPercentage: 0,
      completedNodeIds: [...completedNodeIds],
      reviewQueue: [...reviewQueue],
      practiceQueue: [...practiceQueue],
      dailyGoal: defaultGoal
    };

    this.isPaused = false;
    this.pauseTimestamp = null;

    return { ...this.currentSession };
  }

  public getSession(): StudentSession | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  public setSession(session: StudentSession): void {
    this.currentSession = { ...session };
  }

  public resumeSession(session: StudentSession): StudentSession {
    this.currentSession = {
      ...session,
      lastActivity: new Date().toISOString()
    };
    this.isPaused = false;
    this.pauseTimestamp = null;
    return { ...this.currentSession };
  }

  public pauseSession(): StudentSession | null {
    if (!this.currentSession) return null;
    this.isPaused = true;
    this.pauseTimestamp = new Date().toISOString();
    this.currentSession.lastActivity = this.pauseTimestamp;
    return { ...this.currentSession };
  }

  public finishSession(): StudentSession | null {
    if (!this.currentSession) return null;
    const nowStr = new Date().toISOString();
    this.currentSession.lastActivity = nowStr;
    const finished = { ...this.currentSession };
    this.currentSession = null;
    this.isPaused = false;
    this.pauseTimestamp = null;
    return finished;
  }

  public switchMode(mode: LearningMode): StudentSession | null {
    if (!this.currentSession) return null;
    this.currentSession.currentMode = mode;
    this.currentSession.lastActivity = new Date().toISOString();
    return { ...this.currentSession };
  }

  public updateProgress(completedNodeIds: string[], completionPercentage: number, remainingMinutes: number): StudentSession | null {
    if (!this.currentSession) return null;
    this.currentSession.completedNodeIds = [...completedNodeIds];
    this.currentSession.completionPercentage = completionPercentage;
    this.currentSession.estimatedRemainingMinutes = remainingMinutes;
    this.currentSession.lastActivity = new Date().toISOString();
    return { ...this.currentSession };
  }

  public updateLesson(lessonId: string, nodeId: string): StudentSession | null {
    if (!this.currentSession) return null;
    this.currentSession.currentLessonId = lessonId;
    this.currentSession.currentNodeId = nodeId;
    this.currentSession.lastActivity = new Date().toISOString();
    return { ...this.currentSession };
  }

  public updateConcept(conceptId: string, nodeId: string): StudentSession | null {
    if (!this.currentSession) return null;
    this.currentSession.currentConceptId = conceptId;
    this.currentSession.currentNodeId = nodeId;
    this.currentSession.lastActivity = new Date().toISOString();
    return { ...this.currentSession };
  }

  public moveNext(nextNodeId: string, type: "lesson" | "concept"): StudentSession | null {
    if (!this.currentSession) return null;
    this.currentSession.currentNodeId = nextNodeId;
    if (type === "lesson") {
      this.currentSession.currentLessonId = nextNodeId;
    } else {
      this.currentSession.currentConceptId = nextNodeId;
    }
    this.currentSession.lastActivity = new Date().toISOString();
    return { ...this.currentSession };
  }

  public movePrevious(prevNodeId: string, type: "lesson" | "concept"): StudentSession | null {
    if (!this.currentSession) return null;
    this.currentSession.currentNodeId = prevNodeId;
    if (type === "lesson") {
      this.currentSession.currentLessonId = prevNodeId;
    } else {
      this.currentSession.currentConceptId = prevNodeId;
    }
    this.currentSession.lastActivity = new Date().toISOString();
    return { ...this.currentSession };
  }

  public isSessionPaused(): boolean {
    return this.isPaused;
  }
}
