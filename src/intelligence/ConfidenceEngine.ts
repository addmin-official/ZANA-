import { ConceptConfidence } from "./types.ts";

export class ConfidenceEngine {
  private confidenceMap: Record<string, ConceptConfidence> = {};

  constructor(initialConfidence?: Record<string, ConceptConfidence>) {
    if (initialConfidence) {
      this.confidenceMap = { ...initialConfidence };
    }
  }

  public getSnapshot(): Record<string, ConceptConfidence> {
    return { ...this.confidenceMap };
  }

  public getConceptConfidence(conceptId: string): ConceptConfidence {
    return this.confidenceMap[conceptId] || {
      conceptId,
      confidenceScore: 0.5, // neutral starting point
      ratingHistory: []
    };
  }

  public recordSelfRating(conceptId: string, score: number): ConceptConfidence {
    // Clamp score between 0.0 and 1.0
    const clampedScore = Math.max(0.0, Math.min(1.0, score));
    const current = this.getConceptConfidence(conceptId);
    
    const timestamp = new Date().toISOString();
    const updatedHistory = [...current.ratingHistory, { score: clampedScore, timestamp }].slice(-10); // keep last 10 entries
    
    const updated: ConceptConfidence = {
      conceptId,
      confidenceScore: clampedScore,
      ratingHistory: updatedHistory
    };

    this.confidenceMap[conceptId] = updated;
    return updated;
  }

  public inferConfidenceFromCorrectness(conceptId: string, isCorrect: boolean): void {
    const current = this.getConceptConfidence(conceptId);
    let delta = isCorrect ? 0.08 : -0.12;
    
    const newScore = Math.max(0.0, Math.min(1.0, Number((current.confidenceScore + delta).toFixed(2))));
    const timestamp = new Date().toISOString();
    const updatedHistory = [...current.ratingHistory, { score: newScore, timestamp }].slice(-10);

    this.confidenceMap[conceptId] = {
      conceptId,
      confidenceScore: newScore,
      ratingHistory: updatedHistory
    };
  }
}
