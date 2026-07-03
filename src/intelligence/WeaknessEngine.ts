import { WeaknessState, ConceptWeakness } from "./types.ts";

export class WeaknessEngine {
  private conceptWeaknesses: Record<string, ConceptWeakness> = {};
  private weakChapterIds: Set<string> = new Set();
  private weakSubjectIds: Set<string> = new Set();

  constructor(initialState?: Partial<WeaknessState>) {
    if (initialState?.conceptWeaknesses) {
      this.conceptWeaknesses = { ...initialState.conceptWeaknesses };
    }
    if (initialState?.weakChapterIds) {
      this.weakChapterIds = new Set(initialState.weakChapterIds);
    }
    if (initialState?.weakSubjectIds) {
      this.weakSubjectIds = new Set(initialState.weakSubjectIds);
    }
  }

  public getSnapshot(): WeaknessState {
    return {
      conceptWeaknesses: { ...this.conceptWeaknesses },
      weakChapterIds: new Set(this.weakChapterIds),
      weakSubjectIds: new Set(this.weakSubjectIds)
    };
  }

  public recordWrongAttempt(conceptId: string, chapterId?: string, subjectId?: string): void {
    const existing = this.conceptWeaknesses[conceptId];
    const wrongCount = existing ? existing.wrongAttemptsCount + 1 : 1;
    const retries = existing ? existing.retryCount + 1 : 1;
    
    this.conceptWeaknesses[conceptId] = {
      conceptId,
      wrongAttemptsCount: wrongCount,
      lastAttemptTimestamp: new Date().toISOString(),
      isForgotten: wrongCount >= 3,
      isLowConfidence: wrongCount >= 2,
      retryCount: retries
    };

    // Flag weak areas higher up in the hierarchy if threshold crossed
    if (wrongCount >= 3) {
      if (chapterId) this.weakChapterIds.add(chapterId);
      if (subjectId) this.weakSubjectIds.add(subjectId);
    }
  }

  public recordCorrectAttempt(conceptId: string, chapterId?: string, subjectId?: string): void {
    const existing = this.conceptWeaknesses[conceptId];
    if (!existing) return;

    // Decay weakness on correct answers
    const wrongCount = Math.max(0, existing.wrongAttemptsCount - 1);
    
    if (wrongCount === 0) {
      delete this.conceptWeaknesses[conceptId];
      // Check if we should clear chapter/subject flags
      this.recomputeGroupWeaknesses(chapterId, subjectId);
    } else {
      this.conceptWeaknesses[conceptId] = {
        ...existing,
        wrongAttemptsCount: wrongCount,
        lastAttemptTimestamp: new Date().toISOString(),
        isForgotten: wrongCount >= 3,
        isLowConfidence: wrongCount >= 2
      };
    }
  }

  public flagAsForgotten(conceptId: string): void {
    const existing = this.conceptWeaknesses[conceptId];
    this.conceptWeaknesses[conceptId] = {
      conceptId,
      wrongAttemptsCount: existing ? existing.wrongAttemptsCount : 1,
      lastAttemptTimestamp: new Date().toISOString(),
      isForgotten: true,
      isLowConfidence: true,
      retryCount: existing ? existing.retryCount : 0
    };
  }

  private recomputeGroupWeaknesses(chapterId?: string, subjectId?: string): void {
    // If no more active weaknesses exist in this chapter/subject, remove flags
    if (chapterId) {
      const activeInChapter = Object.values(this.conceptWeaknesses).some(cw => cw.wrongAttemptsCount >= 3);
      if (!activeInChapter) {
        this.weakChapterIds.delete(chapterId);
      }
    }
    if (subjectId) {
      const activeInSubject = Object.values(this.conceptWeaknesses).some(cw => cw.wrongAttemptsCount >= 4);
      if (!activeInSubject) {
        this.weakSubjectIds.delete(subjectId);
      }
    }
  }
}
