import { AskApiRequest, AskApiResponse } from "./askTypes.ts";

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

export async function askZana(request: AskApiRequest): Promise<AskApiResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 seconds timeout

  try {
    const response = await fetchWithFallback("/api/study/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP_ERROR_${response.status}`);
    }

    const data = await response.json();
    if (data && typeof data === "object" && typeof data.text === "string") {
      return {
        text: data.text,
        isEducational: typeof data.isEducational === "boolean" ? data.isEducational : true,
      };
    }

    throw new Error("INVALID_RESPONSE_FORMAT");
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error && (error.message.includes("VITE_API_BASE_URL") || error.message.includes("ببوورە"))) {
      return {
        text: error.message,
        isEducational: false,
      };
    }

    if (error instanceof Error && error.name === "AbortError") {
      return {
        text: "وەڵامدانەوە کەمێک درێژ بوو. تکایە جارێکی تر هەوڵ بدەرەوە.",
        isEducational: false,
      };
    }

    // Friendly Kurdish Sorani network error messages
    return {
      text: "پەیوەندی بە زانا نەکرا. تکایە دڵنیابە لە هێڵی ئینتەرنێت و دووبارە هەوڵ بدەرەوە.",
      isEducational: false,
    };
  }
}
