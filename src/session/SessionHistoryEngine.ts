import { SessionHistoryEvent, SessionHistoryEventType } from "./types.ts";

export class SessionHistoryEngine {
  private events: SessionHistoryEvent[] = [];

  constructor(initialEvents?: SessionHistoryEvent[]) {
    if (initialEvents) {
      this.events = [...initialEvents];
    }
  }

  public recordEvent(
    sessionId: string,
    type: SessionHistoryEventType,
    nodeId: string,
    lessonId: string,
    conceptId: string,
    durationSeconds: number,
    details?: string
  ): SessionHistoryEvent {
    const newEvent: SessionHistoryEvent = {
      id: `hist_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
      sessionId,
      timestamp: new Date().toISOString(),
      type,
      nodeId,
      lessonId,
      conceptId,
      durationSeconds,
      details
    };

    this.events.push(newEvent);

    // Maintain a hard cap of 1000 history records to avoid client-side bloat
    if (this.events.length > 1000) {
      this.events.shift();
    }

    return newEvent;
  }

  public getHistory(): SessionHistoryEvent[] {
    return [...this.events];
  }

  public getHistoryBySession(sessionId: string): SessionHistoryEvent[] {
    return this.events.filter(event => event.sessionId === sessionId);
  }

  public getTotalDurationBySession(sessionId: string): number {
    return this.events
      .filter(event => event.sessionId === sessionId)
      .reduce((sum, event) => sum + event.durationSeconds, 0);
  }

  public getDurationByNode(nodeId: string): number {
    return this.events
      .filter(event => event.nodeId === nodeId)
      .reduce((sum, event) => sum + event.durationSeconds, 0);
  }

  public clearHistory(): void {
    this.events = [];
  }
}
