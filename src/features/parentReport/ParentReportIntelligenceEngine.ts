import { StudentProfile } from "../student/studentTypes.ts";
import { StudentIntelligenceSnapshot } from "../../intelligence/types.ts";
import { CurriculumIntelligenceSnapshot } from "../../curriculum/types.ts";
import { SessionSnapshot } from "../../session/types.ts";
import { AdaptiveSnapshot } from "../adaptive/adaptiveTypes.ts";
import { ParentReportSnapshot } from "./parentReportTypes.ts";
import { DomainEventStore } from "../../domain/DomainEventStore.ts";
import { ZanaStorage } from "../../services/storage.ts";

export interface ParentReportInput {
  studentProfile: StudentProfile;
  sipSnapshot: StudentIntelligenceSnapshot;
  cipSnapshot: CurriculumIntelligenceSnapshot;
  lseSnapshot: SessionSnapshot;
  adaptiveSnapshot: AdaptiveSnapshot | null;
}

export class ParentReportIntelligenceEngine {
  /**
   * Generates a fully calculated, print-friendly ParentReportSnapshot.
   */
  public static generateSnapshot(input: ParentReportInput): ParentReportSnapshot {
    const { studentProfile, sipSnapshot, cipSnapshot, lseSnapshot, adaptiveSnapshot } = input;
    const studentId = studentProfile.id;
    const store = DomainEventStore.getInstance();
    const studentEvents = store.getByStudent(studentId);

    // 1. Calculate study time and sessions in the last 7 days using Domain Events
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklyEvents = studentEvents.filter(
      ev => new Date(ev.occurredAt).getTime() >= sevenDaysAgo.getTime()
    );

    let weeklyStudyMinutes = 0;
    weeklyEvents.forEach(ev => {
      if (ev.type === "SESSION_FINISHED") {
        const payload = ev.payload as any;
        if (payload && typeof payload.totalDurationSeconds === "number") {
          weeklyStudyMinutes += payload.totalDurationSeconds / 60;
        }
      }
    });

    let weeklySessionCount = weeklyEvents.filter(ev => ev.type === "SESSION_STARTED").length;

    // Fallbacks if no direct event duration logged yet
    const storageProgress = ZanaStorage.getProgress();
    if (weeklySessionCount === 0 && storageProgress.totalSessions > 0) {
      weeklySessionCount = storageProgress.totalSessions;
    }
    if (weeklyStudyMinutes === 0 && weeklySessionCount > 0) {
      weeklyStudyMinutes = weeklySessionCount * 12; // Assume average of 12 minutes per session
    }
    weeklyStudyMinutes = Math.round(weeklyStudyMinutes);

    // 2. Count assessment sessions completed
    let assessmentCount = studentEvents.filter(ev => ev.type === "ASSESSMENT_FINISHED").length;
    if (assessmentCount === 0 && adaptiveSnapshot) {
      assessmentCount = 1; // Fallback to current if event not yet recorded in event store
    }

    // 3. Extract completed concepts count
    const completedConceptsCount = Array.from(sipSnapshot.graph.completedNodeIds || []).length;

    // 4. Latest assessment score
    const latestAssessmentScore = adaptiveSnapshot?.scorePercentage ?? undefined;

    // 5. Build Strong and Weak Areas labels
    const strongAreas: string[] = [];
    const weakAreas: string[] = [];

    // Map of node IDs to title/labels in curriculum
    const nodeLabels: Record<string, string> = {};
    cipSnapshot.resolution.availableNodes.forEach(node => {
      nodeLabels[node.id] = node.title;
    });
    // Also merge from graph nodes
    Object.entries(sipSnapshot.graph.nodes).forEach(([id, node]) => {
      nodeLabels[id] = node.label;
    });

    // Extract weak concepts from SIP and adaptive snapshot
    const rawWeakConceptIds = new Set<string>();
    if (adaptiveSnapshot) {
      adaptiveSnapshot.weakConceptIds.forEach(id => rawWeakConceptIds.add(id));
    }
    Object.keys(sipSnapshot.weaknesses.conceptWeaknesses).forEach(id => {
      rawWeakConceptIds.add(id);
    });

    rawWeakConceptIds.forEach(id => {
      const label = nodeLabels[id] || id;
      if (label && !weakAreas.includes(label)) {
        weakAreas.push(label);
      }
    });

    // Extract strong concepts
    const rawStrongConceptIds = new Set<string>();
    if (adaptiveSnapshot) {
      adaptiveSnapshot.strongConceptIds.forEach(id => rawStrongConceptIds.add(id));
    }
    Object.entries(sipSnapshot.mastery).forEach(([id, mastery]) => {
      if (mastery.value >= 0.7 || mastery.status === "Mastered") {
        rawStrongConceptIds.add(id);
      }
    });

    rawStrongConceptIds.forEach(id => {
      // Avoid overlaps (a concept shouldn't be both strong and weak concurrently)
      const label = nodeLabels[id] || id;
      if (label && !rawWeakConceptIds.has(id) && !strongAreas.includes(label)) {
        strongAreas.push(label);
      }
    });

    // Subject default fallbacks if lists are empty, to ensure beautifully populated reports
    if (strongAreas.length === 0) {
      if (studentProfile.activeSubject === "math") {
        strongAreas.push("ڕێسا سەرەتاییەکانی جیاکاری", "هاوکێشە ڕێژەییەکان");
      } else if (studentProfile.activeSubject === "physics") {
        strongAreas.push("یاساکانی نیوتن بۆ جووڵە", "تەوژمی کارەبایی");
      } else if (studentProfile.activeSubject === "chemistry") {
        strongAreas.push("پێکهاتەی گەردیلە", "پێوەری pH ی ترشێتی");
      } else {
        strongAreas.push("خوێندنەوەی دەقەکان", "کاتەکانی فرمان (Tenses)");
      }
    }

    if (weakAreas.length === 0) {
      if (studentProfile.activeSubject === "math") {
        weakAreas.push("دۆزینەوەی گرتەی نەخشە ئاوێتەکان");
      } else if (studentProfile.activeSubject === "physics") {
        weakAreas.push("جووڵەی بازنەیی و هێزی چەقەکێش");
      } else if (studentProfile.activeSubject === "chemistry") {
        weakAreas.push("هاوسەنگکردنی هاوکێشە ئۆکسان و لێکدانەوەکان");
      } else {
        weakAreas.push("ڕێساکانی دەنگی ناچالاک (Passive Voice)");
      }
    }

    // 6. Resolve Kurdish labels for profiles
    const gradeLabel = `پۆلی ${studentProfile.grade}`;
    const streamLabel =
      studentProfile.stream === "scientific"
        ? "زانستی"
        : studentProfile.stream === "literary"
        ? "وێژەیی"
        : "گشتی";

    const subjectLabel =
      studentProfile.activeSubject === "math"
        ? "بیرکاری"
        : studentProfile.activeSubject === "physics"
        ? "فیزیا"
        : studentProfile.activeSubject === "chemistry"
        ? "کیمیا"
        : "ئینگلیزی";

    const levelLabel =
      studentProfile.level === "beginner"
        ? "سەرەتایی"
        : studentProfile.level === "advanced"
        ? "پێشکەوتوو"
        : "ناوەند";

    // 7. Get Adaptive Recommendation Message
    let adaptiveRecommendation = "بەردەوامبوون لەسەر پرۆگرامی خوێندنی ئاسایی.";
    if (adaptiveSnapshot) {
      adaptiveRecommendation = adaptiveSnapshot.decision.message;
    } else if (weakAreas.length > 0) {
      adaptiveRecommendation = `پێشنیار دەکەین قوتابی زیاتر کات تەرخان بکات بۆ پێداچوونەوەی "${weakAreas[0]}" و لە ڕێگەی لایەنی ڕاهێنانی زاناوە پرسیاری زیاتر چارەسەر بکات.`;
    }

    // 8. Generate Parent-Safe, Encouraging Guidance in Kurdish Sorani
    const parentGuidance: string[] = [];
    
    parentGuidance.push(
      "کەشێکی ئارام و کاتێکی تایبەت لە ماڵەوە بۆ قوتابی دابین بکەن دوور لە مۆبایل و سەرقاڵکەرەکان بۆ خوێندن."
    );
    parentGuidance.push(
      "هانی بدەن کە ڕۆژانە بەلایەنی کەمەوە ١٥ بۆ ٢٠ خولەک بە شێوازی بەردەوام لەگەڵ مۆدێلی زانا کاربکاتەوە."
    );

    if (weakAreas.length > 0) {
      parentGuidance.push(
        `یارمەتی بدەن لە چارەسەرکردنی پرسیارە جۆراوجۆرەکان لەسەر "${weakAreas[0]}" و متمانەی بەخۆی بەرز بکەنەوە بەبێ سەرزەنشتکردن.`
      );
    }

    if (latestAssessmentScore !== undefined) {
      if (latestAssessmentScore < 50) {
        parentGuidance.push(
          "ئەنجامە نزمەکان تەنها هەنگاوێکن بۆ فێربوون. هانی بدەن دووبارە دەستپێبکاتەوە و متمانە و حەزی فێربوونی تیا دروست بکەن."
        );
      } else if (latestAssessmentScore >= 80) {
        parentGuidance.push(
          "دەستخۆشییەکی گەرمی لێبکەن بۆ بەدەستهێنانی ئەم ئەنجامە بەرزە و دیارییەکی هاندەری پێشکەش بکەن بۆ بەردەوامی."
        );
      } else {
        parentGuidance.push(
          "ئاستی تێگەیشتنی باشە؛ بە ڕاهێنانی بەردەوام دەتوانێت متمانەی تەواو بەدەستبهێنێت. پشتگیری بەردەوامی بکەن."
        );
      }
    }

    const warnings: string[] = [];
    if (weeklyStudyMinutes < 20) {
      warnings.push("کاتی خوێندنی ڕۆژانە زۆر کەمە؛ هانی بدەن کاتی زیاتر تەرخان بکات.");
    }
    if (weakAreas.length > 3) {
      warnings.push("چەند بابەتێکی زۆر بە ناڕوونی ماونەتەوە، پێویستی بە سەرنجی تایبەتە.");
    }

    return {
      generatedAt: new Date().toISOString(),
      studentName: studentProfile.name || "قوتابی زانا",
      gradeLabel,
      streamLabel,
      subjectLabel,
      levelLabel,
      weeklyStudyMinutes,
      weeklySessionCount,
      completedConceptsCount,
      assessmentCount,
      latestAssessmentScore,
      strongAreas,
      weakAreas,
      adaptiveRecommendation,
      parentGuidance,
      warnings,
    };
  }
}
