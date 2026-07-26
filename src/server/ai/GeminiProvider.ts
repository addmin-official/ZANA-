import { GoogleGenAI } from "@google/genai";
import { AI_CONFIG } from "../config/aiModels.ts";
import { classifyError } from "./AiErrors.ts";

type GenerateContentRequest = Parameters<GoogleGenAI["models"]["generateContent"]>[0];

export interface ProviderGenerateParams {
  apiKey: string;
  model: string;
  contents: GenerateContentRequest["contents"];
  config?: GenerateContentRequest["config"];
  pathname?: string;
}

function getProviderStatusCode(error: unknown): number {
  if (typeof error !== "object" || error === null) return 500;
  const record = error as Record<string, unknown>;
  if (typeof record.status === "number") return record.status;
  if (typeof record.code === "number") return record.code;
  if (typeof record.error === "object" && record.error !== null) {
    const nested = record.error as Record<string, unknown>;
    if (typeof nested.code === "number") return nested.code;
  }
  return 500;
}

export class GeminiProvider {
  static async generate(params: ProviderGenerateParams): Promise<{ text: string }> {
    if (!params.apiKey.trim()) {
      throw new Error("کلیلی سیستەمی زیرەکی زانا لە ڕێکخستنەکاندا بەردەست نییە.");
    }

    const maxRetries = AI_CONFIG.retryPolicy.maxRetries;
    const timeoutMs = AI_CONFIG.timeoutMs;
    let attempt = 0;
    let lastError: unknown = new Error("Gemini request did not start");

    while (attempt <= maxRetries) {
      const abortController = new AbortController();
      const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
        abortController.abort(new Error("Request timeout"));
      }, timeoutMs);

      try {
        const ai = new GoogleGenAI({ apiKey: params.apiKey });
        const config: GenerateContentRequest["config"] = {
          ...(params.config ?? {}),
          abortSignal: abortController.signal,
        };

        const response = await ai.models.generateContent({
          model: params.model,
          contents: params.contents,
          config,
        });

        const text = response.text;
        if (typeof text !== "string" || text.trim().length === 0) {
          throw new Error("Invalid provider response: empty response text");
        }

        return { text: text.trim() };
      } catch (error: unknown) {
        const effectiveError = abortController.signal.aborted
          ? new Error("Request timeout")
          : error;
        lastError = effectiveError;

        const category = classifyError(effectiveError);
        const providerStatusCode = getProviderStatusCode(effectiveError);
        const isPermanentClientError = providerStatusCode >= 400 && providerStatusCode < 500 && providerStatusCode !== 408 && providerStatusCode !== 429;
        const isRetryable =
          !isPermanentClientError &&
          ((AI_CONFIG.retryPolicy.retryableStatusCodes as readonly number[]).includes(providerStatusCode) ||
            category === "timeout" ||
            category === "quota_exceeded" ||
            category === "rate_limited" ||
            category === "provider_unavailable");

        console.error("[AI Diagnostic]", {
          pathname: params.pathname || "unknown",
          category,
          providerStatusCode,
          selectedModel: params.model,
          hasApiKey: true,
          retryCount: attempt,
          timeout: abortController.signal.aborted,
        });

        if (!isRetryable || attempt >= maxRetries) {
          throw effectiveError;
        }

        attempt += 1;
        const jitter = Math.random() * 100;
        const backoffMs = Math.min(
          AI_CONFIG.retryPolicy.baseBackoffMs * Math.pow(2, attempt - 1) + jitter,
          AI_CONFIG.retryPolicy.maxBackoffMs
        );
        await new Promise<void>((resolve) => {
          setTimeout(resolve, backoffMs);
        });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw lastError;
  }
}
