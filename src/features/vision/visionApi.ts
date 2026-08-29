import { VisionQuestionResult, VisionRequestMode, VisionStudyContext } from "./visionTypes.ts";

const getApiUrl = (path: string): string => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!baseUrl || !baseUrl.trim()) {
    return normalizedPath;
  }
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}${normalizedPath}`;
};

async function fetchWithFallback(path: string, init: RequestInit): Promise<Response> {
  const primaryUrl = getApiUrl(path);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (primaryUrl === normalizedPath) {
    return fetch(primaryUrl, init);
  }

  try {
    const response = await fetch(primaryUrl, init);
    if (!response.ok && (response.status === 404 || response.status === 502 || response.status === 503)) {
      try {
        return await fetch(normalizedPath, init);
      } catch {
        return response;
      }
    }
    return response;
  } catch (err) {
    console.warn(`Fetch to ${primaryUrl} failed (${err instanceof Error ? err.message : String(err)}), falling back to relative endpoint: ${normalizedPath}`);
    return fetch(normalizedPath, init);
  }
}

export class VisionApi {
  /**
   * Uploads the captured image to the server and retrieves ZANA's multimodal response.
   */
  public static async processVisionQuestion(
    file: File,
    mode: VisionRequestMode,
    context: VisionStudyContext,
    editedText?: string
  ): Promise<VisionQuestionResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 seconds timeout

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("mode", mode);
      formData.append("context", JSON.stringify(context));
      if (editedText) {
        formData.append("editedText", editedText);
      }

      const response = await fetchWithFallback("/api/study/vision", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const errMsg = errBody.error || "خزمەتگوزارییەکە لە ئێستادا بەردەست نییە.";
        throw new Error(errMsg);
      }

      const result = await response.json();
      
      if (!result || typeof result !== "object") {
        throw new Error("سەرچاوەی داتا نادروستە.");
      }

      return {
        extractedText: result.extractedText || "",
        detectedSubject: result.detectedSubject,
        responseText: result.responseText,
        confidence: result.confidence || "medium",
        warnings: Array.isArray(result.warnings) ? result.warnings : [],
      };
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      
      const isAbort = error instanceof DOMException && error.name === "AbortError";
      if (isAbort) {
        throw new Error("کاتەکە تەواو بوو (تێپەڕینی ٤٥ چرکە). تکایە هێڵی ئینتەرنێتەکەت بپشکنە و دووبارە هەوڵبدەرەوە.");
      }

      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        throw new Error("وێنەکە نەنێردرا. تکایە پەیوەندی ئینتەرنێت بپشکنە و دووبارە هەوڵ بدەرەوە.");
      }

      // If there's an explicit readable error, return it or default
      if (msg) {
        throw new Error(msg);
      }

      throw new Error("زانا نەیتوانی دەقی وێنەکە بە ڕوونی بخوێنێتەوە. تکایە وێنەیەکی ڕوونتر بگرە.");
    }
  }
}
