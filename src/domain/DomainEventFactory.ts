import { DomainEvent, DomainEventType, DomainEventSource, EventMetadata } from "./types.ts";
import { DomainEventClass } from "./DomainEvent.ts";

export class DomainEventFactory {
  public static createEvent<K extends DomainEventType>(
    type: K,
    studentId: string,
    source: DomainEventSource,
    payload: (K extends keyof import("./types.ts").DomainEventMap
      ? import("./types.ts").DomainEventMap[K]["payload"]
      : Record<string, unknown>),
    metadata?: EventMetadata
  ): DomainEvent {
    const eventObj = new DomainEventClass({
      type,
      studentId,
      source,
      payload,
      metadata
    });
    return eventObj as unknown as DomainEvent;
  }
}
