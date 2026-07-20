import { AssessmentBlueprint, AssessmentQuestion, AnswerSubmission } from "./AssessmentTypes.ts";
import { CurriculumRegistry } from "../../curriculum/registry/CurriculumRegistry.ts";

export class AssessmentValidation {
  /**
   * Validates an AssessmentBlueprint against official curriculum registries.
   * Throws errors or returns a checklist of errors found.
   */
  public static validateBlueprint(blueprint: AssessmentBlueprint): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const registry = CurriculumRegistry.getInstance();

    // Verify Curriculum exists
    const curriculum = registry.getCurriculum(blueprint.curriculumId);
    if (!curriculum) {
      errors.push(`ڕەخنەگرتن: ناسنامەی پڕۆگرام (${blueprint.curriculumId}) فەرمی نییە یان دەستپێکراو نییە.`);
    }

    // Verify Unit exists if specified
    if (blueprint.unitId) {
      const unit = registry.getUnit(blueprint.unitId);
      if (!unit) {
        errors.push(`پێناسە: یەکەی خوێندنی (${blueprint.unitId}) لە تانەکەی پڕۆگرام دۆزراوە نییە.`);
      } else if (unit.curriculumId !== blueprint.curriculumId) {
        errors.push(`پێناسە: یەکەی دۆزراوە (${blueprint.unitId}) سەر بە پڕۆگرامی دیاریکراو نییە.`);
      }
    }

    // Verify Lesson IDs exist
    if (blueprint.lessonIds && blueprint.lessonIds.length > 0) {
      for (const lid of blueprint.lessonIds) {
        const lesson = registry.getLesson(lid);
        if (!lesson) {
          errors.push(`پێناسە: وانەی داواکراو (${lid}) لە ڕێبەرەکەدا بوونی نییە.`);
        }
      }
    }

    // Validate distributions
    let diffTotal = 0;
    for (const pct of Object.values(blueprint.difficultyDistribution)) {
      if (pct < 0 || pct > 1) {
        errors.push(`بەربەست: ڕێژەی سەختی پێویستە لە نێوان 0 و 1 بێت.`);
      }
      diffTotal += pct;
    }
    if (diffTotal > 0 && Math.abs(diffTotal - 1.0) > 0.001) {
      errors.push(`پێداچوونەوە: دابەشبوونی ئاستی سەختی پێویستە یەکسان بێت بە ١٠٠٪ (1.0).`);
    }

    let typeTotal = 0;
    for (const pct of Object.values(blueprint.questionTypeDistribution)) {
      if (pct < 0 || pct > 1) {
        errors.push(`بەربەست: ڕێژەی جۆری پرسیار پێویستە لە نێوان 0 و 1 بێت.`);
      }
      typeTotal += pct;
    }
    if (typeTotal > 0 && Math.abs(typeTotal - 1.0) > 0.001) {
      errors.push(`پێداچوونەوە: دابەشبوونی جۆری پرسیار پێویستە یەکسان بێت بە ١٠٠٪ (1.0).`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates that a submission has correct fields populated depending on question type.
   */
  public static validateSubmission(question: AssessmentQuestion, submission: AnswerSubmission): boolean {
    if (!submission) return false;

    // Body size / length protections
    if (submission.shortAnswerText && submission.shortAnswerText.length > 1000) {
      return false;
    }

    // Question type rules
    switch (question.type) {
      case "MULTIPLE_CHOICE_SINGLE":
        return !!submission.selectedOptionIds && submission.selectedOptionIds.length === 1;
      case "MULTIPLE_CHOICE_MULTIPLE":
        return !!submission.selectedOptionIds && submission.selectedOptionIds.length > 0;
      case "TRUE_FALSE":
        return submission.trueFalseValue !== undefined;
      case "NUMERIC":
        return submission.numericValue !== undefined && !isNaN(submission.numericValue) && isFinite(submission.numericValue);
      case "SHORT_ANSWER":
        return submission.shortAnswerText !== undefined;
      case "ORDERING":
        return !!submission.orderedIds && submission.orderedIds.length > 0;
      case "MATCHING":
        return !!submission.matchingPairs && Object.keys(submission.matchingPairs).length > 0;
      default:
        return false;
    }
  }
}
