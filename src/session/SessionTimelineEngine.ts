import { SessionTimelineEvent, SessionTimelineEventType } from "./types.ts";

export class SessionTimelineEngine {
  private events: SessionTimelineEvent[] = [];

  constructor(initialEvents?: SessionTimelineEvent[]) {
    if (initialEvents) {
      this.events = [...initialEvents];
    }
  }

  public recordEvent(
    type: SessionTimelineEventType,
    titleKu: string,
    detailsKu: string
  ): SessionTimelineEvent {
    const newEvent: SessionTimelineEvent = {
      id: `timeline_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      titleKu,
      detailsKu
    };

    this.events.push(newEvent);

    // Keep events list ordered descending (newest first)
    this.events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Cap history at 100 events
    if (this.events.length > 100) {
      this.events = this.events.slice(0, 100);
    }

    return newEvent;
  }

  public getTimeline(): SessionTimelineEvent[] {
    return [...this.events];
  }

  public generateStandardEvent(
    type: SessionTimelineEventType,
    subjectLabelKu: string,
    nodeTitleKu: string
  ): SessionTimelineEvent {
    let title = "";
    let details = "";

    switch (type) {
      case "StartedLearning":
        title = "دەستپێکردنی خوێندن";
        details = `دەستت کرد بە خوێندنی بابەتی "${subjectLabelKu}" لە بەشی "${nodeTitleKu}".`;
        break;
      case "CompletedLesson":
        title = "تەواوکردنی وانە";
        details = `وانەی "${nodeTitleKu}"ت بە سەرکەوتوویی تەواو کرد.`;
        break;
      case "CompletedConcept":
        title = "تەواوکردنی چەمک";
        details = `چەمکی زانستیی "${nodeTitleKu}"ت بە تەواوی خوێندەوە.`;
        break;
      case "Practice":
        title = "ئەنجامدانی ڕاهێنان";
        details = `ڕاهێنانی پڕاکتیکی لەسەر بابەتەکە ئەنجام دا بۆ بەهێزکردنی تواناکانت.`;
        break;
      case "Review":
        title = "پێداچوونەوە";
        details = `پێداچوونەوەیەکی خێرات کرد بۆ بابەتەکانی ڕابردوو.`;
        break;
      case "Assessment":
        title = "تاقیکردنەوەی هەڵسەنگاندن";
        details = `هەڵسەنگاندنی ئاستت بۆ "${nodeTitleKu}" بە سەرکەوتوویی کۆتایی هات.`;
        break;
      case "GoalReached":
        title = "گەیشتن بە ئامانجی ڕۆژانە";
        details = `پیرۆزە! هەموو ئامانجەکانی خوێندنی ئەمڕۆت بەدەستهێنا.`;
        break;
    }

    return this.recordEvent(type, title, details);
  }
}
