import { CurriculumRegistry } from "../../curriculum/registry/CurriculumRegistry.ts";
import { StudentMasteryProfile, DifficultyLevel } from "../../learning/domain/MasteryTypes.ts";
import { AssessmentResult } from "../../assessment/domain/AssessmentTypes.ts";
import {
  LearningPlan,
  WeeklyStudyPlan,
  DailyStudyPlan,
  StudyTask,
  StudyTaskType,
  StudyTaskStatus,
  StudentLearningPreferences,
  LearningGoal,
  PlanGenerationMode,
  StudyTaskSource
} from "../domain/LearningPlanTypes.ts";
import { StudyTaskPrioritizer } from "./StudyTaskPrioritizer.ts";
import { PrerequisitePlanner } from "./PrerequisitePlanner.ts";
import { ReviewScheduler } from "./ReviewScheduler.ts";

export interface PlanGenerationInput {
  studentId: string;
  preferences: StudentLearningPreferences;
  goal: LearningGoal;
  masteryProfile: StudentMasteryProfile;
  mode?: PlanGenerationMode;
  recentAssessmentResult?: AssessmentResult;
  incompleteTasks?: StudyTask[];
  startDateIso?: string;
  authoritative?: boolean;
}

export class PersonalLearningPlanEngine {
  private registry: CurriculumRegistry;
  private prereqPlanner: PrerequisitePlanner;

  constructor(registry?: CurriculumRegistry) {
    this.registry = registry || CurriculumRegistry.getInstance();
    this.prereqPlanner = new PrerequisitePlanner();
  }

  /**
   * Generates a balanced, structured weekly LearningPlan.
   */
  public generatePlan(input: PlanGenerationInput): LearningPlan {
    const {
      studentId,
      preferences,
      goal,
      masteryProfile,
      mode = "FIRST_TIME_PLAN",
      recentAssessmentResult,
      incompleteTasks = [],
      startDateIso,
      authoritative = true
    } = input;

    const startDate = startDateIso ? new Date(startDateIso) : new Date();
    const startDateStr = startDate.toISOString().split("T")[0];

    const planId = `plan_${studentId}_${Date.now()}`;
    const candidateTasks: StudyTask[] = [];

    // 1. Gather Weak Concepts & Misconceptions
    for (const [conceptId, state] of Object.entries(masteryProfile.conceptMasteries)) {
      if (state.masteryScore < 0.6) {
        // Check for missing prerequisites
        const prereqResult = this.prereqPlanner.analyzePrerequisites(conceptId, masteryProfile);

        if (prereqResult.missingPrerequisiteConceptIds.length > 0) {
          for (const preId of prereqResult.missingPrerequisiteConceptIds) {
            const { priority, score, reason } = StudyTaskPrioritizer.calculatePriority(
              StudyTaskType.PREREQUISITE,
              { isPrerequisiteForTarget: true, studentMasteryScore: 0.2 }
            );

            candidateTasks.push({
              id: `task_pre_${preId}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              planId,
              studentId,
              type: StudyTaskType.PREREQUISITE,
              status: StudyTaskStatus.PLANNED,
              priority,
              priorityScore: score,
              titleKu: `فێربوونی بابەتی پێشینە (${preId})`,
              descriptionKu: `تێگەیشتن لەم بابەتە زۆر گرنگە پێش ئەوەی درێژە بە ${conceptId} بدەیت`,
              subjectId: goal.targetSubjectId,
              conceptId: preId,
              prerequisiteForConceptId: conceptId,
              reason,
              estimatedDurationMinutes: preferences.preferredSessionLengthMinutes || 25,
              scheduledDate: startDateStr,
              targetDifficulty: DifficultyLevel.FOUNDATION,
              source: "PREREQUISITE_GAP",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        } else {
          // Weak concept practice task
          const activeMisc = masteryProfile.activeMisconceptions?.filter(m => m.conceptId === conceptId);
          const { priority, score, reason } = StudyTaskPrioritizer.calculatePriority(
            StudyTaskType.PRACTICE,
            { studentMasteryScore: state.masteryScore, activeMisconceptions: activeMisc }
          );

          candidateTasks.push({
            id: `task_weak_${conceptId}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            planId,
            studentId,
            type: StudyTaskType.PRACTICE,
            status: StudyTaskStatus.PLANNED,
            priority,
            priorityScore: score,
            titleKu: `راهێنانی خێرا: ${conceptId}`,
            descriptionKu: `بەهێزکردنی ئاستی تێگەیشتن لە ${conceptId}`,
            subjectId: goal.targetSubjectId,
            conceptId,
            reason,
            estimatedDurationMinutes: preferences.preferredSessionLengthMinutes || 20,
            scheduledDate: startDateStr,
            targetDifficulty: state.masteryScore < 0.3 ? DifficultyLevel.EASY : DifficultyLevel.STANDARD,
            source: "CURRICULUM",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
    }

    // 2. Gather Spaced Reviews
    const reviewItems = ReviewScheduler.calculateReviewItems(masteryProfile, startDateStr);
    for (const item of reviewItems.filter(r => r.state === "DUE" || r.state === "OVERDUE")) {
      const { priority, score, reason } = StudyTaskPrioritizer.calculatePriority(
        StudyTaskType.REVIEW,
        { isOverdueReview: item.state === "OVERDUE", studentMasteryScore: item.masteryScore }
      );

      candidateTasks.push({
        id: `task_rev_${item.conceptId}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        planId,
        studentId,
        type: StudyTaskType.REVIEW,
        status: StudyTaskStatus.PLANNED,
        priority,
        priorityScore: score,
        titleKu: `پێداچوونەوەی خولەیی: ${item.conceptId}`,
        descriptionKu: "پێداچوونەوە بۆ چەسپاندنی زانیارییەکان لە بیرگەدا",
        subjectId: goal.targetSubjectId,
        conceptId: item.conceptId,
        reason,
        estimatedDurationMinutes: 15,
        scheduledDate: startDateStr,
        targetDifficulty: DifficultyLevel.STANDARD,
        source: "SPACED_REVIEW",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // 3. Gather Assessment Weaknesses
    if (recentAssessmentResult) {
      const { weaknessesKu } = recentAssessmentResult;
      const { priority, score, reason } = StudyTaskPrioritizer.calculatePriority(
        StudyTaskType.RETRY,
        { recentAssessmentResult }
      );

      candidateTasks.push({
        id: `task_asst_fix_${Date.now()}`,
        planId,
        studentId,
        type: StudyTaskType.RETRY,
        status: StudyTaskStatus.PLANNED,
        priority,
        priorityScore: score,
        titleKu: "راهێنان لەسەر هەڵەکانی تاقیکردنەوە",
        descriptionKu: weaknessesKu[0] || "پێداچوونەوە و بەهێزکردنی خاڵە لاوازەکان",
        subjectId: goal.targetSubjectId,
        reason,
        estimatedDurationMinutes: 20,
        scheduledDate: startDateStr,
        targetDifficulty: DifficultyLevel.EASY,
        source: "ASSESSMENT_WEAKNESS",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // 4. Default Curriculum Progression Task if candidate tasks are sparse
    if (candidateTasks.length < 3) {
      const allLessons = this.registry.getAllLessons();
      for (const lesson of allLessons.slice(0, 3)) {
        const { priority, score, reason } = StudyTaskPrioritizer.calculatePriority(
          StudyTaskType.LEARN,
          {}
        );

        candidateTasks.push({
          id: `task_learn_${lesson.id}_${Date.now()}`,
          planId,
          studentId,
          type: StudyTaskType.LEARN,
          status: StudyTaskStatus.PLANNED,
          priority,
          priorityScore: score,
          titleKu: `خوێندنی وانەی ${lesson.title}`,
          descriptionKu: "تێگەیشتن لە چەمکە سەرەکییەکانی وانەکە",
          subjectId: goal.targetSubjectId,
          lessonId: lesson.id,
          unitId: lesson.unitId,
          reason,
          estimatedDurationMinutes: preferences.preferredSessionLengthMinutes || 25,
          scheduledDate: startDateStr,
          targetDifficulty: DifficultyLevel.STANDARD,
          source: "CURRICULUM",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    // Sort candidate tasks by priority score descending
    StudyTaskPrioritizer.sortTasksByPriority(candidateTasks);

    // 5. Distribute tasks across 7 days (1 week)
    const dailyPlans: DailyStudyPlan[] = [];
    let taskQueuePointer = 0;

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const currentDay = new Date(startDate);
      currentDay.setDate(startDate.getDate() + dayIndex);
      const dateStr = currentDay.toISOString().split("T")[0];
      const dayOfWeek = currentDay.getDay();

      const isPreferredStudyDay = preferences.preferredStudyDays.includes(dayOfWeek);
      const maxMinsForDay = isPreferredStudyDay ? (preferences.availableMinutesPerDay[dayOfWeek] || 45) : 0;
      const maxTasksForDay = preferences.maxTasksPerDay || 5;

      const dayTasks: StudyTask[] = [];
      let dayPlannedMins = 0;

      if (isPreferredStudyDay && maxMinsForDay > 0) {
        while (
          taskQueuePointer < candidateTasks.length &&
          dayTasks.length < maxTasksForDay &&
          dayPlannedMins < maxMinsForDay
        ) {
          const task = candidateTasks[taskQueuePointer];
          if (dayPlannedMins + task.estimatedDurationMinutes > maxMinsForDay && dayTasks.length > 0) {
            break; // Stop to prevent overloading
          }

          const assignedTask: StudyTask = {
            ...task,
            scheduledDate: dateStr,
            status: dayIndex === 0 && dayTasks.length === 0 ? StudyTaskStatus.AVAILABLE : StudyTaskStatus.PLANNED
          };

          dayTasks.push(assignedTask);
          dayPlannedMins += task.estimatedDurationMinutes;
          taskQueuePointer++;
        }
      }

      dailyPlans.push({
        date: dateStr,
        dayOfWeek,
        targetMinutes: maxMinsForDay,
        plannedMinutes: dayPlannedMins,
        completedMinutes: 0,
        tasks: dayTasks,
        isRestDay: !isPreferredStudyDay || maxMinsForDay === 0
      });
    }

    // Weekly totals
    const weeklyTargetMinutes = dailyPlans.reduce((acc, d) => acc + d.targetMinutes, 0);
    const weeklyPlannedMinutes = dailyPlans.reduce((acc, d) => acc + d.plannedMinutes, 0);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const endDateStr = endDate.toISOString().split("T")[0];

    const weeklyPlan: WeeklyStudyPlan = {
      weekNumber: 1,
      startDate: startDateStr,
      endDate: endDateStr,
      dailyPlans,
      weeklyTargetMinutes,
      weeklyPlannedMinutes,
      weeklyCompletedMinutes: 0
    };

    return {
      id: planId,
      studentId,
      goalId: goal.id,
      mode,
      startDate: startDateStr,
      endDate: endDateStr,
      weeklyPlans: [weeklyPlan],
      status: "ACTIVE",
      authoritative,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}
