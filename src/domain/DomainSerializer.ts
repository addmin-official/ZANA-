import { DomainEvent } from "./types.ts";
import { DomainGuards } from "./DomainGuards.ts";

export class DomainSerializer {
  /**
   * Safely converts a Domain Event into a JSON string.
   */
  public static serialize(event: DomainEvent): string {
    if (!DomainGuards.isValidEvent(event)) {
      throw new Error(`Cannot serialize invalid domain event: ${JSON.stringify(event)}`);
    }
    return JSON.stringify(event);
  }

  /**
   * Safely converts an array of Domain Events into a JSON string.
   */
  public static serializeMany(events: DomainEvent[]): string {
    for (const event of events) {
      if (!DomainGuards.isValidEvent(event)) {
        throw new Error(`Cannot serialize invalid domain event: ${JSON.stringify(event)}`);
      }
    }
    return JSON.stringify(events);
  }

  /**
   * Safely parses a JSON string back into a valid typed Domain Event.
   */
  public static deserialize(jsonString: string): DomainEvent {
    try {
      const parsed = JSON.parse(jsonString);
      if (!DomainGuards.isValidEvent(parsed)) {
        throw new Error("Parsed object is not a valid Domain Event structure");
      }
      return parsed;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error";
      throw new Error(`Domain Event deserialization failed: ${msg}`);
    }
  }

  /**
   * Safely parses a JSON string back into an array of valid typed Domain Events.
   */
  public static deserializeMany(jsonString: string): DomainEvent[] {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        throw new Error("Serialized data is not a valid JSON array");
      }

      for (const item of parsed) {
        if (!DomainGuards.isValidEvent(item)) {
          throw new Error("One or more items in the array are invalid Domain Events");
        }
      }

      return parsed as DomainEvent[];
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error";
      throw new Error(`Domain Events bulk deserialization failed: ${msg}`);
    }
  }
}
