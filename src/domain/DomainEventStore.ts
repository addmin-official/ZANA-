import { DomainEvent, DomainEventType } from "./types.ts";

export class DomainEventStore {
  private static instance: DomainEventStore;
  private memoryStore: DomainEvent[] = [];
  private readonly STORAGE_KEY = "zana:domain-events";

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): DomainEventStore {
    if (!DomainEventStore.instance) {
      DomainEventStore.instance = new DomainEventStore();
    }
    return DomainEventStore.instance;
  }

  private isLocalStorageAvailable(): boolean {
    try {
      return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
    } catch {
      return false;
    }
  }

  private loadFromStorage(): void {
    if (!this.isLocalStorageAvailable()) return;
    try {
      const dataStr = window.localStorage.getItem(this.STORAGE_KEY);
      if (dataStr) {
        const parsed = JSON.parse(dataStr) as DomainEvent[];
        if (Array.isArray(parsed)) {
          this.memoryStore = parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load domain events from localStorage:", e);
    }
  }

  private saveToStorage(): void {
    if (!this.isLocalStorageAvailable()) return;
    try {
      // Keep only last 2000 events in local storage to prevent quota overflow
      const elementsToSave = this.memoryStore.slice(-2000);
      window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(elementsToSave));
    } catch (e) {
      console.warn("Failed to write domain events to localStorage:", e);
    }
  }

  /**
   * Append a single domain event to the store.
   */
  public append(event: DomainEvent): void {
    this.memoryStore.push(event);
    this.saveToStorage();
  }

  /**
   * Append multiple domain events to the store.
   */
  public appendMany(events: DomainEvent[]): void {
    this.memoryStore.push(...events);
    this.saveToStorage();
  }

  /**
   * Retrieve all logged domain events.
   */
  public getAll(): DomainEvent[] {
    return [...this.memoryStore];
  }

  /**
   * Retrieve all logged events for a given student.
   */
  public getByStudent(studentId: string): DomainEvent[] {
    return this.memoryStore.filter(event => event.studentId === studentId);
  }

  /**
   * Retrieve all logged events of a specific type.
   */
  public getByType(type: DomainEventType): DomainEvent[] {
    return this.memoryStore.filter(event => event.type === type);
  }

  /**
   * Retrieve all logged events occurred on or after the specified date/time.
   */
  public getSince(date: Date | string): DomainEvent[] {
    const timestamp = typeof date === "string" ? new Date(date).getTime() : date.getTime();
    return this.memoryStore.filter(event => new Date(event.occurredAt).getTime() >= timestamp);
  }

  /**
   * Clears all domain events from both local memory and localStorage.
   */
  public clear(): void {
    this.memoryStore = [];
    if (this.isLocalStorageAvailable()) {
      try {
        window.localStorage.removeItem(this.STORAGE_KEY);
      } catch (e) {
        console.warn("Failed to clear localStorage domain events:", e);
      }
    }
  }
}

export const domainEventStoreInstance = DomainEventStore.getInstance();
