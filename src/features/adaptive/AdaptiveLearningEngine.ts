import { StudentProfile } from "../student/studentTypes.ts";
import { AssessmentSession } from "../assessment/intelligence/assessmentTypes.ts";
import { StudentIntelligenceSnapshot } from "../../intelligence/types.ts";
import { CurriculumIntelligenceSnapshot } from "../../curriculum/types.ts";
import { SessionSnapshot } from "../../session/types.ts";
import { AdaptiveSnapshot, AdaptiveDecision, AdaptiveAction } from "./adaptiveTypes.ts";

export interface AdaptiveInput {
  studentProfile: StudentProfile;
  assessmentSession: AssessmentSession;
  sipSnapshot: StudentIntelligenceSnapshot;
  cipSnapshot: CurriculumIntelligenceSnapshot;
  lseSnapshot: SessionSnapshot;
}

export class AdaptiveLearningEngine {
  /**
   * Generates a tailored AdaptiveSnapshot and AdaptiveDecision based on student profile,
   * assessment results, student intelligence snapshot, curriculum intelligence snapshot,
   * and learning session engine snapshot.
   */
  public static buildAdaptiveSnapshot(input: AdaptiveInput): AdaptiveSnapshot {
    const { studentProfile, assessmentSession, sipSnapshot, cipSnapshot, lseSnapshot } = input;
    const score = assessmentSession.scorePercentage;
    const studentId = studentProfile.id;

    let action: AdaptiveAction = "continue_learning";
    let targetMode: "learn" | "practice" | "review" | "assessment" = "learn";
    let priority: "high" | "medium" | "low" = "medium";
    let title = "";
    let message = "";
    let confidenceImpact = 0;
    let masteryImpact = 0;

    // Rules mapping score to action and targets
    if (score < 50) {
      action = "review_weakness";
      targetMode = "review";
      priority = "high";
      title = "پێداچوونەوە بکە بە خاڵە لاوازەکانت";
      message = "ئەنجامەکانت نیشانی دەدەن کە پێویستە پێداچوونەوە بەم چەمکانەدا بکەیتەوە تاوەکو متمانەت بەرز بێتەوە. خەم مەخۆ، بە پێکەوە کارکردن باشتر فێردەبین!";
      confidenceImpact = -0.10;
      masteryImpact = 0.00;
    } else if (score >= 50 && score < 80) {
      action = "practice_more";
      targetMode = "practice";
      priority = "medium";
      title = "ڕاهێنانی زیاتر بکە بۆ بەهێزکردنی ئاستت";
      message = "کارێکی زۆر باشت کردووە! بەڵام بۆ جێگیرکردنی زانیارییەکانت و گەیشتن بە ئاستی باڵا، پێویستت بە ڕاهێنانی پڕاکتیکیی زیاترە لەسەر ئەم بابەتانە.";
      confidenceImpact = 0.05;
      masteryImpact = 0.05;
    } else {
      // score >= 80
      action = "advance_next_lesson";
      targetMode = "learn";
      priority = "medium";
      title = "بەردەوام بە بۆ وانەی داهاتوو";
      message = "دەستخۆش، نمرەیەکی نایاب و سەرکەوتووانەت بەدەستهێنا! ئاستی تێگەیشتنت زۆر بەرزە. ئێستا بە متمانەوە بەرەو خوێندنی وانە یان بابەتێکی نوێ هەنگاو بنێ.";
      confidenceImpact = 0.15;
      masteryImpact = 0.10; // Conservative increase to avoid over-marking mastery from a single assessment
    }

    // Weak and Strong concept IDs from the assessment session
    const weakConceptIds = assessmentSession.weakConceptIds || [];
    const strongConceptIds = assessmentSession.strongConceptIds || [];

    // Construct target node IDs based on action
    let targetNodeIds: string[] = [];
    if (action === "review_weakness" && weakConceptIds.length > 0) {
      targetNodeIds = [...weakConceptIds];
    } else if (action === "practice_more" && strongConceptIds.length > 0) {
      // If we need practice, we practice the concepts that were tested but maybe not fully mastered, or strong ones to perfect them
      targetNodeIds = [...weakConceptIds, ...strongConceptIds];
    } else {
      // Advance to next lesson: Use next recommended node ID from CIP if available, or fall back to assessment's activeConceptId
      const nextRecId = cipSnapshot.learningPath.nextRecommendedNodeId;
      if (nextRecId) {
        targetNodeIds = [nextRecId];
      } else if (assessmentSession.questions && assessmentSession.questions.length > 0) {
        const lastQConcept = assessmentSession.questions[assessmentSession.questions.length - 1].conceptId;
        if (lastQConcept) {
          targetNodeIds = [lastQConcept];
        }
      }
    }

    if (targetNodeIds.length === 0 && assessmentSession.questions && assessmentSession.questions.length > 0) {
      // Generic fallback
      const qConcept = assessmentSession.questions[0].conceptId;
      if (qConcept) {
        targetNodeIds = [qConcept];
      }
    }

    // Calculate updated queues
    const activeSession = lseSnapshot.currentSession;
    
    // Existing queues from LSE active session or fallback to empty
    let existingCompletedNodeIds = activeSession?.completedNodeIds 
      ? [...activeSession.completedNodeIds]
      : sipSnapshot.graph.completedNodeIds 
      ? Array.from(sipSnapshot.graph.completedNodeIds)
      : [];

    let existingReviewQueue = activeSession?.reviewQueue ? [...activeSession.reviewQueue] : [];
    let existingPracticeQueue = activeSession?.practiceQueue ? [...activeSession.practiceQueue] : [];

    // Weak concepts must go to reviewQueue
    weakConceptIds.forEach(id => {
      if (!existingReviewQueue.includes(id)) {
        existingReviewQueue.push(id);
      }
    });

    // Strong concepts must go to completedNodeIds only if score >= 80
    if (score >= 80) {
      strongConceptIds.forEach(id => {
        if (!existingCompletedNodeIds.includes(id)) {
          existingCompletedNodeIds.push(id);
        }
        // If it was in the reviewQueue, remove it now that they mastered it
        existingReviewQueue = existingReviewQueue.filter(rid => rid !== id);
        existingPracticeQueue = existingPracticeQueue.filter(pid => pid !== id);
      });
    } else {
      // If they got < 80, any tested concept that they scored well on can go to the practiceQueue for reinforcing
      strongConceptIds.forEach(id => {
        if (!existingPracticeQueue.includes(id) && !existingCompletedNodeIds.includes(id)) {
          existingPracticeQueue.push(id);
        }
      });
    }

    const warnings: string[] = [];
    if (weakConceptIds.length > 3) {
      warnings.push("بڕێکی زۆر لە بابەتە لاوازەکان پێویستیان بە پێداچوونەوەیە.");
    }

    const decision: AdaptiveDecision = {
      action,
      title,
      message,
      targetNodeIds,
      targetMode,
      confidenceImpact,
      masteryImpact,
      priority,
    };

    return {
      generatedAt: new Date().toISOString(),
      studentId,
      assessmentId: assessmentSession.id,
      scorePercentage: score,
      weakConceptIds,
      strongConceptIds,
      decision,
      reviewQueue: existingReviewQueue,
      practiceQueue: existingPracticeQueue,
      completedNodeIds: existingCompletedNodeIds,
      warnings,
    };
  }
}
