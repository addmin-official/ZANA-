export interface ChatRequest {
  message: string;
  history?: Array<{ sender: string; text: string }>;
  profile: {
    name?: string;
    grade?: string;
    activeSubject?: string;
    level?: string;
  };
}

export interface ChatResponse {
  text: string;
  isEducational: boolean;
}

export interface AssessmentRequest {
  state: {
    currentQuestion: number;
    questions: string[];
    answers: string[];
  };
  profile: {
    name?: string;
    grade?: string;
    activeSubject?: string;
    level?: string;
  };
}

export interface AssessmentResponse {
  question: string;
  feedback: string;
  isCorrect: boolean;
}

export interface ReportRequest {
  profile: {
    name?: string;
    grade?: string;
    activeSubject?: string;
    level?: string;
  };
  summaryStats?: any;
}

export interface ReportResponse {
  recommendation: string;
}

export interface AskRequest {
  message: string;
  history?: Array<{ sender: string; text: string }>;
  context: {
    studentName?: string;
    grade?: string;
    subject?: string;
    level?: string;
  };
}

export interface AskResponse {
  text: string;
  isEducational: boolean;
}

export interface VisionRequest {
  imageBytes: Uint8Array;
  mimeType: string;
  context: {
    studentId?: string;
    grade?: string;
    stream?: string;
    subject?: string;
    level?: string;
    lessonTitle?: string;
    conceptTitle?: string;
  };
  mode?: string;
  editedText?: string;
}

export interface VisionResponse {
  extractedText: string;
  detectedSubject: string;
  responseText: string;
  confidence: "high" | "medium" | "low";
  warnings: string[];
}

export function validateChatResponse(raw: any): ChatResponse {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid provider response: output is not an object");
  }
  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  if (!text) {
    throw new Error("Invalid provider response: text is empty");
  }
  const isEducational = typeof raw.isEducational === "boolean" ? raw.isEducational : !text.includes("دەرەوەی بوارە وانەییەکانی منە");
  return { text, isEducational };
}

export function validateAssessmentResponse(raw: any): AssessmentResponse {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid provider response: output is not an object");
  }
  const question = typeof raw.question === "string" ? raw.question : "";
  const feedback = typeof raw.feedback === "string" ? raw.feedback.trim() : "";
  if (!feedback) {
    throw new Error("Invalid provider response: feedback is empty");
  }
  const isCorrect = Boolean(raw.isCorrect);
  return { question, feedback, isCorrect };
}

export function validateReportResponse(raw: any): ReportResponse {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid provider response: output is not an object");
  }
  const recommendation = typeof raw.recommendation === "string" ? raw.recommendation.trim() : "";
  if (!recommendation) {
    throw new Error("Invalid provider response: recommendation is empty");
  }
  return { recommendation };
}

export function validateAskResponse(raw: any): AskResponse {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid provider response: output is not an object");
  }
  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  if (!text) {
    throw new Error("Invalid provider response: text is empty");
  }
  const isEducational = typeof raw.isEducational === "boolean" ? raw.isEducational : !text.includes("دەرەوەی بوارە وانەییەکانی منە");
  return { text, isEducational };
}

export function validateVisionResponse(raw: any): VisionResponse {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid provider response: output is not an object");
  }
  const extractedText = typeof raw.extractedText === "string" ? raw.extractedText : "";
  const detectedSubject = typeof raw.detectedSubject === "string" ? raw.detectedSubject.trim() : "";
  const responseText = typeof raw.responseText === "string" ? raw.responseText.trim() : "";
  if (!detectedSubject) {
    throw new Error("Invalid provider response: detectedSubject is required and non-empty");
  }
  if (!responseText) {
    throw new Error("Invalid provider response: responseText is required and non-empty");
  }
  let confidence: "high" | "medium" | "low" = "medium";
  if (raw.confidence === "high" || raw.confidence === "medium" || raw.confidence === "low") {
    confidence = raw.confidence;
  }
  const warnings = Array.isArray(raw.warnings) ? raw.warnings.filter((w: any) => typeof w === "string") : [];
  return {
    extractedText,
    detectedSubject,
    responseText,
    confidence,
    warnings,
  };
}
