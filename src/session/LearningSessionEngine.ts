import { StudentProfile } from "../features/student/studentTypes.ts";
import { StudentIntelligenceSnapshot } from "../intelligence/types.ts";
import { CurriculumIntelligenceSnapshot } from "../curriculum/types.ts";
import {
  StudentSession,
  SessionSnapshot,
  SessionTimelineEvent,
  SessionAnalyticsSummary,
  LearningMode
} from "./types.ts";
import { SessionEngine } from "./SessionEngine.ts";
import { SessionHistoryEngine } from "./SessionHistoryEngine.ts";
import { SessionProgressEngine } from "./SessionProgressEngine.ts";
import { SessionGoalEngine } from "./SessionGoalEngine.ts";
import { SessionResumeEngine } from "./SessionResumeEngine.ts";
import { SessionTimelineEngine } from "./SessionTimelineEngine.ts";
import { SessionScheduler } from "./SessionScheduler.ts";
import { SessionAnalytics } from "./SessionAnalytics.ts";

export class LearningSessionEngine {
  private sessionEngine: SessionEngine;
  private historyEngine: SessionHistoryEngine;
  private progressEngine: SessionProgressEngine;
  private goalEngine: SessionGoalEngine;
  private resumeEngine: SessionResumeEngine;
  private timelineEngine: SessionTimelineEngine;
  private scheduler: SessionScheduler;
  private analyticsEngine: SessionAnalytics;

  // Stored snapshots/inputs for calculations
  private activeStudent: StudentProfile | null = null;
  private currentSip: StudentIntelligenceSnapshot | null = null;
  private currentCip: CurriculumIntelligenceSnapshot | null = null;

  constructor() {
    this.sessionEngine = new SessionEngine();
    this.historyEngine = new SessionHistoryEngine();
    this.progressEngine = new SessionProgressEngine();
    this.goalEngine = new SessionGoalEngine();
    this.resumeEngine = new SessionResumeEngine();
    this.timelineEngine = new SessionTimelineEngine();
    this.scheduler = new SessionScheduler();
    this.analyticsEngine = new SessionAnalytics();
  }

  /**
   * Initializes or returns the current active session.
   * Leverages the resume engine if no session is active.
   */
  public initializeOrResume(
    student: StudentProfile,
    sip: StudentIntelligenceSnapshot,
    cip: CurriculumIntelligenceSnapshot
  ): SessionSnapshot {
    this.activeStudent = student;
    this.currentSip = sip;
    this.currentCip = cip;

    let session = this.sessionEngine.getActiveSession();

    if (!session) {
      // Attempt to load from resume engine
      const saved = this.resumeEngine.getResumeState(student.id);
      if (saved && saved.subject === student.activeSubject) {
        session = this.sessionEngine.resumeExistingSession(saved);
        this.timelineEngine.generateStandardEvent("StartedLearning", cip.resolution.subjectLabel, "پێشتر");
      } else {
        // Find first recommended or default node
        const initialNodeId = cip.learningPath.nextRecommendedNodeId || cip.learningPath.orderedNodeIds[0] || "root";
        
        // Find parent structures
        const availableNodes = cip.resolution.availableNodes;
        const currentNode = availableNodes.find(n => n.id === initialNodeId);
        const lessonId = currentNode?.parentId || initialNodeId;
        const conceptId = initialNodeId;

        session = this.sessionEngine.startNewSession(
          student.id,
          student.grade,
          student.stream,
          student.activeSubject,
          initialNodeId,
          lessonId,
          conceptId,
          "learn",
          sip.graph.completedNodeIds ? Array.from(sip.graph.completedNodeIds) : [],
          [],
          [],
          {
            targetMinutes: 30,
            currentMinutes: sip.habits.totalSessions > 0 ? Math.round(sip.habits.averageSessionLengthSeconds / 60) : 0,
            targetConcepts: 5,
            currentConcepts: sip.graph.completedNodeIds ? sip.graph.completedNodeIds.size : 0,
            targetLessons: 2,
            currentLessons: 0,
            isCompleted: false
          }
        );

        this.timelineEngine.generateStandardEvent("StartedLearning", cip.resolution.subjectLabel, currentNode?.title || "بەشێکی نوێ");
      }
    }

    // Refresh analytics & streak
    this.goalEngine.setGoal(session.dailyGoal);
    
    return this.generateSnapshot();
  }

  /**
   * Primary action dispatcher: student transitions, completes nodes, spends time.
   */
  public registerActivity(
    nodeId: string,
    mode: LearningMode,
    isCompleted: boolean,
    durationSeconds: number
  ): SessionSnapshot {
    const session = this.sessionEngine.getActiveSession();
    if (!session) {
      throw new Error("No active session initialized. Call initializeOrResume first.");
    }

    const availableNodes = this.currentCip?.resolution.availableNodes || [];
    const currentNode = availableNodes.find(n => n.id === nodeId);
    const subjectLabel = this.currentCip?.resolution.subjectLabel || "زانست";

    // 1. Log History Event
    const nodeType = currentNode?.type || "concept";
    const histType = isCompleted ? "node_completed" : "progress_updated";
    
    this.historyEngine.recordEvent(
      session.id,
      histType,
      nodeId,
      session.currentLessonId,
      session.currentConceptId,
      durationSeconds,
      `Studied for ${durationSeconds}s in mode: ${mode}`
    );

    // 2. Track Study Time/Goal Updates
    const studyMinutes = durationSeconds / 60;
    const updatedGoal = this.goalEngine.registerStudyMinutes(studyMinutes);

    // 3. Mark Node as Completed if applicable
    if (isCompleted) {
      this.sessionEngine.completeNode(nodeId);
      
      if (nodeType === "concept") {
        this.goalEngine.registerConceptCompleted();
        this.timelineEngine.generateStandardEvent("CompletedConcept", subjectLabel, currentNode?.title || nodeId);
        
        // Auto-schedule review for difficult concepts
        if (currentNode?.difficulty === "advanced" || currentNode?.difficulty === "exam_level") {
          const runDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 1 day later
          this.scheduler.scheduleTask(
            "review",
            runDate,
            nodeId,
            `پێویستت بە پێداچوونەوەیە بۆ بابەتە ئاڵۆزەکەی "${currentNode.title}"`
          );
        }
      } else if (nodeType === "lesson") {
        this.goalEngine.registerLessonCompleted();
        this.timelineEngine.generateStandardEvent("CompletedLesson", subjectLabel, currentNode?.title || nodeId);
        
        // Auto-schedule a rest reminder and revision task
        const restDate = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins later
        this.scheduler.scheduleTask(
          "rest_reminder",
          restDate,
          nodeId,
          "پشوویەکی کورت بدە بۆ حەسانەوەی مێشکت!"
        );
      }
    }

    // 4. Update core state fields
    session.currentMode = mode;
    session.dailyGoal = updatedGoal;
    session.lastActivity = new Date().toISOString();

    // Recalculate progress metrics
    const completedSet = new Set(session.completedNodeIds);
    const overallPct = this.progressEngine.calculateOverallPercentage(availableNodes, completedSet);
    const remainingMins = this.progressEngine.calculateEstimatedRemainingMinutes(availableNodes, completedSet);

    session.completionPercentage = overallPct;
    session.estimatedRemainingMinutes = remainingMins;

    // Persist session state changes
    this.resumeEngine.saveResumeState(session);

    // If Daily goal just reached, trigger Timeline Event
    if (updatedGoal.isCompleted && !session.dailyGoal.isCompleted) {
      this.timelineEngine.generateStandardEvent("GoalReached", subjectLabel, "");
    }

    return this.generateSnapshot();
  }

  /**
   * Switch Active Mode (e.g. from learn to practice or review)
   */
  public switchMode(mode: LearningMode): SessionSnapshot {
    const session = this.sessionEngine.switchMode(mode);
    if (session) {
      this.historyEngine.recordEvent(
        session.id,
        "mode_switched",
        session.currentNodeId,
        session.currentLessonId,
        session.currentConceptId,
        0,
        `Switched learning mode to: ${mode}`
      );
      
      const subjectLabel = this.currentCip?.resolution.subjectLabel || "وانە";
      const availableNodes = this.currentCip?.resolution.availableNodes || [];
      const currentNode = availableNodes.find(n => n.id === session.currentNodeId);

      if (mode === "practice") {
        this.timelineEngine.generateStandardEvent("Practice", subjectLabel, currentNode?.title || "");
      } else if (mode === "review") {
        this.timelineEngine.generateStandardEvent("Review", subjectLabel, currentNode?.title || "");
      }

      this.resumeEngine.saveResumeState(session);
    }
    return this.generateSnapshot();
  }

  /**
   * Pause Active Session
   */
  public pauseSession(): SessionSnapshot {
    const session = this.sessionEngine.pauseActiveSession();
    if (session) {
      this.historyEngine.recordEvent(
        session.id,
        "session_paused",
        session.currentNodeId,
        session.currentLessonId,
        session.currentConceptId,
        0,
        "Session paused by student"
      );
    }
    return this.generateSnapshot();
  }

  /**
   * Finish Active Session
   */
  public finishSession(): SessionSnapshot {
    const session = this.sessionEngine.finishActiveSession();
    if (session) {
      this.historyEngine.recordEvent(
        session.id,
        "session_finished",
        session.currentNodeId,
        session.currentLessonId,
        session.currentConceptId,
        0,
        "Session finished successfully"
      );
      if (this.activeStudent) {
        this.resumeEngine.clearResumeState(this.activeStudent.id);
      }
    }
    return this.generateSnapshot();
  }

  /**
   * Generates a fully integrated SessionSnapshot
   */
  public generateSnapshot(): SessionSnapshot {
    const session = this.sessionEngine.getActiveSession();
    const history = this.historyEngine.getHistory();
    const timeline = this.timelineEngine.getTimeline();
    const streak = this.currentSip?.goals.currentStreak ?? 0;

    const analytics = this.analyticsEngine.generateSummary(
      history,
      session?.completionPercentage ?? 0,
      streak
    );

    return {
      currentSession: session,
      timeline,
      analytics,
      nextRecommendation: this.currentCip?.learningPath.nextRecommendedNodeId
    };
  }

  // Getters for specific subsystems
  public getScheduler(): SessionScheduler {
    return this.scheduler;
  }

  public getHistoryEngine(): SessionHistoryEngine {
    return this.historyEngine;
  }
}

export const learningSessionEngineInstance = new LearningSessionEngine();
