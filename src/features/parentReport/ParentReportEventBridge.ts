import { StudentProfile } from "../student/studentTypes.ts";
import { ParentReportSnapshot } from "./parentReportTypes.ts";
import { DomainEventFactory } from "../../domain/DomainEventFactory.ts";
import { DomainEventStore } from "../../domain/DomainEventStore.ts";

export class ParentReportEventBridge {
  /**
   * Logs a REPORT_GENERATED event to the DomainEventStore.
   */
  public static emitReportGenerated(profile: StudentProfile, snapshot: ParentReportSnapshot): void {
    const store = DomainEventStore.getInstance();
    
    const summary = `ڕاپۆرتی زیرەکی دایک و باوکان بۆ قوتابی ${snapshot.studentName} لە بوارەکانی فێربوونی ${snapshot.subjectLabel} بە نمرەی تاقیکردنەوەی ${snapshot.latestAssessmentScore ?? "نادیار"} بەکۆتاهێنرا.`;

    const event = DomainEventFactory.createEvent(
      "REPORT_GENERATED",
      profile.id,
      "intelligence-engine",
      {
        reportId: `parent-report-${profile.id}-${Date.now()}`,
        type: "parent",
        summaryKu: summary
      },
      {
        grade: profile.grade,
        stream: profile.stream,
        subject: profile.activeSubject
      }
    );

    store.append(event);
  }
}
