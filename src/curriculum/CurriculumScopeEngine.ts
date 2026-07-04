import { CurriculumContext, CurriculumNode } from "./types.ts";

export class CurriculumScopeEngine {
  public getScopeWarnings(context: CurriculumContext, nodes: CurriculumNode[]): string[] {
    const warnings: string[] = [];

    // Always include a general warning to prevent false official claims
    warnings.push("ئەم سەرچاوەیە بۆ پاڵپشتی فێربوونە و جێگەی کتێبی فەرمی وەزارەتی پەروەردە ناگرێتەوە.");

    // Warning about limited coverage
    if (nodes.length === 0) {
      warnings.push("بۆ ئەم پۆل و بابەتە هیچ وانەیەک لە ئێستادا بەردەست نییە. لە داهاتوودا ناوەڕۆکی زیاتر زیاد دەکرێت.");
    } else if (nodes.length < 10) {
      warnings.push("ناوەڕۆکی بەردەست بۆ ئەم پۆل و بابەتە کەمە و تەنها وەک نموونەی فێربوونی سەرەتایی بەکاردێت.");
    }

    // Check stream/subject appropriateness
    if ((context.grade === "11" || context.grade === "12") && context.stream === "literary") {
      if (context.subject === "physics" || context.subject === "chemistry") {
        const subName = context.subject === "physics" ? "فیزیا" : "کیمیا";
        warnings.push(`بابەتی ${subName} تایبەتە بە ڕێڕەوی زانستی و بۆ قوتابیانی ڕێڕەوی وێژەیی لە پڕۆگرامی فەرمیدا نییە.`);
      }
    }

    return warnings;
  }
}
