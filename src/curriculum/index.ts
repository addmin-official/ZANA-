export * from "./types.ts";
export * from "./CurriculumRegistry.ts";
export * from "./CurriculumResolver.ts";
export * from "./CurriculumGraphEngine.ts";
export * from "./LearningPathEngine.ts";
export * from "./PrerequisiteEngine.ts";
export * from "./DifficultyEngine.ts";
export * from "./FormulaEngine.ts";
export * from "./CurriculumScopeEngine.ts";
export * from "./CurriculumIntelligenceEngine.ts";

export { STREAM_LABELS } from "./data/streamCatalog.ts";
export { GRADE_LABELS } from "./data/gradeCatalog.ts";
export { SUBJECT_LABELS } from "./data/subjectCatalog.ts";
export { CURRICULUM_SEED } from "./data/curriculum.seed.ts";

// ==========================================================
// PHASE 14 - CURRICULUM INTEGRATION FOUNDATION EXPORTS
// ==========================================================

// Domain Types, Identifiers & Validation
export * from "./domain/CurriculumTypes.ts";
export * from "./domain/CurriculumIdentifiers.ts";
export * from "./domain/CurriculumValidation.ts";

// Sub-Registries
export { CurriculumRegistry as NewCurriculumRegistry } from "./registry/CurriculumRegistry.ts";
export { GradeRegistry } from "./registry/GradeRegistry.ts";
export { SubjectRegistry } from "./registry/SubjectRegistry.ts";

// Providers
export * from "./providers/CurriculumProvider.ts";
export { EmptyCurriculumProvider } from "./providers/EmptyCurriculumProvider.ts";
export { LicensedCurriculumProvider } from "./providers/LicensedCurriculumProvider.ts";

// Retrieval
export * from "./retrieval/CurriculumRetriever.ts";
export * from "./retrieval/RetrievalResult.ts";
export { NoSourceFallback } from "./retrieval/NoSourceFallback.ts";

// Licensing & Usage Guards
export * from "./licensing/ContentLicense.ts";
export { LicensePolicyEngine } from "./licensing/LicensePolicyEngine.ts";
export { ContentUsageGuard } from "./licensing/ContentUsageGuard.ts";

