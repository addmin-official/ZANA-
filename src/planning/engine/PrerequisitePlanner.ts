import { CurriculumRegistry } from "../../curriculum/CurriculumRegistry.ts";
import { PrerequisiteEngine } from "../../curriculum/PrerequisiteEngine.ts";
import { CurriculumGraphEngine } from "../../curriculum/CurriculumGraphEngine.ts";
import { StudentMasteryProfile } from "../../learning/domain/MasteryTypes.ts";

export interface PrerequisitePlanResult {
  targetConceptId: string;
  missingPrerequisiteConceptIds: string[];
  recommendedSequence: string[];
  hasCycle: boolean;
}

export class PrerequisitePlanner {
  private registry: CurriculumRegistry;
  private prereqEngine: PrerequisiteEngine;
  private graphEngine: CurriculumGraphEngine;

  constructor(registry?: CurriculumRegistry) {
    this.registry = registry || new CurriculumRegistry([]);
    this.prereqEngine = new PrerequisiteEngine(this.registry);
    this.graphEngine = new CurriculumGraphEngine(this.registry.getAllNodes());
  }

  /**
   * Identifies missing or weak prerequisites for a target concept given a student's mastery profile.
   * A prerequisite is considered missing if not completed or if its mastery score is < 0.6.
   */
  public analyzePrerequisites(
    targetConceptId: string,
    masteryProfile: StudentMasteryProfile
  ): PrerequisitePlanResult {
    const completedNodeIds = new Set<string>();

    // Nodes with mastery >= 0.6 are considered completed/mastered
    for (const [cid, state] of Object.entries(masteryProfile.conceptMasteries)) {
      if (state.masteryScore >= 0.6) {
        completedNodeIds.add(cid);
      }
    }

    const missingDirect = this.prereqEngine.getMissingPrerequisites(targetConceptId, completedNodeIds);

    // Topological traversal with cycle protection
    const visited = new Set<string>();
    const temp = new Set<string>();
    const recommendedSequence: string[] = [];
    let hasCycle = false;

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      if (temp.has(nodeId)) {
        hasCycle = true;
        return; // Cycle detected
      }

      temp.add(nodeId);

      const node = this.registry.getNode(nodeId);
      if (node) {
        for (const preId of node.prerequisiteIds) {
          if (!completedNodeIds.has(preId)) {
            visit(preId);
          }
        }
      }

      temp.delete(nodeId);
      visited.add(nodeId);
      if (nodeId !== targetConceptId) {
        recommendedSequence.push(nodeId);
      }
    };

    visit(targetConceptId);

    return {
      targetConceptId,
      missingPrerequisiteConceptIds: missingDirect,
      recommendedSequence,
      hasCycle
    };
  }
}
