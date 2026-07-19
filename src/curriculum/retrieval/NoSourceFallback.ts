import { RetrievalResult } from "./RetrievalResult.ts";

export class NoSourceFallback {
  public static getFallbackResult(
    grade: string,
    subject: string,
    query?: string
  ): RetrievalResult {
    return {
      groundingStatus: "UNGROUNDED",
      matchedLessons: [],
      matchedConcepts: [],
      excerpts: [],
      confidence: 0,
      sourceMetadata: [],
      licenseDecision: null,
      auditMetadata: {
        fallbackReason: "No matching licensed or open-license curriculum content exists.",
        timestamp: new Date().toISOString(),
        grade,
        subject,
        query,
      },
    };
  }
}
