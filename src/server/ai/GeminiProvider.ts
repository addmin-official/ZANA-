import { GoogleGenAI } from "@google/genai";
import { AI_CONFIG } from "../config/aiModels.ts";
import { classifyError } from "./AiErrors.ts";

export interface ProviderGenerateParams {
  apiKey: string;
  model: string;
  contents: any;
  config?: any;
  pathname?: string;
}

export class GeminiProvider {
  static async generate(params: ProviderGenerateParams): Promise<any> {
    if (!params.apiKey) {
      throw new Error("کلیل (GEMINI_API_KEY) بۆ سیستەمی زیرەکی زانا بەردەست نییە لە ڕێکخستنەکاندا.");
    }

    const ai = new GoogleGenAI({ apiKey: params.apiKey });
    const maxRetries = AI_CONFIG.retryPolicy.maxRetries;
    const timeoutMs = AI_CONFIG.timeoutMs;

    let attempt = 0;
    let lastError: unknown = null;

    while (attempt <= maxRetries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const fetchPromise = ai.models.generateContent({
          model: params.model,
          contents: params.contents,
          config: params.config,
        });

        const timeoutPromise = new Promise((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new Error("Request timed out (ETIMEDOUT)"));
          });
        });

        const response: any = await Promise.race([fetchPromise, timeoutPromise]);
        clearTimeout(timeoutId);
        return response;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
        const category = classifyError(err);

        const isRetryable =
          category === "quota_exceeded" ||
          category === "rate_limited" ||
          category === "provider_unavailable" ||
          category === "timeout";

        let providerStatusCode = 500;
        if (err && typeof err === "object") {
          if (typeof err.status === "number") providerStatusCode = err.status;
          else if (typeof err.code === "number") providerStatusCode = err.code;
          if (err.error && typeof err.error === "object" && typeof err.error.code === "number") {
            providerStatusCode = err.error.code;
          }
        }

        console.error("[AI Diagnostic]", {
          pathname: params.pathname || "unknown",
          category,
          providerStatusCode: providerStatusCode || (category === "invalid_credentials" ? 401 : category === "permission_denied" ? 403 : category === "model_not_found" ? 404 : category === "invalid_provider_request" ? 400 : 500),
          selectedModel: params.model,
          hasApiKey: Boolean(params.apiKey),
          retryCount: attempt,
        });

        if (!isRetryable || attempt >= maxRetries) {
          throw err;
        }

        attempt++;
        const jitter = Math.random() * 100;
        const backoffMs = Math.min(AI_CONFIG.retryPolicy.baseBackoffMs * Math.pow(2, attempt - 1) + jitter, AI_CONFIG.retryPolicy.maxBackoffMs);
        await new Promise((res) => setTimeout(res, backoffMs));
      }
    }

    throw lastError;
  }
}
