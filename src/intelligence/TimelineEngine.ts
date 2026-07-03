import { TimelineEvent, TimelineEventType } from "./types.ts";

export class TimelineEngine {
  private events: TimelineEvent[] = [];

  constructor(initialEvents?: TimelineEvent[]) {
    if (initialEvents) {
      this.events = [...initialEvents];
    } else {
      this.seedInitialEvents();
    }
  }

  private seedInitialEvents(): void {
    this.events = [
      {
        id: `evt_init_${Date.now()}`,
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
        type: "AssessmentCompleted",
        titleKu: "بەخێرهاتنی فەرمی",
        detailsKu: "گەشتی خوێندنەکەت لەگەڵ زانا بە سەرکەوتوویی دەستی پێکرد."
      }
    ];
  }

  public getSnapshot(): TimelineEvent[] {
    // Return events sorted newest first
    return [...this.events].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  public recordEvent(type: TimelineEventType, titleKu: string, detailsKu: string): TimelineEvent {
    const newEvent: TimelineEvent = {
      id: `evt_${type.toLowerCase()}_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      titleKu,
      detailsKu
    };

    this.events.push(newEvent);
    
    // Keep last 50 events to optimize storage memory
    if (this.events.length > 50) {
      this.events = this.events.slice(-50);
    }

    return newEvent;
  }
}
