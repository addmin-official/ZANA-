import { CurriculumNode } from "./types.ts";

export class CurriculumGraphEngine {
  private nodes: CurriculumNode[];
  private nodeMap: Map<string, CurriculumNode>;
  private childrenMap: Map<string, string[]>;
  private dependentsMap: Map<string, string[]>;

  constructor(nodes: CurriculumNode[]) {
    this.nodes = nodes;
    this.nodeMap = new Map();
    this.childrenMap = new Map();
    this.dependentsMap = new Map();
    this.buildGraph();
  }

  private buildGraph(): void {
    for (const node of this.nodes) {
      this.nodeMap.set(node.id, node);

      if (node.parentId) {
        const children = this.childrenMap.get(node.parentId) || [];
        children.push(node.id);
        this.childrenMap.set(node.parentId, children);
      }

      for (const reqId of node.prerequisiteIds) {
        const deps = this.dependentsMap.get(reqId) || [];
        deps.push(node.id);
        this.dependentsMap.set(reqId, deps);
      }
    }
  }

  public getBlockedNodeIds(completedNodeIds: Set<string>): string[] {
    const blocked: string[] = [];
    for (const node of this.nodes) {
      for (const prereqId of node.prerequisiteIds) {
        if (!completedNodeIds.has(prereqId)) {
          blocked.push(node.id);
          break; // Blocked if any prerequisite is not completed
        }
      }
    }
    return blocked;
  }

  public getChildren(parentId: string): string[] {
    return this.childrenMap.get(parentId) || [];
  }

  public getDependents(nodeId: string): string[] {
    return this.dependentsMap.get(nodeId) || [];
  }

  public getNode(id: string): CurriculumNode | undefined {
    return this.nodeMap.get(id);
  }
}

export function buildCurriculumGraph(nodes: CurriculumNode[]): CurriculumGraphEngine {
  return new CurriculumGraphEngine(nodes);
}
