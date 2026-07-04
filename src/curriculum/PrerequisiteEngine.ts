import { CurriculumRegistry } from "./CurriculumRegistry.ts";

export class PrerequisiteEngine {
  private registry: CurriculumRegistry;

  constructor(registry: CurriculumRegistry) {
    this.registry = registry;
  }

  public isNodeUnlocked(nodeId: string, completedNodeIds: Set<string>): boolean {
    const node = this.registry.getNode(nodeId);
    if (!node) return false;

    for (const preId of node.prerequisiteIds) {
      if (!completedNodeIds.has(preId)) {
        return false;
      }
    }
    return true;
  }

  public getMissingPrerequisites(nodeId: string, completedNodeIds: Set<string>): string[] {
    const node = this.registry.getNode(nodeId);
    if (!node) return [];

    return node.prerequisiteIds.filter(preId => !completedNodeIds.has(preId));
  }
}
