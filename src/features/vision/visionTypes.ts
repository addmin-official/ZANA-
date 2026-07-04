export type VisionRequestMode =
  | "extract_only"
  | "explain"
  | "hint"
  | "step_by_step"
  | "formula";

export type VisionImageSource =
  | "camera"
  | "gallery";

export type VisionProcessingStatus =
  | "idle"
  | "validating"
  | "uploading"
  | "extracting"
  | "ready"
  | "failed";

export interface VisionImageInput {
  file: File;
  source: VisionImageSource;
  previewUrl: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
}

export interface VisionStudyContext {
  studentId: string;
  studentName: string;
  grade: string;
  stream: string;
  subject: string;
  level: string;
  lessonTitle?: string;
  conceptTitle?: string;
  sessionId?: string;
}

export interface VisionQuestionResult {
  extractedText: string;
  detectedSubject?: string;
  responseText?: string;
  confidence: "low" | "medium" | "high";
  warnings: string[];
}

export interface VisionSnapshot {
  status: VisionProcessingStatus;
  image?: VisionImageInput;
  selectedMode: VisionRequestMode;
  extractedText: string;
  editableText: string;
  result?: VisionQuestionResult;
  error?: string;
}
