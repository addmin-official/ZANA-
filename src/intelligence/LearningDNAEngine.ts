import { LearningDNA, ExplanationStyle } from "./types.ts";

export class LearningDNAEngine {
  private dna: LearningDNA;

  constructor(initialDna?: Partial<LearningDNA>) {
    this.dna = {
      preferredStyle: initialDna?.preferredStyle || "step-by-step",
      learningSpeed: initialDna?.learningSpeed !== undefined ? initialDna.learningSpeed : 0.6,
      responseQuality: initialDna?.responseQuality !== undefined ? initialDna.responseQuality : 0.7,
      practiceFrequency: initialDna?.practiceFrequency !== undefined ? initialDna.practiceFrequency : 3,
      confidenceTrend: initialDna?.confidenceTrend || "stable",
      consistency: initialDna?.consistency !== undefined ? initialDna.consistency : 0.8,
      focusScore: initialDna?.focusScore !== undefined ? initialDna.focusScore : 0.75,
      curiosityScore: initialDna?.curiosityScore !== undefined ? initialDna.curiosityScore : 0.7,
      motivationScore: initialDna?.motivationScore !== undefined ? initialDna.motivationScore : 0.8,
    };
  }

  public getSnapshot(): LearningDNA {
    return { ...this.dna };
  }

  public updatePreferredStyle(style: ExplanationStyle): void {
    this.dna.preferredStyle = style;
  }

  public recordInteraction(sessionDurationSeconds: number, correctAnswers: number, totalQuestions: number): void {
    // Dynamically adjust learning metrics based on interaction quality
    if (totalQuestions > 0) {
      const successRate = correctAnswers / totalQuestions;
      this.dna.responseQuality = Number(((this.dna.responseQuality * 0.8) + (successRate * 0.2)).toFixed(2));
      
      if (successRate >= 0.8) {
        this.dna.confidenceTrend = "rising";
        this.dna.motivationScore = Math.min(1.0, Number((this.dna.motivationScore + 0.02).toFixed(2)));
      } else if (successRate < 0.5) {
        this.dna.confidenceTrend = "declining";
        this.dna.motivationScore = Math.max(0.2, Number((this.dna.motivationScore - 0.03).toFixed(2)));
      } else {
        this.dna.confidenceTrend = "stable";
      }
    }

    // Adjust focus score based on session duration (e.g., 5-30 mins is optimal)
    const minutes = sessionDurationSeconds / 60;
    let focusDelta = 0.02;
    if (minutes < 2) {
      focusDelta = -0.05; // Too short
    } else if (minutes > 45) {
      focusDelta = -0.02; // Brain fatigue
    }
    this.dna.focusScore = Math.max(0.1, Math.min(1.0, Number((this.dna.focusScore + focusDelta).toFixed(2))));
  }

  public adjustCuriosity(interactionCount: number): void {
    if (interactionCount > 5) {
      this.dna.curiosityScore = Math.min(1.0, Number((this.dna.curiosityScore + 0.05).toFixed(2)));
    }
  }

  public updateConsistency(sessionGapDays: number): void {
    if (sessionGapDays <= 1) {
      this.dna.consistency = Math.min(1.0, Number((this.dna.consistency + 0.04).toFixed(2)));
    } else {
      const penalty = 0.03 * sessionGapDays;
      this.dna.consistency = Math.max(0.1, Number((this.dna.consistency - penalty).toFixed(2)));
    }
  }
}
