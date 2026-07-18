import { ChatMessage, AssessmentState, StudentProfile } from "./storage.ts";

export interface ChatResponse {
  text: string;
  isEducational: boolean;
}

export interface AssessmentResponse {
  question: string;
  feedback: string;
  isCorrect: boolean;
  completed: boolean;
  finalLevel: string | null;
}

export interface ReportResponse {
  recommendation: string;
}

const getApiUrl = (path: string): string => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!baseUrl) {
    const isDev = import.meta.env.DEV;
    if (isDev) {
      throw new Error("Development Error: VITE_API_BASE_URL environment variable is missing or undefined. Please configure it in your environment.");
    } else {
      throw new Error("ببوورە، ڕێکخستنی خزمەتگوزارییەکانی زانا تەواو نییە (VITE_API_BASE_URL دیاری نەکراوە). تکایە پەیوەندی بە سەرپەرشتیارەوە بکە.");
    }
  }
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

export const ZanaApiClient = {
  async sendChatMessage(
    message: string,
    history: ChatMessage[],
    profile: StudentProfile
  ): Promise<ChatResponse> {
    try {
      const response = await fetch(getApiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, profile }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "هەڵەیەک ڕوویدا لە کاتی پەیوەندیکردن بە مامۆستا زانا.");
      }

      return await response.json();
    } catch (error: any) {
      console.error("API Error in sendChatMessage", error);
      throw new Error(error.message || "پەیوەندی ئینتەرنێتەکەت تێکچووە، تکایە جارێکی تر هەوڵ بدەرەوە.");
    }
  },

  async getAssessmentNextQuestion(
    state: Omit<AssessmentState, "id">,
    profile: StudentProfile
  ): Promise<AssessmentResponse> {
    try {
      const response = await fetch(getApiUrl("/api/assessment"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, profile }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "هەڵەیەک ڕوویدا لە کاتی بارکردنی تاقیکردنەوە.");
      }

      return await response.json();
    } catch (error: any) {
      console.error("API Error in getAssessmentNextQuestion", error);
      throw new Error(error.message || "ناتوانرێت تاقیکردنەوەکە باربکرێت، تکایە هێڵەکەت پشکنیار بکەرەوە.");
    }
  },

  async getParentReport(
    profile: StudentProfile,
    summaryStats: { totalSessions: number; weeklyQuestionCount: number }
  ): Promise<ReportResponse> {
    try {
      const response = await fetch(getApiUrl("/api/report"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, summaryStats }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "ڕاپۆرتەکە ناتوانرێت دروست بکرێت لەم کاتەدا.");
      }

      return await response.json();
    } catch (error: any) {
      console.error("API Error in getParentReport", error);
      throw new Error(error.message || "ڕاپۆرت دروستکردن سەرکەوتوو نەبوو. تکایە دواتر هەوڵ بدەرەوە.");
    }
  }
};
