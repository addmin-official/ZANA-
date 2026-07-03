import { KnowledgeGraphState, KnowledgeNode } from "./types.ts";

export class KnowledgeGraphEngine {
  private nodes: Record<string, KnowledgeNode> = {};
  private completedNodeIds: Set<string> = new Set();
  private blockedNodeIds: Set<string> = new Set();

  constructor() {
    this.seedCurriculum();
    this.recalculateBlocking();
  }

  private seedCurriculum(): void {
    // We seed real structure to avoid empty states
    const initialNodes: KnowledgeNode[] = [
      // SUBJECTS
      { id: "sub_math", type: "subject", label: "بیرکاری", dependencies: [] },
      { id: "sub_physics", type: "subject", label: "فیزیا", dependencies: [] },
      { id: "sub_chemistry", type: "subject", label: "کیمیا", dependencies: [] },
      { id: "sub_english", type: "subject", label: "ئینگلیزی", dependencies: [] },

      // MATH - Chapter 1: Calculus
      { id: "ch_calculus", type: "chapter", label: "ژمارەیی و تەواوکاری", parentId: "sub_math", dependencies: [] },
      { id: "les_limits", type: "lesson", label: "سەرەتاکانی لادان و سنوور", parentId: "ch_calculus", dependencies: [] },
      { id: "top_limits_infinity", type: "topic", label: "سنوور لە بێکۆتاییدا", parentId: "les_limits", dependencies: [] },
      { id: "con_limit_def", type: "concept", label: "پێناسەی ماتماتیکی سنوور", parentId: "top_limits_infinity", dependencies: [] },
      { id: "sk_calc_limits", type: "skill", label: "شیکارکردنی لادان بە بەکارهێنانی سنوور", parentId: "con_limit_def", dependencies: [] },

      // MATH - Chapter 2: Differentiation (Depends on Calculus Chapter 1)
      { id: "ch_differentiation", type: "chapter", label: "داتاشراو", parentId: "sub_math", dependencies: ["ch_calculus"] },
      { id: "les_derivatives", type: "lesson", label: "یاساکانی داتاشراو", parentId: "ch_differentiation", dependencies: ["les_limits"] },
      { id: "top_chain_rule", type: "topic", label: "یاسای زنجیرەیی", parentId: "les_derivatives", dependencies: ["top_limits_infinity"] },
      { id: "con_tangent_slope", type: "concept", label: "لێژی لێکەوت", parentId: "top_chain_rule", dependencies: ["con_limit_def"] },

      // PHYSICS - Chapter 1: Mechanics
      { id: "ch_mechanics", type: "chapter", label: "میکانیک و جووڵە", parentId: "sub_physics", dependencies: [] },
      { id: "les_forces", type: "lesson", label: "هێز و یاساکانی نیوتن", parentId: "ch_mechanics", dependencies: [] },
      { id: "top_gravity", type: "topic", label: "کێشکردنی گەردوونی", parentId: "les_forces", dependencies: [] },
      { id: "con_free_fall", type: "concept", label: "کەوتنی ئازاد", parentId: "top_gravity", dependencies: [] },

      // CHEMISTRY - Chapter 1: Atomic Structure
      { id: "ch_atomic", type: "chapter", label: "پێکهاتەی گەردیلە", parentId: "sub_chemistry", dependencies: [] },
      { id: "les_orbitals", type: "lesson", label: "خولگەکان و ئاستی وزە", parentId: "ch_atomic", dependencies: [] },
      { id: "top_quantum", type: "topic", label: "ژمارە کوانتەمەکان", parentId: "les_orbitals", dependencies: [] },
      { id: "con_electron_config", type: "concept", label: "دابەشبوونی ئەلیکترۆنی", parentId: "top_quantum", dependencies: [] },

      // ENGLISH - Chapter 1: Grammar
      { id: "ch_grammar", type: "chapter", label: "ڕێزمان (Grammar)", parentId: "sub_english", dependencies: [] },
      { id: "les_tenses", type: "lesson", label: "کاتی ڕستەکان (Tenses)", parentId: "ch_grammar", dependencies: [] },
      { id: "top_passive", type: "topic", label: "ڕستەی نەدیار (Passive Voice)", parentId: "les_tenses", dependencies: [] },
      { id: "con_conditionals", type: "concept", label: "ڕستەی مەرجی (Conditionals)", parentId: "top_passive", dependencies: [] }
    ];

    for (const node of initialNodes) {
      this.nodes[node.id] = node;
    }
  }

  public getSnapshot(): KnowledgeGraphState {
    return {
      nodes: { ...this.nodes },
      completedNodeIds: new Set(this.completedNodeIds),
      blockedNodeIds: new Set(this.blockedNodeIds)
    };
  }

  public addNode(node: KnowledgeNode): void {
    this.nodes[node.id] = node;
    this.recalculateBlocking();
  }

  public completeNode(nodeId: string): void {
    if (!this.nodes[nodeId]) return;
    if (this.blockedNodeIds.has(nodeId)) return; // Cannot complete blocked node

    this.completedNodeIds.add(nodeId);
    this.recalculateBlocking();
  }

  public resetCompletion(): void {
    this.completedNodeIds.clear();
    this.recalculateBlocking();
  }

  public recalculateBlocking(): void {
    this.blockedNodeIds.clear();
    for (const id of Object.keys(this.nodes)) {
      const node = this.nodes[id];
      // A node is blocked if any of its dependency nodes are NOT completed
      const hasUnresolvedDependency = node.dependencies.some(depId => !this.completedNodeIds.has(depId));
      if (hasUnresolvedDependency) {
        this.blockedNodeIds.add(id);
      }
    }
  }

  public getChildren(parentId: string): KnowledgeNode[] {
    return Object.values(this.nodes).filter(node => node.parentId === parentId);
  }

  public getHierarchyPath(nodeId: string): KnowledgeNode[] {
    const path: KnowledgeNode[] = [];
    let current = this.nodes[nodeId];
    while (current) {
      path.unshift(current);
      if (current.parentId) {
        current = this.nodes[current.parentId];
      } else {
        break;
      }
    }
    return path;
  }
}
