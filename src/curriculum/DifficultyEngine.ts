import { CurriculumNode, CurriculumDifficulty } from "./types.ts";

export class DifficultyEngine {
  public getDifficultyMap(nodes: CurriculumNode[]): Record<string, CurriculumDifficulty> {
    const map: Record<string, CurriculumDifficulty> = {};
    for (const node of nodes) {
      map[node.id] = node.difficulty;
    }
    return map;
  }

  public suggestDifficultyForLevel(level: number | string): CurriculumDifficulty {
    if (typeof level === "number") {
      if (level <= 2) return "introductory";
      if (level <= 4) return "basic";
      if (level <= 6) return "intermediate";
      if (level <= 8) return "advanced";
      return "exam_level";
    }

    const cleanedLevel = level.toLowerCase().trim();
    if (cleanedLevel.includes("starter") || cleanedLevel.includes("begin")) {
      return "introductory";
    }
    if (cleanedLevel.includes("basic") || cleanedLevel.includes("easy")) {
      return "basic";
    }
    if (cleanedLevel.includes("intermediate") || cleanedLevel.includes("medium")) {
      return "intermediate";
    }
    if (cleanedLevel.includes("advanced") || cleanedLevel.includes("hard")) {
      return "advanced";
    }
    if (cleanedLevel.includes("expert") || cleanedLevel.includes("exam") || cleanedLevel.includes("test")) {
      return "exam_level";
    }

    return "intermediate";
  }
}
export const difficultyEngineInstance = new DifficultyEngine();
export function getDifficultyMap(nodes: CurriculumNode[]): Record<string, CurriculumDifficulty> {
  return difficultyEngineInstance.getDifficultyMap(nodes);
}
export function suggestDifficultyForLevel(level: number | string): CurriculumDifficulty {
  return difficultyEngineInstance.suggestDifficultyForLevel(level);
}
