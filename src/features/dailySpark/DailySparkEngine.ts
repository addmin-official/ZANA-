import { StudentProfile } from "../student/studentTypes.ts";
import { StudentIntelligenceSnapshot } from "../../intelligence/types.ts";
import { CurriculumIntelligenceSnapshot } from "../../curriculum/types.ts";
import { SessionSnapshot, LearningMode } from "../../session/types.ts";
import { DailySparkSnapshot, DailySparkCard, DailySparkType } from "./dailySparkTypes.ts";
import { DomainEventFactory } from "../../domain/DomainEventFactory.ts";
import { DomainEventStore } from "../../domain/DomainEventStore.ts";
import { DomainClock } from "../../domain/DomainClock.ts";

export interface DailySparkInput {
  studentProfile: StudentProfile;
  sipSnapshot: StudentIntelligenceSnapshot;
  cipSnapshot: CurriculumIntelligenceSnapshot;
  lseSnapshot: SessionSnapshot;
}

export class DailySparkEngine {
  /**
   * Builds the DailySparkSnapshot according to the student's learning state, goals, queues, and history.
   */
  public static buildDailySparkSnapshot(input: DailySparkInput): DailySparkSnapshot {
    const { studentProfile, sipSnapshot, cipSnapshot, lseSnapshot } = input;

    const studentId = studentProfile.id;
    const studentName = studentProfile.name;
    const subjectLabel = cipSnapshot.resolution.subjectLabel || "وانە";
    const gradeLabel = cipSnapshot.resolution.gradeLabel || "پۆل";
    const streamLabel = cipSnapshot.resolution.streamLabel || "لقی";

    const now = new Date();
    const hours = now.getHours();
    let greeting = "سڵاو";
    if (hours < 12) {
      greeting = "بەیانیت باش";
    } else if (hours < 18) {
      greeting = "ڕۆژت باش";
    } else {
      greeting = "ئێوارەت باش";
    }
    greeting = `${greeting}، ${studentName}!`;

    // 1. Gather facts from Domain Events
    let assessmentDoneToday = false;
    let reportGeneratedToday = false;
    let sparkTriggeredToday = false;
    const warnings: string[] = [];

    try {
      const todayStr = now.toISOString().split("T")[0];
      const studentEvents = DomainEventStore.getInstance().getByStudent(studentId);
      
      for (const ev of studentEvents) {
        const evDateStr = ev.occurredAt.split("T")[0];
        if (evDateStr === todayStr) {
          if (ev.type === "ASSESSMENT_FINISHED") {
            assessmentDoneToday = true;
          } else if (ev.type === "REPORT_GENERATED") {
            reportGeneratedToday = true;
          } else if (ev.type === "DAILY_SPARK_TRIGGERED") {
            sparkTriggeredToday = true;
          }
        }
      }
    } catch (e) {
      console.warn("Domain Event Store not fully available in Daily Spark Engine:", e);
    }

    if (assessmentDoneToday) {
      warnings.push("ئەمڕۆ هەڵسەنگاندنەکەت بە سەرکەوتوویی ئەنجام داوە!");
    }
    if (reportGeneratedToday) {
      warnings.push("ڕاپۆرتی دایک و باوک بۆ چالاکییەکانی ئەمڕۆ ئامادەکراوە.");
    }

    // 2. Identify and rank possible cards
    const candidateCards: DailySparkCard[] = [];

    const activeSession = lseSnapshot.currentSession;

    // Rule 1: If there is an active session, add "continue_learning"
    if (activeSession) {
      candidateCards.push({
        id: "spark_continue",
        type: "continue_learning",
        title: "بەردەوامبوون لە فێربوون",
        description: `بەردەوام بە لەسەر خوێندنی بابەتی "${subjectLabel}" لە بەشی "${cipSnapshot.resolution.availableNodes.find(n => n.id === activeSession.currentNodeId)?.title || "چەمکی نوێ"}".`,
        subjectLabel,
        gradeLabel,
        streamLabel,
        estimatedMinutes: activeSession.estimatedRemainingMinutes > 0 ? activeSession.estimatedRemainingMinutes : 15,
        priority: "high",
        actionLabel: "بەردەوامبوون لە خوێندن",
        targetNodeId: activeSession.currentNodeId,
        targetMode: activeSession.currentMode
      });
    } else {
      // If no active session, add fallback "continue_learning" pointing to next recommended node in pathway
      const nextNodeId = cipSnapshot.learningPath.nextRecommendedNodeId || cipSnapshot.learningPath.orderedNodeIds[0];
      if (nextNodeId) {
        const node = cipSnapshot.resolution.availableNodes.find(n => n.id === nextNodeId);
        candidateCards.push({
          id: "spark_start_learn",
          type: "continue_learning",
          title: "دەستپێکردنی خوێندنی وانەی داهاتوو",
          description: `خوێندنی بابەتەکەت لێرەوە بەردەوام بکە لەسەر وانەی "${node?.title || "بەشی نوێ"}".`,
          subjectLabel,
          gradeLabel,
          streamLabel,
          estimatedMinutes: node?.estimatedMinutes || 15,
          priority: "high",
          actionLabel: "دەستپێکردن",
          targetNodeId: nextNodeId,
          targetMode: "learn"
        });
      }
    }

    // Rule 2: If reviewQueue has items, add "review_weakness" card
    const reviewQueue = activeSession?.reviewQueue || [];
    if (reviewQueue.length > 0) {
      const reviewId = reviewQueue[0];
      const reviewNode = cipSnapshot.resolution.availableNodes.find(n => n.id === reviewId);
      candidateCards.push({
        id: "spark_review",
        type: "review_weakness",
        title: "پێداچوونەوەی بابەتە قورسەکان",
        description: `پێداچوونەوەیەکی خێرا بکە بە بابەتە ئاڵۆزەکەی "${reviewNode?.title || "پێشتر"}" بۆ جێگیرکردنی زانیارییەکانت.`,
        subjectLabel,
        gradeLabel,
        streamLabel,
        estimatedMinutes: 10,
        priority: "medium",
        actionLabel: "دەستپێکردنی پێداچوونەوە",
        targetNodeId: reviewId,
        targetMode: "review"
      });
    }

    // Rule 3: If practiceQueue has items, add "practice_concept" card
    const practiceQueue = activeSession?.practiceQueue || [];
    if (practiceQueue.length > 0) {
      const practiceId = practiceQueue[0];
      const practiceNode = cipSnapshot.resolution.availableNodes.find(n => n.id === practiceId);
      candidateCards.push({
        id: "spark_practice",
        type: "practice_concept",
        title: "ڕاهێنانی دەستبەجێ",
        description: `ڕاهێنانی پڕاکتیکی ئەنجام بدە بۆ بەرزکردنەوەی ئاستی وەڵامدانەوەت لەسەر "${practiceNode?.title || "بابەتەکە"}".`,
        subjectLabel,
        gradeLabel,
        streamLabel,
        estimatedMinutes: 12,
        priority: "medium",
        actionLabel: "دەستپێکردنی ڕاهێنان",
        targetNodeId: practiceId,
        targetMode: "practice"
      });
    }

    // Rule 4: If daily goal is incomplete, add "complete_goal" card
    const dailyGoal = activeSession?.dailyGoal || sipSnapshot.goals.goals.find(g => g.type === "daily");
    if (dailyGoal && !dailyGoal.isCompleted) {
      candidateCards.push({
        id: "spark_goal",
        type: "complete_goal",
        title: "تەواوکردنی ئامانجی ڕۆژانە",
        description: "تەنها چەند هەنگاوێکی کورتت ماوە بۆ بەدەستهێنانی ئامانجەکانی خوێندنی ئەمڕۆت. با بەیەکەوە تەواوی بکەین!",
        subjectLabel,
        gradeLabel,
        streamLabel,
        estimatedMinutes: 8,
        priority: "high",
        actionLabel: "تەواوکردنی ئامانج",
        targetNodeId: activeSession?.currentNodeId,
        targetMode: "learn"
      });
    }

    // Rule 5: If no assessment exists yet today (or overall assessment count is low), add "start_assessment"
    if (!assessmentDoneToday) {
      candidateCards.push({
        id: "spark_assessment",
        type: "start_assessment",
        title: "هەڵسەنگاندنی ئاستی فێربوون",
        description: "ئاستی تێگەیشتنت تاقی بکەرەوە بە وەڵامدانەوەی چەند پرسیارێکی کورت و خێرا لەسەر بابەتەکانت.",
        subjectLabel,
        gradeLabel,
        streamLabel,
        estimatedMinutes: 5,
        priority: "medium",
        actionLabel: "دەستپێکردنی هەڵسەنگاندن",
        targetNodeId: activeSession?.currentNodeId,
        targetMode: "assessment"
      });
    }

    // Rule 6: If study time is too long (exceeds 45 minutes / 2700s), add "rest_reminder" card
    const todayStudySec = lseSnapshot.analytics.todayStudyTimeSeconds;
    if (todayStudySec > 2700) {
      candidateCards.push({
        id: "spark_rest",
        type: "rest_reminder",
        title: "پێویستت بە پشوویەکی کورتە!",
        description: "ئەمڕۆ هەوڵێکی زۆرت داوە و مێشکت پێویستی بە پشوو هەیە بۆ ئەوەی چالاک بێتەوە.",
        subjectLabel,
        gradeLabel,
        streamLabel,
        estimatedMinutes: 5,
        priority: "high",
        actionLabel: "پشوو وەرگرتن",
        targetMode: "learn"
      });
    }

    // Sort candidates: High priority first, then medium, then low
    candidateCards.sort((a, b) => {
      const priorityWeights = { high: 3, medium: 2, low: 1 };
      return priorityWeights[b.priority] - priorityWeights[a.priority];
    });

    // Extract main card and secondary cards
    const mainCard = candidateCards[0] || {
      id: "spark_fallback",
      type: "continue_learning" as DailySparkType,
      title: "دەستپێکردنی خوێندنی وانەی یەکەم",
      description: "سەفەری فێربوونی خۆت ئەمڕۆ لەگەڵ زانا دەستپێبکە لۆ داهاتوویەکی گەشتر.",
      subjectLabel,
      gradeLabel,
      streamLabel,
      estimatedMinutes: 15,
      priority: "high" as const,
      actionLabel: "بەردەوامبوون",
      targetMode: "learn" as LearningMode
    };

    const secondaryCards = candidateCards.slice(1, 4); // Take up to 3 secondary cards

    // 3. Populate progress summary metrics
    const todayStudyMinutes = Math.round(todayStudySec / 60);
    const weeklyStudyMinutes = Math.round(lseSnapshot.analytics.weekStudyTimeSeconds / 60);
    const completionPercentage = lseSnapshot.analytics.completionPercentage;
    const currentStreakDays = sipSnapshot.goals.currentStreak;

    // 4. Fire Domain Event in a safe block
    try {
      if (!sparkTriggeredToday) {
        const ev = DomainEventFactory.createEvent(
          "DAILY_SPARK_TRIGGERED",
          studentId,
          "system",
          {
            sparkId: mainCard.id,
            titleKu: mainCard.title,
            type: mainCard.type
          },
          {
            grade: studentProfile.grade,
            stream: studentProfile.stream,
            subject: studentProfile.activeSubject,
            sessionId: activeSession?.id
          }
        );
        DomainEventStore.getInstance().append(ev);
      }
    } catch (e) {
      console.warn("Could not fire DAILY_SPARK_TRIGGERED domain event:", e);
    }

    return {
      generatedAt: DomainClock.nowIso(),
      studentName,
      greeting,
      mainCard,
      secondaryCards,
      progressSummary: {
        todayStudyMinutes,
        weeklyStudyMinutes,
        completionPercentage,
        currentStreakDays
      },
      warnings
    };
  }
}
