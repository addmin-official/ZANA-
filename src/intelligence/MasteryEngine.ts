import { ConceptMastery, MasteryStatus } from "./types.ts";

export class MasteryEngine {
  private masteryMap: Record<string, ConceptMastery> = {};

  constructor(initialMastery?: Record<string, ConceptMastery>) {
    if (initialMastery) {
      this.masteryMap = { ...initialMastery };
    }
  }

  public getSnapshot(): Record<string, ConceptMastery> {
    return { ...this.masteryMap };
  }

  public getConceptMastery(conceptId: string): ConceptMastery {
    return this.masteryMap[conceptId] || {
      conceptId,
      value: 0.0,
      status: "Not Started",
      lastUpdated: new Date().toISOString()
    };
  }

  public recordExerciseResult(conceptId: string, isCorrect: boolean): ConceptMastery {
    const current = this.getConceptMastery(conceptId);
    let newValue = current.value;

    if (isCorrect) {
      // Mastery gains are progressive but require consistent correct answers
      newValue = Math.min(1.0, Number((newValue + 0.15).toFixed(2)));
    } else {
      // Failure decreases mastery, prompting "Review Needed"
      newValue = Math.max(0.0, Number((newValue - 0.20).toFixed(2)));
    }

    let status: MasteryStatus = "Not Started";
    if (newValue === 0.0) {
      status = "Not Started";
    } else if (newValue < 0.4) {
      status = "Learning";
    } else if (newValue < 0.75) {
      status = "Practicing";
    } else if (newValue < 0.95) {
      status = "Mastered";
    } else {
      status = "Mastered"; // Fully mastered!
    }

    // If student was Mastered but drop value below 0.75, flag as "Review Needed"
    if (!isCorrect && current.status === "Mastered" && newValue < 0.8) {
      status = "Review Needed";
    }

    const updated: ConceptMastery = {
      conceptId,
      value: newValue,
      status,
      lastUpdated: new Date().toISOString()
    };

    this.masteryMap[conceptId] = updated;
    return updated;
  }

  public triggerSpacedRepetitionReview(conceptId: string): void {
    const current = this.masteryMap[conceptId];
    if (current && current.status === "Mastered") {
      this.masteryMap[conceptId] = {
        ...current,
        status: "Review Needed",
        lastUpdated: new Date().toISOString()
      };
    }
  }
}
