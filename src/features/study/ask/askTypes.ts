export type AskMessageRole = "student" | "zana";

export type AskMessageStatus = "sending" | "sent" | "failed";

export interface AskMessage {
  id: string;
  role: AskMessageRole;
  text: string;
  createdAt: string;
  status: AskMessageStatus;
}

export interface SuggestedQuestion {
  id: string;
  text: string;
  category: "clarification" | "example" | "formula" | "common_mistake" | "next_step";
}

export interface AskContext {
  studentId: string;
  studentName: string;
  grade: string;
  stream: string;
  subject: string;
  chapterId?: string;
  chapterTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  conceptId?: string;
  conceptTitle?: string;
  level: string;
  sessionId?: string;
}

export interface AskSnapshot {
  context: AskContext;
  messages: AskMessage[];
  suggestedQuestions: SuggestedQuestion[];
  isSending: boolean;
  error?: string;
}

export interface AskApiRequest {
  message: string;
  history: {
    role: "student" | "zana";
    text: string;
  }[];
  context: AskContext;
}

export interface AskApiResponse {
  text: string;
  isEducational: boolean;
}
