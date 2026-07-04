import { CurriculumNode, FormulaNode, CurriculumSubject } from "./types.ts";

export class FormulaEngine {
  private nodes: CurriculumNode[];

  constructor(nodes: CurriculumNode[]) {
    this.nodes = nodes;
  }

  public getFormulaMap(): Record<string, FormulaNode> {
    const map: Record<string, FormulaNode> = {};
    for (const node of this.nodes) {
      if (node.type === "formula") {
        map[node.id] = node as FormulaNode;
      }
    }
    return map;
  }

  public getFormulasBySubject(subject: CurriculumSubject): FormulaNode[] {
    return this.nodes.filter(
      (node): node is FormulaNode => node.type === "formula" && node.subject === subject
    );
  }

  public formatFormulaForPrompt(formulaId: string): string {
    const node = this.nodes.find(n => n.id === formulaId);
    if (!node || node.type !== "formula") {
      return `فۆرمۆڵای دیاریکراو بە ناسنامەی "${formulaId}" نەدۆزرایەوە.`;
    }

    const formulaNode = node as FormulaNode;

    const variablesFormatted = formulaNode.variables
      .map(v => `- \`${v.symbol}\`: ${v.meaning}${v.unit ? ` (${v.unit})` : ""}`)
      .join("\n");

    const usageFormatted = formulaNode.usageNotes
      .map(n => `- ${n}`)
      .join("\n");

    return `**فۆرمۆڵا:** ${formulaNode.title}
**هاوکێشە:** \`${formulaNode.formula}\`

**گۆڕاوەکان:**
${variablesFormatted}

**تێبینییەکانی بەکارهێنان:**
${usageFormatted}`;
  }
}
