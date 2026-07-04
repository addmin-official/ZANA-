import { CurriculumContext, LearningPath } from "./types.ts";
import { CurriculumRegistry } from "./CurriculumRegistry.ts";
import { CurriculumGraphEngine } from "./CurriculumGraphEngine.ts";

export class LearningPathEngine {
  private registry: CurriculumRegistry;
  private graphEngine: CurriculumGraphEngine;

  constructor(registry: CurriculumRegistry, graphEngine: CurriculumGraphEngine) {
    this.registry = registry;
    this.graphEngine = graphEngine;
  }

  public buildLearningPath(context: CurriculumContext, completedNodeIds: Set<string>): LearningPath {
    const nodes = this.registry.getNodesByContext(context);

    const typeWeight: Record<string, number> = {
      subject: 1,
      chapter: 2,
      lesson: 3,
      concept: 4,
      skill: 5,
      formula: 6
    };

    const visited = new Set<string>();
    const temp = new Set<string>();
    const ordered: string[] = [];

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      if (temp.has(nodeId)) {
        return; // Circular reference protection
      }
      temp.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        if (node.parentId && nodes.some(n => n.id === node.parentId)) {
          visit(node.parentId);
        }
        for (const preId of node.prerequisiteIds) {
          if (nodes.some(n => n.id === preId)) {
            visit(preId);
          }
        }
      }

      temp.delete(nodeId);
      visited.add(nodeId);
      ordered.push(nodeId);
    };

    const sortedInitialNodes = [...nodes].sort((a, b) => {
      const wa = typeWeight[a.type] || 99;
      const wb = typeWeight[b.type] || 99;
      if (wa !== wb) return wa - wb;
      return a.id.localeCompare(b.id);
    });

    for (const node of sortedInitialNodes) {
      visit(node.id);
    }

    const blockedNodeIds = this.graphEngine.getBlockedNodeIds(completedNodeIds);

    // Filter blocked nodes to only those in the current context for precision
    const contextNodeIds = new Set(nodes.map(n => n.id));
    const blockedInContext = blockedNodeIds.filter(id => contextNodeIds.has(id));

    let nextRecommendedNodeId: string | undefined = undefined;
    for (const nodeId of ordered) {
      if (!completedNodeIds.has(nodeId) && !blockedInContext.includes(nodeId)) {
        const node = nodes.find(n => n.id === nodeId);
        if (node && node.type !== "subject") {
          nextRecommendedNodeId = nodeId;
          break;
        }
      }
    }

    let estimatedTotalMinutes = 0;
    for (const node of nodes) {
      if (!completedNodeIds.has(node.id)) {
        estimatedTotalMinutes += node.estimatedMinutes;
      }
    }

    return {
      context,
      orderedNodeIds: ordered,
      nextRecommendedNodeId,
      blockedNodeIds: blockedInContext,
      estimatedTotalMinutes
    };
  }
}
