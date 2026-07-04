import {
  CurriculumGrade,
  CurriculumStream,
  CurriculumSubject,
  CurriculumNode,
  FormulaNode,
  CurriculumIntelligenceSnapshot,
  CurriculumContext
} from "./types.ts";
import { CurriculumRegistry } from "./CurriculumRegistry.ts";
import { CurriculumResolver } from "./CurriculumResolver.ts";
import { CurriculumGraphEngine } from "./CurriculumGraphEngine.ts";
import { LearningPathEngine } from "./LearningPathEngine.ts";
import { PrerequisiteEngine } from "./PrerequisiteEngine.ts";
import { DifficultyEngine } from "./DifficultyEngine.ts";
import { FormulaEngine } from "./FormulaEngine.ts";
import { CurriculumScopeEngine } from "./CurriculumScopeEngine.ts";
import { CURRICULUM_SEED } from "./data/curriculum.seed.ts";

export interface CurriculumSnapshotInput {
  grade: CurriculumGrade;
  stream: CurriculumStream;
  subject: CurriculumSubject;
  activeNodeId?: string;
  completedNodeIds?: string[];
}

export class CurriculumIntelligenceEngine {
  private registry: CurriculumRegistry;
  private resolver: CurriculumResolver;
  private graphEngine: CurriculumGraphEngine;
  private pathEngine: LearningPathEngine;
  private prerequisiteEngine: PrerequisiteEngine;
  private difficultyEngine: DifficultyEngine;
  private formulaEngine: FormulaEngine;
  private scopeEngine: CurriculumScopeEngine;

  constructor(customNodes?: CurriculumNode[]) {
    const nodes = customNodes || CURRICULUM_SEED;
    this.registry = new CurriculumRegistry(nodes);
    this.resolver = new CurriculumResolver(this.registry);
    this.graphEngine = new CurriculumGraphEngine(nodes);
    this.pathEngine = new LearningPathEngine(this.registry, this.graphEngine);
    this.prerequisiteEngine = new PrerequisiteEngine(this.registry);
    this.difficultyEngine = new DifficultyEngine();
    this.formulaEngine = new FormulaEngine(nodes);
    this.scopeEngine = new CurriculumScopeEngine();
  }

  public buildCurriculumIntelligenceSnapshot(input: CurriculumSnapshotInput): CurriculumIntelligenceSnapshot {
    const context: CurriculumContext = {
      grade: input.grade,
      stream: input.stream,
      subject: input.subject,
      activeNodeId: input.activeNodeId
    };

    const completedSet = new Set(input.completedNodeIds || []);

    // 1. Resolve context
    const resolution = this.resolver.resolveCurriculum(context);

    // 2. Build learning path
    const learningPath = this.pathEngine.buildLearningPath(context, completedSet);

    // 3. Build prerequisite map for all available nodes
    const prerequisiteMap: Record<string, string[]> = {};
    for (const node of resolution.availableNodes) {
      prerequisiteMap[node.id] = node.prerequisiteIds;
    }

    // 4. Build difficulty map
    const difficultyMap = this.difficultyEngine.getDifficultyMap(resolution.availableNodes);

    // 5. Build formula map
    const formulaMap = this.formulaEngine.getFormulaMap();

    // 6. Generate scope warnings
    const scopeWarnings = this.scopeEngine.getScopeWarnings(context, resolution.availableNodes);

    return {
      resolution,
      learningPath,
      prerequisiteMap,
      difficultyMap,
      formulaMap,
      scopeWarnings
    };
  }

  public getRegistry(): CurriculumRegistry {
    return this.registry;
  }

  public getPrerequisiteEngine(): PrerequisiteEngine {
    return this.prerequisiteEngine;
  }

  public getFormulaEngine(): FormulaEngine {
    return this.formulaEngine;
  }
}

export const curriculumIntelligenceEngineInstance = new CurriculumIntelligenceEngine();

export function buildCurriculumIntelligenceSnapshot(input: CurriculumSnapshotInput): CurriculumIntelligenceSnapshot {
  return curriculumIntelligenceEngineInstance.buildCurriculumIntelligenceSnapshot(input);
}
