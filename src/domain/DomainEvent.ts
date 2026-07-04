import { BaseDomainEvent, DomainEventType, DomainEventSource, EventMetadata } from "./types.ts";

export class DomainEventClass<T = Record<string, unknown>> implements BaseDomainEvent<T> {
  public readonly id: string;
  public readonly type: DomainEventType;
  public readonly studentId: string;
  public readonly occurredAt: string;
  public readonly source: DomainEventSource;
  public readonly payload: T;
  public readonly metadata?: EventMetadata;

  constructor(params: {
    id?: string;
    type: DomainEventType;
    studentId: string;
    occurredAt?: string;
    source: DomainEventSource;
    payload: T;
    metadata?: EventMetadata;
  }) {
    this.id = params.id || `evt_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    this.type = params.type;
    this.studentId = params.studentId;
    this.occurredAt = params.occurredAt || new Date().toISOString();
    this.source = params.source;
    this.payload = params.payload;
    this.metadata = params.metadata;
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      type: this.type,
      studentId: this.studentId,
      occurredAt: this.occurredAt,
      source: this.source,
      payload: this.payload,
      metadata: this.metadata,
    };
  }

  public static fromJSON<P = Record<string, unknown>>(json: Record<string, unknown>): DomainEventClass<P> {
    if (typeof json.type !== "string" || typeof json.studentId !== "string") {
      throw new Error("Invalid JSON structure for DomainEvent");
    }

    return new DomainEventClass<P>({
      id: json.id as string,
      type: json.type as DomainEventType,
      studentId: json.studentId as string,
      occurredAt: json.occurredAt as string,
      source: json.source as DomainEventSource,
      payload: json.payload as P,
      metadata: json.metadata as EventMetadata,
    });
  }
}
