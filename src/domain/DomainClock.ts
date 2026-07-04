export class DomainClock {
  /**
   * Returns current time in ISO 8601 string format.
   */
  public static nowIso(): string {
    return new Date().toISOString();
  }

  /**
   * Checks if a string is a valid ISO 8601 date format.
   */
  public static isValidIsoDate(value: string): boolean {
    if (!value) return false;
    // Check general ISO format
    const isoRegEx = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
    if (!isoRegEx.test(value)) return false;
    
    const d = new Date(value);
    return !isNaN(d.getTime());
  }

  /**
   * Calculates the absolute number of calendar days between two dates.
   */
  public static daysBetween(a: Date | string, b: Date | string): number {
    const d1 = typeof a === "string" ? new Date(a) : a;
    const d2 = typeof b === "string" ? new Date(b) : b;

    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      throw new Error("Invalid date input provided to daysBetween");
    }

    // Set times to midnight to calculate calendar day differences correctly
    const utc1 = Date.UTC(d1.getUTCFullYear(), d1.getUTCMonth(), d1.getUTCDate());
    const utc2 = Date.UTC(d2.getUTCFullYear(), d2.getUTCMonth(), d2.getUTCDate());

    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.abs(Math.floor((utc2 - utc1) / msPerDay));
  }
}
