import { LearningMemory } from "../types/aiBrain.ts";

export class MemoryEngine {
  /**
   * Initializes a pristine, empty student learning memory state
   */
  public createEmptyLearningMemory(): LearningMemory {
    return {
      recentMistakes: [],
      weakAreas: [],
      masteredTopics: [],
      lastActiveSubject: "math",
      lastAssessmentResult: null
    };
  }

  /**
   * Performs an atomic merge of an existing memory with incoming updates.
   * Ensures list attributes remain unique and deduplicated.
   */
  public mergeLearningMemory(
    current: LearningMemory,
    update: Partial<LearningMemory>
  ): LearningMemory {
    const recentMistakes = this.deduplicate([
      ...(current.recentMistakes || []),
      ...(update.recentMistakes || [])
    ]);

    const weakAreas = this.deduplicate([
      ...(current.weakAreas || []),
      ...(update.weakAreas || [])
    ]);

    const masteredTopics = this.deduplicate([
      ...(current.masteredTopics || []),
      ...(update.masteredTopics || [])
    ]);

    return {
      recentMistakes,
      weakAreas,
      masteredTopics,
      lastActiveSubject: update.lastActiveSubject || current.lastActiveSubject,
      lastAssessmentResult: update.lastAssessmentResult !== undefined 
        ? update.lastAssessmentResult 
        : current.lastAssessmentResult
    };
  }

  /**
   * Helper utility to deduplicate string arrays
   */
  private deduplicate(arr: string[]): string[] {
    return Array.from(new Set(arr.filter(Boolean)));
  }
}
