import { MisconceptionState } from "../../learning/domain/MasteryTypes.ts";
import { AssessmentResult } from "../../assessment/domain/AssessmentTypes.ts";
import {
  StudyTask,
  StudyTaskPriority,
  StudyTaskType,
  StudyTaskReason,
  StudentLearningPreferences
} from "../domain/LearningPlanTypes.ts";

export interface PrioritizationContext {
  studentMasteryScore?: number; // 0.0 to 1.0 for specific concept
  isPrerequisiteForTarget?: boolean;
  activeMisconceptions?: MisconceptionState[];
  isOverdueReview?: boolean;
  daysUntilExam?: number;
  recentAssessmentResult?: AssessmentResult;
  isMissedRecovery?: boolean;
  isDifficultSubject?: boolean;
  preferences?: StudentLearningPreferences;
}

export class StudyTaskPrioritizer {
  // Named weights for explainability
  public static readonly WEIGHTS = {
    PREREQUISITE_DEPENDENCY: 30,
    ACTIVE_MISCONCEPTION: 25,
    LOW_MASTERY: 20,
    OVERDUE_REVIEW: 20,
    EXAM_APPROACHING_URGENT: 20, // < 7 days
    EXAM_APPROACHING_HIGH: 10,   // < 14 days
    ASSESSMENT_WEAKNESS: 15,
    MISSED_TASK_RECOVERY: 10,
    DIFFICULT_SUBJECT_BOOST: 5
  };

  /**
   * Calculates a numerical priority score and maps it to a StudyTaskPriority enum.
   */
  public static calculatePriority(
    taskType: StudyTaskType,
    context: PrioritizationContext
  ): { priority: StudyTaskPriority; score: number; reason: StudyTaskReason } {
    let score = 10; // Base score
    const evidenceIds: string[] = [];
    let code: StudyTaskReason["code"] = "CURRICULUM_PROGRESS";
    let descriptionKu = "خوێندنی ئاسایی لەسەر بنەمای پڕۆگرامی خوێندن";

    // 1. Prerequisite Dependency
    if (context.isPrerequisiteForTarget || taskType === StudyTaskType.PREREQUISITE) {
      score += this.WEIGHTS.PREREQUISITE_DEPENDENCY;
      code = "PREREQUISITE_MISSING";
      descriptionKu = "تێگەیشتنی ئەم بابەتە پێویستە پێش ئەوەی بچیتە سەر بابەتی سەرەکی";
    }

    // 2. Active Misconception
    if (context.activeMisconceptions && context.activeMisconceptions.length > 0) {
      score += this.WEIGHTS.ACTIVE_MISCONCEPTION;
      code = "MISCONCEPTION_ACTIVE";
      const names = context.activeMisconceptions.map(m => m.nameKu).join("، ");
      descriptionKu = `دەستنیشانکردنی تێگەیشتنی هەڵە: ${names}`;
      context.activeMisconceptions.forEach(m => evidenceIds.push(`misc:${m.misconceptionId}`));
    }

    // 3. Low Mastery Score
    if (typeof context.studentMasteryScore === "number" && context.studentMasteryScore < 0.5) {
      score += this.WEIGHTS.LOW_MASTERY;
      if (code === "CURRICULUM_PROGRESS") {
        code = "LOW_MASTERY";
        descriptionKu = `ئاستی تێگەیشتن نزمە (${Math.round(context.studentMasteryScore * 100)}٪) - پێویستی بە بەهێزکردن هەیە`;
      }
    }

    // 4. Overdue Review Item
    if (context.isOverdueReview || taskType === StudyTaskType.REVIEW) {
      score += this.WEIGHTS.OVERDUE_REVIEW;
      if (code === "CURRICULUM_PROGRESS") {
        code = "SPACED_REVIEW_DUE";
        descriptionKu = "کاتی پێداچوونەوەی خولەیی هاتۆتەوە بۆ چەسپاندنی زانیارییەکان";
      }
    }

    // 5. Approaching Exam Date
    if (typeof context.daysUntilExam === "number" && context.daysUntilExam > 0) {
      if (context.daysUntilExam <= 7) {
        score += this.WEIGHTS.EXAM_APPROACHING_URGENT;
        code = "EXAM_APPROACHING";
        descriptionKu = `تاقیکردنەوە نزیکبووەتەوە (تەنها ${context.daysUntilExam} ڕۆژ ماوە)`;
      } else if (context.daysUntilExam <= 14) {
        score += this.WEIGHTS.EXAM_APPROACHING_HIGH;
      }
    }

    // 6. Assessment Weakness
    if (context.recentAssessmentResult) {
      const { scoreBreakdown, weaknessesKu } = context.recentAssessmentResult;
      if (scoreBreakdown.percentage < 70) {
        score += this.WEIGHTS.ASSESSMENT_WEAKNESS;
        if (code === "CURRICULUM_PROGRESS") {
          code = "ASSESSMENT_WEAKNESS";
          descriptionKu = weaknessesKu[0] || "خاڵی لاواز لە تاقیکردنەوەی دواییدا دەرکەوتووە";
        }
        evidenceIds.push(`assessment:${context.recentAssessmentResult.attemptId}`);
      }
    }

    // 7. Missed Task Recovery
    if (context.isMissedRecovery) {
      score += this.WEIGHTS.MISSED_TASK_RECOVERY;
      if (code === "CURRICULUM_PROGRESS") {
        code = "RETRY_INCOMPLETE";
        descriptionKu = "دوبارەکردنەوەی ئەرکی تەواونەکراو بۆ پاراستنی بەرەوپێشچوون";
      }
    }

    // Map score to Priority enum
    let priority: StudyTaskPriority = StudyTaskPriority.LOW;
    if (score >= 60) {
      priority = StudyTaskPriority.URGENT;
    } else if (score >= 40) {
      priority = StudyTaskPriority.HIGH;
    } else if (score >= 25) {
      priority = StudyTaskPriority.MEDIUM;
    }

    return {
      priority,
      score,
      reason: {
        code,
        evidenceIds,
        descriptionKu
      }
    };
  }

  /**
   * Sorts array of StudyTasks in-place by priority score descending.
   */
  public static sortTasksByPriority(tasks: StudyTask[]): StudyTask[] {
    return tasks.sort((a, b) => b.priorityScore - a.priorityScore);
  }
}
