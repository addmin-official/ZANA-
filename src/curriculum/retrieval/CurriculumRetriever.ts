import { CurriculumProvider } from "../providers/CurriculumProvider.ts";
import { LicensedCurriculumProvider } from "../providers/LicensedCurriculumProvider.ts";
import { ContentUsageGuard } from "../licensing/ContentUsageGuard.ts";
import { RetrievalResult } from "./RetrievalResult.ts";
import { NoSourceFallback } from "./NoSourceFallback.ts";
import { SourceMetadata, CurriculumLesson } from "../domain/CurriculumTypes.ts";
import { UsageDecision } from "../licensing/ContentLicense.ts";

export interface RetrievalOptions {
  grade: string;
  stream?: string;
  subject: string;
  lessonTitle?: string;
  conceptTitle?: string;
  query?: string;
  maxResults?: number;
}

export class CurriculumRetriever {
  private provider: CurriculumProvider;
  private usageGuard: ContentUsageGuard;

  constructor(provider?: CurriculumProvider) {
    this.provider = provider || new LicensedCurriculumProvider();
    this.usageGuard = new ContentUsageGuard();
  }

  public async retrieve(options: RetrievalOptions): Promise<RetrievalResult> {
    const { grade, stream, subject, lessonTitle, conceptTitle, query, maxResults = 3 } = options;

    try {
      // 1. Retrieve raw candidate lessons from provider
      const candidates = await this.provider.retrieveContext(
        grade,
        subject,
        lessonTitle,
        conceptTitle,
        query
      );

      // Filter by optional stream if present
      const streamFiltered = stream
        ? candidates.filter((c) => !c.stream || c.stream === stream)
        : candidates;

      // 2. Guard content by checking license decisions
      const allowedLessons: CurriculumLesson[] = [];
      let lastDecision: UsageDecision | null = null;

      for (const lesson of streamFiltered) {
        const decision = this.usageGuard.guardContent(lesson, "RETRIEVE");
        lastDecision = decision;
        if (decision.allowed) {
          allowedLessons.push(lesson);
        }
        if (allowedLessons.length >= maxResults) {
          break;
        }
      }

      // 3. Fallback if no allowed lessons matched
      if (allowedLessons.length === 0) {
        return NoSourceFallback.getFallbackResult(grade, subject, query);
      }

      // 4. Extract concepts, excerpts and source metadata
      const matchedConcepts: string[] = [];
      const excerpts: string[] = [];
      const sourceMetadataList: SourceMetadata[] = [];

      for (const lesson of allowedLessons) {
        matchedConcepts.push(...lesson.concepts);

        // Build elegant, grounded educational excerpt from lesson properties
        const learningObjStr = lesson.learningObjectives.join(", ");
        const skillsStr = lesson.skills.join(", ");
        const conceptsStr = lesson.concepts.join(", ");
        
        let excerpt = `وانە: ${lesson.title}
چەمکە سەرەکییەکان: ${conceptsStr}
ئامانجەکانی فێربوون: ${learningObjStr}
مەهارەتەکان: ${skillsStr}`;

        if (lesson.contentExcerpts && lesson.contentExcerpts.length > 0) {
          excerpt += `\nڕوونکردنەوە و ناوەڕۆک:\n` + lesson.contentExcerpts.join("\n");
        }

        excerpts.push(excerpt);

        // Map source metadata
        const meta = lesson.metadata?.sourceMetadata as SourceMetadata | undefined;
        if (meta) {
          sourceMetadataList.push(meta);
        } else {
          // Provide generic/fallback metadata
          sourceMetadataList.push({
            publisher: "ZANA",
            attributionText: `ئەم بابەتە بەپێی پڕۆگرامی فەرمی پۆلی ${lesson.grade} ڕێکخراوە.`,
          });
        }
      }

      // 5. Calculate confidence score
      let confidence = 0.5;
      if (lessonTitle || conceptTitle) {
        const hasExactLessonMatch = allowedLessons.some(
          (l) => l.title.toLowerCase() === lessonTitle?.toLowerCase()
        );
        const hasExactConceptMatch = allowedLessons.some((l) =>
          l.concepts.some((c) => c.toLowerCase() === conceptTitle?.toLowerCase())
        );
        if (hasExactLessonMatch) {
          confidence = 1.0;
        } else if (hasExactConceptMatch) {
          confidence = 0.9;
        } else {
          confidence = 0.75;
        }
      } else if (query) {
        confidence = 0.7;
      }

      return {
        groundingStatus: "GROUNDED",
        matchedLessons: allowedLessons,
        matchedConcepts: Array.from(new Set(matchedConcepts)),
        excerpts,
        confidence,
        sourceMetadata: sourceMetadataList,
        licenseDecision: lastDecision,
        auditMetadata: {
          retrievedAt: new Date().toISOString(),
          providerType: this.provider.constructor.name,
          matchesCount: allowedLessons.length,
          evaluationGrade: grade,
          evaluationSubject: subject,
        },
      };
    } catch (error) {
      console.error("Retrieval failed, falling back to ungrounded mode:", error);
      return NoSourceFallback.getFallbackResult(grade, subject, query);
    }
  }
}
