import { DomainEvent, DomainEventType } from "./types.ts";

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void | Promise<void>;

export class DomainEventBus {
  private static instance: DomainEventBus;
  private handlers: Map<DomainEventType | "*", Set<EventHandler<any>>> = new Map();

  private constructor() {}

  public static getInstance(): DomainEventBus {
    if (!DomainEventBus.instance) {
      DomainEventBus.instance = new DomainEventBus();
    }
    return DomainEventBus.instance;
  }

  /**
   * Subscribe to a specific domain event type, or "*" for all events.
   */
  public subscribe<T extends DomainEvent>(
    eventType: T["type"] | "*",
    handler: EventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  /**
   * Unsubscribe a handler from a specific domain event type or "*".
   */
  public unsubscribe<T extends DomainEvent>(
    eventType: T["type"] | "*",
    handler: EventHandler<T>
  ): void {
    const set = this.handlers.get(eventType);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  /**
   * Publish a single Domain Event to all registered subscribers.
   */
  public async publish<T extends DomainEvent>(event: T): Promise<void> {
    // 1. Specific type handlers
    const specificHandlers = this.handlers.get(event.type);
    if (specificHandlers) {
      for (const handler of specificHandlers) {
        try {
          await handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
        }
      }
    }

    // 2. Catch-all wildcard handlers
    const wildcardHandlers = this.handlers.get("*");
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          await handler(event);
        } catch (error) {
          console.error(`Error in wildcard event handler for ${event.type}:`, error);
        }
      }
    }
  }

  /**
   * Publish multiple events sequentially.
   */
  public async publishMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Clears all subscriptions from the Event Bus.
   */
  public clear(): void {
    this.handlers.clear();
  }
}

export const domainEventBusInstance = DomainEventBus.getInstance();
