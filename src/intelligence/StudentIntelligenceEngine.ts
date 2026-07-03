import { StudentProfile } from "../features/student/studentTypes.ts";
import { StudentIntelligenceSnapshot, ExplanationStyle, MasteryStatus } from "./types.ts";
import { StudentIdentityEngine } from "./StudentIdentityEngine.ts";
import { LearningDNAEngine } from "./LearningDNAEngine.ts";
import { KnowledgeGraphEngine } from "./KnowledgeGraphEngine.ts";
import { WeaknessEngine } from "./WeaknessEngine.ts";
import { MasteryEngine } from "./MasteryEngine.ts";
import { ConfidenceEngine } from "./ConfidenceEngine.ts";
import { GoalEngine } from "./GoalEngine.ts";
import { HabitEngine } from "./HabitEngine.ts";
import { RecommendationEngine } from "./RecommendationEngine.ts";
import { TimelineEngine } from "./TimelineEngine.ts";
import { AnalyticsEngine } from "./AnalyticsEngine.ts";

export class StudentIntelligenceEngine {
  private static instance: StudentIntelligenceEngine | null = null;

  private identityEngine: StudentIdentityEngine;
  private dnaEngine: LearningDNAEngine;
  private graphEngine: KnowledgeGraphEngine;
  private weaknessEngine: WeaknessEngine;
  private masteryEngine: MasteryEngine;
  private confidenceEngine: ConfidenceEngine;
  private goalEngine: GoalEngine;
  private habitEngine: HabitEngine;
  private recommendationEngine: RecommendationEngine;
  private timelineEngine: TimelineEngine;
  private analyticsEngine: AnalyticsEngine;

  constructor(profile: StudentProfile) {
    this.identityEngine = new StudentIdentityEngine(profile);
    this.dnaEngine = new LearningDNAEngine();
    this.graphEngine = new KnowledgeGraphEngine();
    this.weaknessEngine = new WeaknessEngine();
    this.masteryEngine = new MasteryEngine();
    this.confidenceEngine = new ConfidenceEngine();
    this.goalEngine = new GoalEngine();
    this.habitEngine = new HabitEngine();
    this.recommendationEngine = new RecommendationEngine();
    this.timelineEngine = new TimelineEngine();
    this.analyticsEngine = new AnalyticsEngine();
  }

  // Singleton accessor helper for active runtime instance
  public static getInstance(profile: StudentProfile): StudentIntelligenceEngine {
    if (!StudentIntelligenceEngine.instance) {
      StudentIntelligenceEngine.instance = new StudentIntelligenceEngine(profile);
    } else {
      // Sync identity automatically with latest profile updates
      StudentIntelligenceEngine.instance.identityEngine.updateProfile(profile);
    }
    return StudentIntelligenceEngine.instance;
  }

  // Generate full Student Intelligence Platform Snapshot
  public getSnapshot(): StudentIntelligenceSnapshot {
    const identity = this.identityEngine.getSnapshot();
    const dna = this.dnaEngine.getSnapshot();
    const graph = this.graphEngine.getSnapshot();
    const weaknesses = this.weaknessEngine.getSnapshot();
    const mastery = this.masteryEngine.getSnapshot();
    const confidence = this.confidenceEngine.getSnapshot();
    const goals = this.goalEngine.getSnapshot();
    const habits = this.habitEngine.getSnapshot();
    const timeline = this.timelineEngine.getSnapshot();

    // Dynamically regenerate recommendations based on active states
    const recommendations = this.recommendationEngine.generateRecommendations(
      weaknesses,
      mastery,
      identity.activeSubject
    );

    // Recompute analytics from real active states
    const analytics = this.analyticsEngine.calculateAnalytics(
      graph,
      mastery,
      confidence,
      habits,
      goals
    );

    return {
      identity,
      dna,
      graph,
      weaknesses,
      mastery,
      confidence,
      goals,
      habits,
      recommendations,
      timeline,
      analytics
    };
  }

  // Interaction Methods to write / transition states

  public completeLearningNode(nodeId: string, nodeLabelKu: string): void {
    const isCompletedBefore = this.graphEngine.getSnapshot().completedNodeIds.has(nodeId);
    this.graphEngine.completeNode(nodeId);

    // Record timeline achievement if newly completed
    if (!isCompletedBefore) {
      this.timelineEngine.recordEvent(
        "LessonFinished",
        "تەواوکردنی وانە یان بابەت",
        `بەتەواوی فێربووی لەسەر: "${nodeLabelKu}"`
      );

      // Advance daily/weekly progress
      this.goalEngine.registerProgress("goal_weekly_sessions", 1);
    }
  }

  public recordExerciseAttempt(conceptId: string, conceptLabelKu: string, isCorrect: boolean): void {
    // 1. Update DNA metrics
    this.dnaEngine.recordInteraction(120, isCorrect ? 1 : 0, 1); // Mock 2 min duration
    
    // 2. Adjust objective mastery
    const oldMastery = this.masteryEngine.getConceptMastery(conceptId);
    const newMastery = this.masteryEngine.recordExerciseResult(conceptId, isCorrect);

    // 3. Update active weakness logs
    if (isCorrect) {
      this.weaknessEngine.recordCorrectAttempt(conceptId);
    } else {
      this.weaknessEngine.recordWrongAttempt(conceptId);
    }

    // 4. Update subjective confidence indices implicitly
    this.confidenceEngine.inferConfidenceFromCorrectness(conceptId, isCorrect);

    // 5. Track milestones on Timeline
    if (newMastery.value > oldMastery.value && newMastery.status === "Mastered") {
      this.timelineEngine.recordEvent(
        "MasteryIncreased",
        "گەیشتن بە ئاستی باڵا",
        `چەمکی "${conceptLabelKu}"ت بە نایابی کۆنتڕۆڵ کرد!`
      );
    }

    // Increment question goal metrics
    this.goalEngine.registerProgress("goal_daily_questions", 1);
  }

  public submitSelfConfidenceRating(conceptId: string, score: number): void {
    this.confidenceEngine.recordSelfRating(conceptId, score);
  }

  public logStudySession(durationSeconds: number): void {
    const nowStr = new Date().toISOString();
    this.habitEngine.recordSession(durationSeconds, nowStr);
    this.goalEngine.incrementStreak();
  }

  public updateDNAPreferredStyle(style: ExplanationStyle): void {
    this.dnaEngine.updatePreferredStyle(style);
  }
}
