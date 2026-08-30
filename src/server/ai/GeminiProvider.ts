import { GoogleGenAI } from "@google/genai";
import { AI_CONFIG } from "../config/aiModels.ts";
import { classifyError } from "./AiErrors.ts";

export interface ProviderGenerateParams {
  apiKey?: string;
  model: string;
  contents: unknown;
  config?: unknown;
  pathname?: string;
}

export class GeminiProvider {
  static async generate(params: ProviderGenerateParams): Promise<{ text: string }> {
    const effectiveKey = params.apiKey !== undefined ? params.apiKey.trim() : (process.env.GEMINI_API_KEY?.trim() || "");
    if (!effectiveKey) {
      throw new Error("کلیل (GEMINI_API_KEY) بۆ سیستەمی زیرەکی زانا بەردەست نییە لە ڕێکخستنەکاندا.");
    }

    const maxRetries = AI_CONFIG.retryPolicy.maxRetries;
    const timeoutMs = AI_CONFIG.timeoutMs;

    let attempt = 0;
    let lastError: unknown = null;

    while (attempt <= maxRetries) {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      try {
        const ai = new GoogleGenAI({
          apiKey: effectiveKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });

        const fetchPromise = ai.models.generateContent({
          model: params.model,
          contents: params.contents as Parameters<typeof ai.models.generateContent>[0]["contents"],
          config: params.config as Parameters<typeof ai.models.generateContent>[0]["config"],
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error("Request timeout"));
          }, timeoutMs);
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);
        if (timeoutId !== null) clearTimeout(timeoutId);

        const text = response?.text;
        if (typeof text !== "string" || text.trim().length === 0) {
          throw new Error("Invalid provider response: empty response text");
        }

        return { text: text.trim() };
      } catch (err: unknown) {
        if (timeoutId !== null) clearTimeout(timeoutId);
        lastError = err;
        const category = classifyError(err);

        let providerStatusCode = 500;
        if (err && typeof err === "object") {
          const errObj = err as Record<string, unknown>;
          if (typeof errObj.status === "number") providerStatusCode = errObj.status;
          else if (typeof errObj.code === "number") providerStatusCode = errObj.code;
          if (errObj.error && typeof errObj.error === "object" && typeof (errObj.error as Record<string, unknown>).code === "number") {
            providerStatusCode = (errObj.error as Record<string, unknown>).code as number;
          }
        }

        const isRetryable =
          (AI_CONFIG.retryPolicy.retryableStatusCodes as readonly number[]).includes(providerStatusCode) ||
          category === "timeout" ||
          category === "quota_exceeded" ||
          category === "rate_limited" ||
          category === "provider_unavailable";

        console.error("[AI Diagnostic]", {
          pathname: params.pathname || "unknown",
          category,
          providerStatusCode,
          selectedModel: params.model,
          hasApiKey: Boolean(params.apiKey),
          retryCount: attempt,
        });

        if (!isRetryable || attempt >= maxRetries) {
          throw err;
        }

        attempt++;
        const jitter = Math.random() * 100;
        const backoffMs = Math.min(
          AI_CONFIG.retryPolicy.baseBackoffMs * Math.pow(2, attempt - 1) + jitter,
          AI_CONFIG.retryPolicy.maxBackoffMs
        );
        await new Promise((res) => setTimeout(res, backoffMs));
      }
    }

    throw lastError;
  }
}
