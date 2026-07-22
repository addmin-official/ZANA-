import { Constitution } from "../types/constitution.ts";

export const aiConstitution: Constitution = {
  id: "const-ai-v1",
  version: "1.0.0",
  title: "ZANA AI Alignment & Guardrails Constitution",
  description: "Sets technical boundaries for AI models, managing scoping, refusal behavior, and topic safety restrictions.",
  priority: 95,
  metadata: {
    recommendedModels: ["gemini-3.6-flash"],
    scopingLimits: ["math", "physics", "chemistry", "english"],
    refusalResponseCode: "out-of-scope",
  },
  rules: [
    {
      id: "ai-rule-curriculum-scope",
      title: "Strict Curriculum Scoping",
      description: "AI interactions must be bounded by school subjects (grades 9-12 for Mathematics, Physics, Chemistry, and English). Unrelated topics must be politely declined.",
      severity: "critical",
      enabled: true,
    },
    {
      id: "ai-rule-safety-filter",
      title: "Zero-Tolerance Malicious Content Refusal",
      description: "All student or external input containing harmful, adult, political, or abusive prompts must trigger immediate, graceful refusal structures.",
      severity: "critical",
      enabled: true,
    },
    {
      id: "ai-rule-no-hallucinations",
      title: "Accuracy Validation Guidelines",
      description: "AI answers must align with standard scientific facts and formulas. No incorrect formulas should ever be supplied as truth.",
      severity: "high",
      enabled: true,
    },
  ],
};
