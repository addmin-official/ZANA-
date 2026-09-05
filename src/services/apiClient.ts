import { ChatMessage, AssessmentState, StudentProfile } from "./storage.ts";

export interface ChatResponse { text: string; isEducational: boolean; }
export interface AssessmentResponse { question: string; feedback: string; isCorrect: boolean; completed: boolean; finalLevel: string | null; }
export interface ReportResponse { recommendation: string; }

const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "https://zana-api-worker.zana-platform.workers.dev";

const getApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedBase = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  return `${normalizedBase}${normalizedPath}`;
};

export const ZanaApiClient = {
  async sendChatMessage(message: string, history: ChatMessage[], profile: StudentProfile, academicContext?: any, token?: string): Promise<ChatResponse> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const requestUrl = getApiUrl("/api/chat");
      const requestHeaders = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      console.log("API_FETCH_REQUEST:", {
        url: requestUrl,
        headers: requestHeaders,
        method: "POST",
      });

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({ message, history, profile, academicContext }),
      });

      console.log("API_FETCH_RESPONSE:", {
        url: requestUrl,
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get("content-type"),
        accessControlAllowOrigin: response.headers.get("access-control-allow-origin"),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        console.error("API_HTTP_ERROR:", {
          url: requestUrl,
          status: response.status,
          error: errorData?.error || "Unknown API error",
        });

        throw new Error(
          errorData.error ||
            "هەڵەیەک ڕوویدا لە کاتی پەیوەندیکردن بە مامۆستا زانا."
        );
      }

      return await response.json();
    } catch (error: unknown) {
      console.error("FETCH_NETWORK_ERROR:", error);
      console.error("API Error in sendChatMessage", error);

      const errMsg =
        error instanceof Error
          ? error.message
          : "پەیوەندی ئینتەرنێتەکەت تێکچووە، تکایە جارێکی تر هەوڵ بدەرەوە.";

      throw new Error(errMsg);
    }
  },

  async submitAssessment(assessment: { question: string; answer: string; studentId?: string; level?: string; }, token?: string): Promise<AssessmentResponse> {
    const requestUrl = getApiUrl("/api/assessment");
    const requestHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (token) requestHeaders.Authorization = `Bearer ${token}`;

    const response = await fetch(requestUrl, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(assessment),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Assessment submission failed");
    }

    return await response.json();
  },

  async getProgressReport(studentId: string, token?: string): Promise<ReportResponse> {
    const requestUrl = getApiUrl(`/api/reports/${studentId}`);
    const requestHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (token) requestHeaders.Authorization = `Bearer ${token}`;

    const response = await fetch(requestUrl, {
      method: "GET",
      headers: requestHeaders,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to fetch progress report");
    }

    return await response.json();
  },
};
