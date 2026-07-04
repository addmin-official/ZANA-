import { CurriculumContext, CurriculumResolution } from "./types.ts";
import { STREAM_LABELS } from "./data/streamCatalog.ts";
import { GRADE_LABELS } from "./data/gradeCatalog.ts";
import { SUBJECT_LABELS } from "./data/subjectCatalog.ts";
import { CurriculumRegistry } from "./CurriculumRegistry.ts";

export class CurriculumResolver {
  private registry: CurriculumRegistry;

  constructor(registry: CurriculumRegistry) {
    this.registry = registry;
  }

  public resolveCurriculum(context: CurriculumContext): CurriculumResolution {
    const subjectLabel = SUBJECT_LABELS[context.subject] || context.subject;
    const gradeLabel = GRADE_LABELS[context.grade] || context.grade;
    const streamLabel = STREAM_LABELS[context.stream] || context.stream;

    // Get nodes matching context
    const availableNodes = this.registry.getNodesByContext(context);

    const warnings: string[] = [];

    // If stream is general for grade 11 or 12
    if (context.stream === "general" && (context.grade === "11" || context.grade === "12")) {
      warnings.push("بۆ پۆلی ١١ و ١٢، دیاریکردنی ڕێڕەوی زانستی یان وێژەیی پێویستە بۆ فێربوونی وردتر.");
    }

    // If requested stream/subject combination has limited starter content
    if (availableNodes.length > 0 && availableNodes.length < 15) {
      warnings.push("ئەم بەشە لە ئێستادا وەک بناغەی سەرەتایی زیادکراوە، نەک وەک کۆرسی تەواوی فەرمی.");
    }

    return {
      context,
      subjectLabel,
      gradeLabel,
      streamLabel,
      availableNodes,
      warnings
    };
  }
}
