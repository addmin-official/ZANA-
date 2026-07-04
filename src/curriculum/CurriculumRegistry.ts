import { CurriculumNode, CurriculumContext } from "./types.ts";

export class CurriculumRegistry {
  private nodes: CurriculumNode[];

  constructor(nodes: CurriculumNode[]) {
    this.nodes = nodes;
  }

  public getNode(id: string): CurriculumNode | undefined {
    return this.nodes.find(node => node.id === id);
  }

  public getNodesByContext(context: Partial<CurriculumContext>): CurriculumNode[] {
    return this.nodes.filter(node => {
      if (context.grade && node.grade !== context.grade) return false;
      if (context.stream && node.stream !== context.stream) return false;
      if (context.subject && node.subject !== context.subject) return false;
      return true;
    });
  }

  public getChildren(parentId: string): CurriculumNode[] {
    return this.nodes.filter(node => node.parentId === parentId);
  }

  public getPrerequisites(nodeId: string): CurriculumNode[] {
    const node = this.getNode(nodeId);
    if (!node) return [];
    return node.prerequisiteIds
      .map(id => this.getNode(id))
      .filter((n): n is CurriculumNode => n !== undefined);
  }

  public getAllNodes(): CurriculumNode[] {
    return this.nodes;
  }
}

export function createCurriculumRegistry(nodes: CurriculumNode[]): CurriculumRegistry {
  return new CurriculumRegistry(nodes);
}
