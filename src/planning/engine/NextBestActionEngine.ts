import { StudentMasteryProfile } from "../../learning/domain/MasteryTypes.ts";
import { AssessmentResult } from "../../assessment/domain/AssessmentTypes.ts";
import { NextBestAction, StudyTask, StudyTaskStatus } from "../domain/LearningPlanTypes.ts";
import { PrerequisitePlanner } from "./PrerequisitePlanner.ts";

export interface NextBestActionContext {
  studentMasteryProfile?: StudentMasteryProfile;
  activeTasks?: StudyTask[];
  recentAssessmentResult?: AssessmentResult;
  completedMinutesToday?: number;
  maxMinutesToday?: number;
}

export class NextBestActionEngine {
  private prereqPlanner: PrerequisitePlanner;

  constructor() {
    this.prereqPlanner = new PrerequisitePlanner();
  }

  /**
   * Evaluates the student's current learning context and returns the single next best action.
   */
  public determineNextBestAction(context: NextBestActionContext): NextBestAction {
    const profile = context.studentMasteryProfile;
    const activeTasks = context.activeTasks || [];
    const completedMins = context.completedMinutesToday || 0;
    const maxMins = context.maxMinutesToday || 60;

    // 0. Rest and Recovery Check: If student reached or exceeded daily study limit
    if (maxMins > 0 && completedMins >= maxMins) {
      return {
        actionType: "REST_AND_RESUME",
        titleKu: "خوێندنی ئەمڕۆت بە سەرکەوتوویی بەکۆتا گەیاند",
        reasonKu: "بڕی تەرخانکراوی ئەمڕۆت تەواو کردووە. پشوو بدە و بەیانی بە وزەی نوێوە بگەڕێوە.",
        estimatedDurationMinutes: 0,
        curriculumReferences: {},
        confidence: "high",
        evidenceReferences: [`completed_minutes:${completedMins}`]
      };
    }

    // 1. Cold Start Check: No mastery profile or empty masteries
    if (!profile || Object.keys(profile.conceptMasteries).length === 0) {
      // Look for a planned diagnostic task or offer diagnostic assessment
      const plannedDiag = activeTasks.find(t => (t.type as string) === "ASSESSMENT" || (t.type as string) === "MASTERY_CHECK");
      return {
        actionType: "TAKE_DIAGNOSTIC",
        titleKu: "ئەنجامدانی تاقیکردنەوەی دیاریکردنی ئاست",
        reasonKu: "بۆ ئەوەی سیستەمی زانا باشتر ئاستی تێگەیشتنت بزانێت و پلانی شایستەت بۆ دابنێت.",
        estimatedDurationMinutes: 10,
        curriculumReferences: { subjectId: "subject-math-g9" },
        taskId: plannedDiag?.id,
        confidence: "low",
        evidenceReferences: [],
        fallbackReason: "هێشتا زانیاری و بەڵگەی پێویست لەسەر ئاستی قوتابی تۆمار نەکراوە."
      };
    }

    // 2. Misconception Intervention: Active confirmed misconception
    const activeMisc = profile.activeMisconceptions?.find(m => m.status === "CONFIRMED" || m.status === "SUSPECTED");
    if (activeMisc) {
      return {
        actionType: "REVIEW_MISCONCEPTION",
        titleKu: `ڕاستکردنەوەی تێگەیشتنی هەڵە: ${activeMisc.nameKu}`,
        reasonKu: activeMisc.interventionKu || "پێویستە ئەم تێگەیشتنە هەڵەیە ڕاستبکرێتەوە پێش ئەوەی بچیتە سەر بابەتەکانی تر.",
        estimatedDurationMinutes: 15,
        curriculumReferences: { conceptId: activeMisc.conceptId },
        confidence: "high",
        evidenceReferences: activeMisc.evidenceAttempts || [`misc:${activeMisc.misconceptionId}`]
      };
    }

    // 3. Prerequisite Gap Check
    for (const [conceptId, masteryState] of Object.entries(profile.conceptMasteries)) {
      if (masteryState.masteryScore < 0.5) {
        const prereqResult = this.prereqPlanner.analyzePrerequisites(conceptId, profile);
        if (prereqResult.missingPrerequisiteConceptIds.length > 0) {
          const missingPrereqId = prereqResult.missingPrerequisiteConceptIds[0];
          return {
            actionType: "COMPLETE_PREREQUISITE",
            titleKu: `تەواوکردنی بابەتی پێشینە (${missingPrereqId})`,
            reasonKu: `تێگەیشتن لە ${missingPrereqId} پێویستە پێش ئەوەی لە ${conceptId} تێبگەیت.`,
            estimatedDurationMinutes: 20,
            curriculumReferences: { conceptId: missingPrereqId },
            confidence: "high",
            evidenceReferences: [`concept:${conceptId}`]
          };
        }
      }
    }

    // 4. Weak Concept Practice / Assessment
    if (context.recentAssessmentResult && context.recentAssessmentResult.scoreBreakdown.percentage < 70) {
      const weaknesses = context.recentAssessmentResult.weaknessesKu;
      return {
        actionType: "PRACTICE_EASY",
        titleKu: "راهێنانی ئاسان لەسەر خاڵە لاوازەکان",
        reasonKu: weaknesses[0] || "پێویستت بە راهێنانی زیاتر هەیە لەسەر ئەو پرسیارانەی لە تاقیکردنەوەدا ڕووبەڕوویان بوویتەوە.",
        estimatedDurationMinutes: 15,
        curriculumReferences: {},
        confidence: "medium",
        evidenceReferences: [`assessment:${context.recentAssessmentResult.attemptId}`]
      };
    }

    // 5. In-Progress or Available Tasks from Plan
    const currentAvailableTask = activeTasks.find(
      t => t.status === StudyTaskStatus.AVAILABLE || t.status === StudyTaskStatus.IN_PROGRESS
    );

    if (currentAvailableTask) {
      return {
        actionType: (currentAvailableTask.type as string) === "MASTERY_CHECK" ? "TAKE_MASTERY_CHECK" : "CONTINUE_LESSON",
        titleKu: currentAvailableTask.titleKu,
        reasonKu: currentAvailableTask.reason?.descriptionKu || "ئەرکی پلاندانراوی هەنووکەیی لە پلانی خوێندندا",
        estimatedDurationMinutes: currentAvailableTask.estimatedDurationMinutes,
        curriculumReferences: {
          subjectId: currentAvailableTask.subjectId,
          unitId: currentAvailableTask.unitId,
          conceptId: currentAvailableTask.conceptId
        },
        taskId: currentAvailableTask.id,
        confidence: "high",
        evidenceReferences: currentAvailableTask.reason?.evidenceIds || []
      };
    }

    // 6. Default Fallback
    return {
      actionType: "CONTINUE_LESSON",
      titleKu: "بەردەوامبوون لەسەر وانەی داهاتوو",
      reasonKu: "پێشڕەوی لەسەر پڕۆگرامی خوێندن بەپێی پلانی هەفتانە",
      estimatedDurationMinutes: 20,
      curriculumReferences: { subjectId: "subject-math-g9" },
      confidence: "medium",
      evidenceReferences: []
    };
  }
}
