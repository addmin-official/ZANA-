export type StudentLevel = "سەرەتا" | "مامناوەند" | "پێشکەوتوو";

export type ZanaMode = "chat" | "assessment" | "report";

export type SubjectKey = "math" | "physics" | "chemistry" | "english";

export interface StudentContext {
  name: string;
  grade: "9" | "10" | "11" | "12" | string;
  subject: SubjectKey;
  level: StudentLevel;
  mode: ZanaMode;
  recentTopic?: string;
  recentLearningState?: string;
}

export interface SafetyResult {
  isEducational: boolean;
  refusalReason?: string;
  refusalMessage?: string; // Polite refusal message in formal Kurdish Sorani
}

export interface LearningMemory {
  recentMistakes: string[];
  weakAreas: string[];
  masteredTopics: string[];
  lastActiveSubject: string;
  lastAssessmentResult: string | null;
}

export interface CurriculumContext {
  grade: string;
  subject: string;
  chapter?: string;
  lesson?: string;
  topic?: string;
  warnings?: string[];
  isWithinScope: boolean;
}

export interface TeachingStrategy {
  strategyName: string;
  explanationDepth: "سادەکردنەوەی تەواو" | "مامناوەند و ڕوون" | "قووڵ و شیکارکەرانە" | string;
  exerciseTrigger: boolean;
  rationale: string;
  instructionDirectives: string[];
}

export interface ZanaBrainInput {
  studentContext: StudentContext;
  studentRequest: string;
  learningMemory?: LearningMemory;
}

export interface ZanaBrainOutput {
  systemPrompt: string;
  safety: SafetyResult;
  context: StudentContext;
  memory: LearningMemory;
  curriculum: CurriculumContext;
  strategy: TeachingStrategy;
}
