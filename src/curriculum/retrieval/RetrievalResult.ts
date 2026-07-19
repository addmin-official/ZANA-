import { CurriculumLesson, SourceMetadata } from "../domain/CurriculumTypes.ts";
import { UsageDecision } from "../licensing/ContentLicense.ts";

export type GroundingStatus = "UNGROUNDED" | "GROUNDED";

export interface RetrievalResult {
  groundingStatus: GroundingStatus;
  matchedLessons: CurriculumLesson[];
  matchedConcepts: string[];
  excerpts: string[];
  confidence: number; // 0.0 to 1.0
  sourceMetadata: SourceMetadata[];
  licenseDecision: UsageDecision | null;
  auditMetadata: Record<string, unknown>;
}
