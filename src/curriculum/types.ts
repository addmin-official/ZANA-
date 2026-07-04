export type CurriculumGrade = "9" | "10" | "11" | "12";

export type CurriculumStream = "scientific" | "literary" | "general";

export type CurriculumSubject = "math" | "physics" | "chemistry" | "english";

export type CurriculumDifficulty =
  | "introductory"
  | "basic"
  | "intermediate"
  | "advanced"
  | "exam_level";

export type CurriculumNodeType =
  | "subject"
  | "chapter"
  | "lesson"
  | "topic"
  | "concept"
  | "skill"
  | "formula";

export interface CurriculumNode {
  id: string;
  type: CurriculumNodeType;
  title: string;
  description?: string;
  grade: CurriculumGrade;
  stream: CurriculumStream;
  subject: CurriculumSubject;
  difficulty: CurriculumDifficulty;
  parentId?: string;
  prerequisiteIds: string[];
  estimatedMinutes: number;
  learningObjectives: string[];
  tags: string[];
}

export interface FormulaVariable {
  symbol: string;
  meaning: string;
  unit?: string;
}

export interface FormulaNode extends CurriculumNode {
  type: "formula";
  formula: string;
  variables: FormulaVariable[];
  usageNotes: string[];
}

export interface CurriculumContext {
  grade: CurriculumGrade;
  stream: CurriculumStream;
  subject: CurriculumSubject;
  activeNodeId?: string;
}

export interface CurriculumResolution {
  context: CurriculumContext;
  subjectLabel: string;
  gradeLabel: string;
  streamLabel: string;
  availableNodes: CurriculumNode[];
  warnings: string[];
}

export interface LearningPath {
  context: CurriculumContext;
  orderedNodeIds: string[];
  nextRecommendedNodeId?: string;
  blockedNodeIds: string[];
  estimatedTotalMinutes: number;
}

export interface CurriculumIntelligenceSnapshot {
  resolution: CurriculumResolution;
  learningPath: LearningPath;
  prerequisiteMap: Record<string, string[]>;
  difficultyMap: Record<string, CurriculumDifficulty>;
  formulaMap: Record<string, FormulaNode>;
  scopeWarnings: string[];
}
