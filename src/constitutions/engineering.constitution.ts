import { Constitution } from "../types/constitution.ts";

export const engineeringConstitution: Constitution = {
  id: "const-engineering-v1",
  version: "1.0.0",
  title: "ZANA Systems Engineering Constitution",
  description: "Sets architectural, type safety, state persistence, and communication standards for the codebase.",
  priority: 90,
  metadata: {
    stateKey: "zana_student_profile_v1",
    progressKey: "zana_student_progress_v1",
    apiTimeoutMs: 15000,
  },
  rules: [
    {
      id: "eng-rule-type-safety",
      title: "Strict Type Integrity",
      description: "Avoid using 'any' declarations. All shared properties, payloads, and states must resolve to defined interfaces in our types hierarchy.",
      severity: "critical",
      enabled: true,
    },
    {
      id: "eng-rule-persistence-integrity",
      title: "Atomic State Hydration",
      description: "Any client-side persistence changes must be validated against storage templates to prevent corrupted state values from crashing the UI.",
      severity: "critical",
      enabled: true,
    },
    {
      id: "eng-rule-error-confinement",
      title: "Graceful API Failure Containment",
      description: "All server API requests must be protected with local try-catch blocks and present clean localized Sorani error cards instead of showing unhandled white screens.",
      severity: "high",
      enabled: true,
    },
  ],
};
