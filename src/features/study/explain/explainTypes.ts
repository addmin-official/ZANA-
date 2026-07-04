export type ExplainSectionType =
  | "theory"
  | "steps"
  | "example"
  | "common_mistake"
  | "mini_practice"
  | "next_step";

export interface ExplainSection {
  id: string;
  type: ExplainSectionType;
  title: string;
  body: string;
  order: number;
}

export interface ExplainSnapshot {
  generatedAt: string;
  lessonTitle: string;
  conceptTitle: string;
  subjectLabel: string;
  gradeLabel: string;
  streamLabel: string;
  difficultyLabel: string;
  estimatedMinutes: number;
  sections: ExplainSection[];
  warnings: string[];
}
