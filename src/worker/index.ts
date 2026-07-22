import { GoogleGenAI, Type } from "@google/genai";
import { buildSystemPrompt } from "../ai/buildSystemPrompt.ts";
import { PersistentLearningRecordProvider } from "../learning/providers/LearningRecordProvider.ts";
import { AdaptiveLearningEngine } from "../learning/engine/AdaptiveLearningEngine.ts";
import { DifficultyLevel, MisconceptionStatus } from "../learning/domain/MasteryTypes.ts";
import { CurriculumRegistry } from "../curriculum/registry/CurriculumRegistry.ts";
import { AuthService } from "../services/authService.ts";
import { getPrimaryModel as getCentralPrimaryModel, getVisionModel as getCentralVisionModel } from "../server/config/aiModels.ts";
import {
  PersistentAssessmentRecordProvider,
  AssessmentService,
  AssessmentBlueprint,
  AssessmentType,
  QuestionType
} from "../assessment/index.ts";

export interface Env {
  GEMINI_API_KEY: string;
  ALLOWED_ORIGINS: string; // Comma-separated list of allowed origins
  GEMINI_PRIMARY_MODEL?: string;
  GEMINI_VISION_MODEL?: string;
  ZANA_LEARNING_KV?: any; // Cloudflare KV for persistent student mastery
  LEARNING_RECORDS_KV?: any; // Hardened Cloudflare KV binding
  JWT_SECRET?: string; // Isomorphic secure token secret
  ASSETS?: any; // Cloudflare Static Assets fetcher binding
}

export type SafeErrorCategory =
  | "validation"
  | "timeout"
  | "upload_too_large"
  | "unsupported_file"
  | "missing_credentials"
  | "invalid_credentials"
  | "permission_denied"
  | "model_not_found"
  | "invalid_provider_request"
  | "quota_exceeded"
  | "rate_limited"
  | "provider_unavailable"
  | "invalid_provider_response"
  | "internal";

// 1. LIGHTWEIGHT IN-MEMORY RATE LIMITING FOR WORKER ISOLATES
export interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitDb = new Map<string, RateLimitRecord>();

export function isRateLimited(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitDb.get(ip) || { timestamps: [] };
  
  // Filter out timestamps older than the window
  record.timestamps = record.timestamps.filter(t => now - t < windowMs);
  
  if (record.timestamps.length >= limit) {
    return true;
  }
  
  record.timestamps.push(now);
  rateLimitDb.set(ip, record);
  return false;
}

// 2. ERROR CLASSIFICATION AND KURDISH SORANI ERROR MESSAGES
export function classifyError(error: unknown): SafeErrorCategory {
  if (!error) return "internal";

  const msg = error instanceof Error ? error.message : String(error);
  const lowerMsg = msg.toLowerCase();

  if (lowerMsg.includes("file too large") || lowerMsg.includes("limit_file_size") || lowerMsg.includes("oversized")) {
    return "upload_too_large";
  }

  if (lowerMsg.includes("timeout") || lowerMsg.includes("etimedout")) {
    return "timeout";
  }

  if (lowerMsg.includes("gemini_api_key") || lowerMsg.includes("missing key") || lowerMsg.includes("api key missing") || lowerMsg.includes("key is required")) {
    return "missing_credentials";
  }

  if (lowerMsg.includes("401") || lowerMsg.includes("unauthorized") || lowerMsg.includes("invalid key") || lowerMsg.includes("invalid_api_key")) {
    return "invalid_credentials";
  }

  if (lowerMsg.includes("403") || lowerMsg.includes("forbidden") || lowerMsg.includes("permission_denied")) {
    return "permission_denied";
  }

  if (lowerMsg.includes("404") || lowerMsg.includes("model not found") || lowerMsg.includes("not_found") || lowerMsg.includes("model_not_found")) {
    return "model_not_found";
  }

  if (lowerMsg.includes("429") || lowerMsg.includes("quota") || lowerMsg.includes("rate limit") || lowerMsg.includes("resource_exhausted")) {
    return lowerMsg.includes("rate") ? "rate_limited" : "quota_exceeded";
  }

  if (lowerMsg.includes("400") || lowerMsg.includes("invalid request") || lowerMsg.includes("invalid_argument") || lowerMsg.includes("unsupported parameter") || lowerMsg.includes("invalid parameter")) {
    return "invalid_provider_request";
  }

  if (lowerMsg.includes("unsupported mime") || lowerMsg.includes("unsupported file") || lowerMsg.includes("unsupported image") || lowerMsg.includes("unsupported format") || lowerMsg.includes("unsupported") || lowerMsg.includes("mime") || lowerMsg.includes("signature") || lowerMsg.includes("magic byte")) {
    return "unsupported_file";
  }

  if (lowerMsg.includes("invalid json") || lowerMsg.includes("parse error") || lowerMsg.includes("response validation")) {
    return "invalid_provider_response";
  }

  if (
    lowerMsg.includes("500") ||
    lowerMsg.includes("502") ||
    lowerMsg.includes("503") ||
    lowerMsg.includes("504") ||
    lowerMsg.includes("googlegenai") ||
    lowerMsg.includes("provider") ||
    lowerMsg.includes("unavailable") ||
    lowerMsg.includes("fetcherror") ||
    lowerMsg.includes("connect")
  ) {
    return "provider_unavailable";
  }

  if (
    lowerMsg.includes("validation") ||
    lowerMsg.includes("invalid") ||
    lowerMsg.includes("bad request") ||
    lowerMsg.includes("missing") ||
    lowerMsg.includes("json") ||
    lowerMsg.includes("syntaxerror")
  ) {
    return "validation";
  }

  return "internal";
}

export function getClientSafeErrorMessage(category: SafeErrorCategory): string {
  switch (category) {
    case "validation":
      return "داواکارییەکە ناڕوونە یان نادروستە.";
    case "timeout":
      return "کاتەکە تەواو بوو. تکایە دووبارە هەوڵبدەرەوە.";
    case "upload_too_large":
      return "قەبارەی وێنەکە زۆر گەورەیە؛ تکایە وێنەیەک کەمتر لە ٥ مێگابایت هەڵبژێرە.";
    case "unsupported_file":
      return "جۆری ئەم فایلە پشتگیری ناکرێت. تەنها JPG، PNG و WebP بەکاربهێنە.";
    case "missing_credentials":
    case "invalid_credentials":
    case "permission_denied":
    case "model_not_found":
    case "invalid_provider_request":
    case "quota_exceeded":
    case "rate_limited":
    case "provider_unavailable":
    case "invalid_provider_response":
      return "خزمەتگوزارییەکە لە ئێستادا بەردەست نییە. تکایە دواتر هەوڵ بدەرەوە.";
    case "internal":
    default:
      return "کێشەیەکی ناوخۆیی لە ڕاژەکاردا ڕوویدا.";
  }
}

// 3. MAGIC BYTE SIGNATURE VALIDATOR FOR IMAGES
export function validateImageSignature(buffer: Uint8Array, declaredMimeType: string): boolean {
  if (!buffer || buffer.length === 0) {
    return false;
  }

  const mime = declaredMimeType.toLowerCase().trim();

  if (mime === "image/jpeg" || mime === "image/jpg") {
    if (buffer.length < 3) return false;
    return (
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  if (mime === "image/png") {
    if (buffer.length < 8) return false;
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  if (mime === "image/webp") {
    if (buffer.length < 12) return false;
    const isRiff =
      buffer[0] === 0x52 && // 'R'
      buffer[1] === 0x49 && // 'I'
      buffer[2] === 0x46 && // 'F'
      buffer[3] === 0x46;   // 'F'
    const isWebp =
      buffer[8] === 0x57 && // 'W'
      buffer[9] === 0x45 && // 'E'
      buffer[10] === 0x42 && // 'B'
      buffer[11] === 0x50;  // 'P'
    return isRiff && isWebp;
  }

  return false;
}

// 4. MODEL HELPERS
function getPrimaryModel(env: Env): string {
  return getCentralPrimaryModel({ GEMINI_PRIMARY_MODEL: env.GEMINI_PRIMARY_MODEL });
}

function getVisionModel(env: Env): string {
  return getCentralVisionModel({ GEMINI_VISION_MODEL: env.GEMINI_VISION_MODEL });
}

// 5. CORS AND SECURITY POLICIES
function isOriginAllowed(origin: string | null, env: Env): boolean {
  if (!origin) {
    // Permit requests without Origin for non-browser clients (e.g. server/curl testing)
    return true;
  }
  
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(o => o.trim().toLowerCase().replace(/\/$/, ""))
    .filter(Boolean);
    
  const lowerOrigin = origin.toLowerCase().trim().replace(/\/$/, "");
  
  return allowed.includes(lowerOrigin);
}

function getCorsHeaders(origin: string | null, env: Env): Headers {
  const headers = new Headers();
  
  if (origin && isOriginAllowed(origin, env)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, x-appcheck-token");
  headers.set("Access-Control-Max-Age", "86400");
  
  // Secure production headers
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "1; mode=block");
  
  return headers;
}

function getAiClient(env: Env): GoogleGenAI {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("کلیل (GEMINI_API_KEY) بۆ سیستەمی زیرەکی زانا بەردەست نییە لە ڕێکخستنەکاندا.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// 6. MAIN WORKER ROUTER
export default {
  async fetch(request: Request, env: Env, ctx?: any): Promise<Response> {
    const url = new URL(request.url);
    // Path normalization: replace multiple slashes with a single slash
    let pathname = url.pathname.replace(/\/+/g, "/");

    // Standard trailing slash normalization for API endpoints (e.g. /api/health/ -> /api/health)
    if (pathname.startsWith("/api/") && pathname.endsWith("/") && pathname.length > 5) {
      pathname = pathname.slice(0, -1);
    }

    const origin = request.headers.get("Origin");

    // === ROUTE ORDER 1: GET /api/health (True public liveness endpoint) ===
    if (pathname === "/api/health") {
      if (request.method === "GET") {
        const responseHeaders = getCorsHeaders(origin, env);
        responseHeaders.set("Content-Type", "application/json");

        return new Response(
          JSON.stringify({
            ok: true,
            status: "ok",
            service: "zana-api-worker",
          }),
          { status: 200, headers: responseHeaders }
        );
      }
    }

    // === ROUTE ORDER 2: Handle OPTIONS preflight ===
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin, env),
      });
    }

    // Prepare default response headers for protected API & static fallback routes
    const responseHeaders = getCorsHeaders(origin, env);
    responseHeaders.set("Content-Type", "application/json");

    // === ROUTE ORDER 3: Origin Enforcement for protected API routes ===
    if (pathname.startsWith("/api/")) {
      if (!isOriginAllowed(origin, env)) {
        return new Response(
          JSON.stringify({ error: "Disallowed Origin" }),
          { status: 403, headers: responseHeaders }
        );
      }
    }

    // Propagate JWT secret and environment to AuthService context
    if (env.JWT_SECRET) {
      if (typeof process === "undefined") {
        (globalThis as any).process = { env: {} };
      }
      process.env = process.env || {};
      process.env.JWT_SECRET = env.JWT_SECRET;
      process.env.ZANA_ENV = "production";
    }

    // === ROUTE ORDER 4: Static assets and SPA fallback ===
    if (!pathname.startsWith("/api/")) {
      if (env.ASSETS) {
        try {
          const assetResponse = await env.ASSETS.fetch(request.clone());
          if (assetResponse.status === 404) {
            // Check if request is for a missing static asset vs SPA route
            const lastSegment = pathname.substring(pathname.lastIndexOf("/") + 1);
            const hasExtension = lastSegment.includes(".") && !lastSegment.endsWith(".");
            if (hasExtension) {
              return new Response(
                JSON.stringify({ error: "فایلەکە نەدۆزرایەوە." }),
                { status: 404, headers: responseHeaders }
              );
            }
            // SPA fallback: fetch index.html instead
            const indexUrl = new URL(request.url);
            indexUrl.pathname = "/index.html";
            return await env.ASSETS.fetch(new Request(indexUrl.toString(), request));
          }
          return assetResponse;
        } catch (err) {
          console.error("Static asset fetch failed:", err);
        }
      }
    }

    const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";

    // Rate limiting per-IP & per-endpoint for other API routes
    const limit = pathname === "/api/study/vision" ? 10 : 60;
    const windowMs = 10 * 60 * 1000; // 10 minutes
    if (pathname.startsWith("/api/")) {
      if (isRateLimited(`${clientIp}:${pathname}`, limit, windowMs)) {
        return new Response(
          JSON.stringify({
            error: "داواکارییەکان زۆر بوون؛ تکایە چەند خولەکێک چاوەڕێ بکە و دووبارە هەوڵ بدەرەوە.",
          }),
          { status: 429, headers: responseHeaders }
        );
      }
    }

    try {

      // Endpoint: POST /api/chat
      if (pathname === "/api/chat" && request.method === "POST") {
        const body: any = await request.json().catch(() => ({}));
        const { message, history, profile } = body;

        if (!message || !profile) {
          return new Response(
            JSON.stringify({ error: "داواکارییەکە کەموکوڕی تێدایە." }),
            { status: 400, headers: responseHeaders }
          );
        }

        const ai = getAiClient(env);
        const systemInstruction = buildSystemPrompt({
          studentName: profile.name,
          grade: profile.grade,
          subject: profile.activeSubject,
          level: profile.level,
          mode: "chat",
        });

        const contents = (history || []).map((msg: any) => ({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        }));

        contents.push({
          role: "user",
          parts: [{ text: message }],
        });

        const response = await ai.models.generateContent({
          model: getPrimaryModel(env),
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });

        const replyText = response.text || "ببوورە، من نەمتوانی لە قسەکەت تێبگەم. تکایە دووبارە پرسیارەکەت بنووسەوە.";
        const isEducational = !replyText.includes("دەرەوەی بوارە وانەییەکانی منە");

        return new Response(
          JSON.stringify({
            text: replyText,
            isEducational,
          }),
          { status: 200, headers: responseHeaders }
        );
      }

      // Endpoint: POST /api/assessment
      if (pathname === "/api/assessment" && request.method === "POST") {
        const body: any = await request.json().catch(() => ({}));
        const { state, profile } = body;

        if (!state || !profile) {
          return new Response(
            JSON.stringify({ error: "زانیارییەکانی تاقیکردنەوە نەنێردراون." }),
            { status: 400, headers: responseHeaders }
          );
        }

        const ai = getAiClient(env);
        const systemInstruction = buildSystemPrompt({
          studentName: profile.name,
          grade: profile.grade,
          subject: profile.activeSubject,
          level: profile.level,
          mode: "assessment",
        });

        const currentQuestionNum = state.currentQuestion;
        const historySummary = [];

        for (let i = 0; i < state.questions.length; i++) {
          historySummary.push(`پێشنیار/پرسیار: ${state.questions[i]}`);
          if (state.answers && state.answers[i]) {
            historySummary.push(`وەڵامی قوتابی: ${state.answers[i]}`);
          }
        }

        const userInstructionsPrompt = `
تۆ ئێستا لە پرسیاری ژمارە ${currentQuestionNum}ی تاقیکردنەوەی خولی نێوان ٥ پرسیارکەیت.
مێژووی ئەم تاقیکردنەوەیە تا ئێستا:
${historySummary.join("\n")}

کارەکانت بەپێی وەڵامەکان:
١. ئەگەر لیستەکە خاڵییە و هیچ وەڵامێک نییە (پرسیاری یەکەم)، تکایە پرسیارێکی زۆر بەهێزی سەرەکی لەم بابەتەدا بۆ ئاستی ${profile.level} پێشکەش بکە لە 'question' و بە کورت دەستپێشخەری لە 'feedback' بنووسە.
٢. ئەگەر قوتابی وەڵامی داوەتەوە، وەڵامەکەی دوایین بەراورد بکە بە دواین پرسیار. هەڵسەنگاندن بکە ئایا وەڵامەکە ڕاستە یان هەڵەیە (isCorrect=true/false).
٣. لێدوان و فیدباکی فێرکاریی و سوقراتی میهرەبانانە لە 'feedback' دابنێ بە کوردی سۆرانی.
٤. ئەگەر هێشتا نەگەیشتووینەتە پرسیاری کۆتایی (واتە currentQuestion کەمترە لە ٥)، پرسیارێکی نوێی زانستیی داهاتوو لە 'question' بنووسە.
٥. ئەگەر ئەمە پرسیاری کۆتاییە (پرسیاری ٥)، 'question' با خاڵی بێت یان بنووسە "کۆتایی تاقیکردنەوە".

پێویستە وەڵامەکەت تەنها لەم فۆرماتەدا بێت:
{
  "question": "پرسیاری داهاتوو لێرە",
  "feedback": "فیدباکی وەڵامی پێشوو یان پێشەکی",
  "isCorrect": true/false
}
`;

        const response = await ai.models.generateContent({
          model: getPrimaryModel(env),
          contents: userInstructionsPrompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                question: {
                  type: Type.STRING,
                  description: "The next question to ask the student, or empty if assessment finished.",
                },
                feedback: {
                  type: Type.STRING,
                  description: "Warm, Socratic pedagogical evaluation feedback for the previous answer.",
                },
                isCorrect: {
                  type: Type.BOOLEAN,
                  description: "True if the student's answer was scientifically correct, false otherwise.",
                },
              },
              required: ["question", "feedback", "isCorrect"],
            },
          },
        });

        const responseJson = JSON.parse(response.text || "{}");

        const isLast = currentQuestionNum === 5;
        let finalLevel = null;
        if (isLast) {
          const correctCount = (state.correctAnswers || []).filter(Boolean).length + (responseJson.isCorrect ? 1 : 0);
          if (correctCount <= 2) finalLevel = "سەرەتا";
          else if (correctCount <= 4) finalLevel = "مامناوەند";
          else finalLevel = "پێشکەوتوو";
        }

        return new Response(
          JSON.stringify({
            question: responseJson.question || "",
            feedback: responseJson.feedback || "وەڵامەکە لەلایەن زانا هەڵسەنگێندرا.",
            isCorrect: !!responseJson.isCorrect,
            completed: isLast,
            finalLevel,
          }),
          { status: 200, headers: responseHeaders }
        );
      }

      // Endpoint: POST /api/report
      if (pathname === "/api/report" && request.method === "POST") {
        const body: any = await request.json().catch(() => ({}));
        const { profile, summaryStats } = body;

        if (!profile || !summaryStats) {
          return new Response(
            JSON.stringify({ error: "زانیارییەکان تەواو نین بۆ دروستکردنی ڕاپۆرت." }),
            { status: 400, headers: responseHeaders }
          );
        }

        const ai = getAiClient(env);
        const systemInstruction = buildSystemPrompt({
          studentName: profile.name,
          grade: profile.grade,
          subject: profile.activeSubject,
          level: profile.level,
          mode: "report",
        });

        const reportPrompt = `
ڕاپۆرتی گەشەکردنی زانستی فەرمی بنووسە بۆ دایک و باوکی قوتابی ${profile.name} کە پۆلی ${profile.grade}یە و ئاستی خوێندنی ${profile.level}یە لە بابەتی ${profile.activeSubject}.
ئامارە سەرەکییەکان:
- خولەکانی گفتوگۆ: ${summaryStats.totalSessions} جار
- پرسیارە گۆڕدراوەکانی چات: ${summaryStats.weeklyQuestionCount} پرسیار

تکایە نووسینێکی زۆر ناوازە، دڵسۆزانە و هاندەر پێشکەش بکە بە کوردی سۆرانیی فەرمی، کە تێیدا خاڵەکانی سەرکەوتن باس دەکەیت لەگەڵ ڕێنمایی گونجاو بۆ دایک و باوک کە چۆن هاوکاری بکەن لە ماڵەوە.
Scale: وەڵامەکەت تەنها بە فۆرماتی خواستراوی JSON بێت.
`;

        const response = await ai.models.generateContent({
          model: getPrimaryModel(env),
          contents: reportPrompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recommendation: {
                  type: Type.STRING,
                  description: "Deep, beautiful, supportive paragraphs of recommendations for parents in Kurdish Sorani.",
                },
              },
              required: ["recommendation"],
            },
          },
        });

        const responseJson = JSON.parse(response.text || "{}");

        return new Response(
          JSON.stringify({
            recommendation: responseJson.recommendation || "مامۆستا زانا زۆر هیوای سەرکەوتن بۆ قوتابی دەکات. هەمیشە هاندەری بن لە پۆلدا.",
          }),
          { status: 200, headers: responseHeaders }
        );
      }

      // Endpoint: POST /api/study/ask
      if (pathname === "/api/study/ask" && request.method === "POST") {
        const body: any = await request.json().catch(() => ({}));
        const { message, history, context } = body;

        if (!message || !context) {
          return new Response(
            JSON.stringify({ error: "داواکارییەکە کەموکوڕی تێدایە." }),
            { status: 400, headers: responseHeaders }
          );
        }

        const ai = getAiClient(env);
        const systemInstruction = buildSystemPrompt({
          studentName: context.studentName,
          grade: context.grade,
          subject: context.subject,
          level: context.level,
          mode: "ask",
        });

        const contents = (history || []).map((msg: any) => ({
          role: msg.role === "student" ? "user" : "model",
          parts: [{ text: msg.text }],
        }));

        contents.push({
          role: "user",
          parts: [{ text: message }],
        });

        const response = await ai.models.generateContent({
          model: getPrimaryModel(env),
          contents,
          config: {
            systemInstruction,
            temperature: 0.5,
          },
        });

        const replyText = response.text || "ببوورە، من نەمتوانی لە پرسیارەکەت تێبگەم. تکایە دووبارە پرسیارەکەت بنووسەوە.";
        const isEducational = !replyText.includes("بوارە وانەییەکانی من نییە") && !replyText.includes("دەرەوەی بوارە وانەییەکانی منە");

        return new Response(
          JSON.stringify({
            text: replyText,
            isEducational,
          }),
          { status: 200, headers: responseHeaders }
        );
      }

      // Endpoint: POST /api/study/vision
      if (pathname === "/api/study/vision" && request.method === "POST") {
        const formData = await request.formData();
        const file = formData.get("image") as File | null;

        if (!file) {
          const category: SafeErrorCategory = "validation";
          return new Response(
            JSON.stringify({ error: getClientSafeErrorMessage(category) }),
            { status: 400, headers: responseHeaders }
          );
        }

        // 5MB file-size validation
        if (file.size > 5 * 1024 * 1024) {
          const category: SafeErrorCategory = "upload_too_large";
          return new Response(
            JSON.stringify({ error: getClientSafeErrorMessage(category) }),
            { status: 413, headers: responseHeaders }
          );
        }

        // Magic byte image signature validation
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const isValidSignature = validateImageSignature(uint8Array, file.type);
        if (!isValidSignature) {
          const category: SafeErrorCategory = "unsupported_file";
          return new Response(
            JSON.stringify({ error: getClientSafeErrorMessage(category) }),
            { status: 415, headers: responseHeaders }
          );
        }

        const contextStr = formData.get("context") as string | null;
        const editedTextRaw = formData.get("editedText") as string | null;
        const modeRaw = formData.get("mode") as string | null || "explain";

        let editedText: string | undefined;
        if (editedTextRaw) {
          const trimmed = editedTextRaw.trim();
          if (trimmed.length > 5000) {
            const category: SafeErrorCategory = "validation";
            return new Response(
              JSON.stringify({ error: getClientSafeErrorMessage(category) }),
              { status: 400, headers: responseHeaders }
            );
          }
          editedText = trimmed;
        }

        if (modeRaw !== "explain" && modeRaw !== "extract_only" && modeRaw !== "hint" && modeRaw !== "step_by_step" && modeRaw !== "formula") {
          const category: SafeErrorCategory = "validation";
          return new Response(
            JSON.stringify({ error: getClientSafeErrorMessage(category) }),
            { status: 400, headers: responseHeaders }
          );
        }
        const mode = modeRaw;

        if (!contextStr) {
          const category: SafeErrorCategory = "validation";
          return new Response(
            JSON.stringify({ error: getClientSafeErrorMessage(category) }),
            { status: 400, headers: responseHeaders }
          );
        }

        // Request context length constraint
        if (contextStr.length > 50 * 1024) {
          const category: SafeErrorCategory = "validation";
          return new Response(
            JSON.stringify({ error: getClientSafeErrorMessage(category) }),
            { status: 400, headers: responseHeaders }
          );
        }

        let parsed: any;
        try {
          parsed = JSON.parse(contextStr);
        } catch (e) {
          const category: SafeErrorCategory = "validation";
          return new Response(
            JSON.stringify({ error: getClientSafeErrorMessage(category) }),
            { status: 400, headers: responseHeaders }
          );
        }

        // Verify context fields strictly
        const { studentId, grade, stream, subject, level, lessonTitle, conceptTitle } = parsed;
        if (
          typeof studentId !== "string" || !studentId.trim() ||
          typeof grade !== "string" || !grade.trim() ||
          typeof stream !== "string" || !stream.trim() ||
          typeof subject !== "string" || !subject.trim() ||
          typeof level !== "string" || !level.trim()
        ) {
          const category: SafeErrorCategory = "validation";
          return new Response(
            JSON.stringify({ error: getClientSafeErrorMessage(category) }),
            { status: 400, headers: responseHeaders }
          );
        }

        const context = parsed;

        const ai = getAiClient(env);
        const systemInstruction = buildSystemPrompt({
          studentName: undefined, // Do not pass student name to AI to preserve privacy
          grade: context.grade,
          stream: context.stream,
          subject: context.subject,
          level: context.level,
          lessonTitle: context.lessonTitle,
          conceptTitle: context.conceptTitle,
          mode: "vision",
        });

        // Pedagogical rules based on the requested mode
        let modeInstructions = "";
        if (mode === "extract_only") {
          modeInstructions = "تەنها دەقی ناو وێنەکە بە تەواوی و بە ڕوونی دەربهێنە بەبێ هیچ ڕوونکردنەوەیەک یان وەڵامدانەوەیەک.";
        } else if (mode === "hint") {
          modeInstructions = "شیکاری تەواوی پرسیارەکە مەکە. تەنها ڕێنمایی زۆر سەرەکی, سەرەداو یان ڕێگای گونجاو پێشکەش بکە بە شێوازی سوقراتی میهرەبان بۆ یارمەتیدانی قوتابی تا خۆی بگاتە وەڵام.";
        } else if (mode === "step_by_step") {
          modeInstructions = "وردترین شیکاری هەنگاو بە هەنگاوی لۆجیکی پێشکەش بکە بۆ شیکارکردنی پرسیارەکە لە پڕۆگرامەکەدا. هەر هەنگاوێک بە ڕوونی ڕوون بکەرەوە.";
        } else if (mode === "formula") {
          modeInstructions = "هەموو یاساکان, تیۆرمەکان, و هاوکێشە بیرکاریی یان فیزیاییە سەرەکییەکان کە پێویستن بۆ شیکاری ئەم جۆرە پرسیارە دەستنیشان بکە و ڕوونیان بکەرەوە.";
        } else {
          modeInstructions = "وەڵامی فێرکاری و ڕوونکردنەوەی تەواوی چەمکەکە پێشکەش بکە. ئەگەر پرسیارەکە تاقیکردنەوە یان ڕاهێنان دەردەکەوێت, پێش پێشکەشکردنی ئەنجام یان وەڵامی کۆتایی, سەرەتا پێویستە شێواز و مێتۆدی شیکارەکە بە تەواوی ڕوون بکەیتەوە.";
        }

        let modeKurdish = "ڕوونکردنەوەی فێرکاریی گشتی";
        if (mode === "extract_only") {
          modeKurdish = "تەنها دەرهێنانی دەق";
        } else if (mode === "hint") {
          modeKurdish = "پێدانی سەرەداو و یارمەتیدان";
        } else if (mode === "step_by_step") {
          modeKurdish = "شیکاری هەنگاو بە هەنگاو";
        } else if (mode === "formula") {
          modeKurdish = "یاسا و هاوکێشەکان";
        }

        const userInstructionsPrompt = `
تۆ زانایت، یاریدەدەری زیرەکی فێربوونی قوتابیان.
وێنەیەک هاوپێچ کراوە لە لایەن قوتابی لە پۆلی ${context.grade} لە بابەتی ${context.subject}.
وانەی چالاکی ئێستا: ${context.lessonTitle || "چەمکەکانی خوێندن"}.

شێوازی داواکراو: ${modeKurdish}
ڕێنمایی گشتی بۆ وەڵامدانەوە:
${modeInstructions}

ئەرکەکانت:
١. دەقی وێنەکە دەربهێنە بە وردی. ئەگەر دەقەکە ناڕوونە، دڵنیایی بە نزم بنووسە. هیچ نووسین یان هاوکێشەیەک لە خۆتەوە دامەهێنە ئەگەر بە ڕوونی نەخوێندرایەوە.
٢. پشکنین بکە ئایا بابەتەکە پەیوەندی بە بابەتی سەرەکی خوێندنی قوتابی (بابەتی: ${context.subject}) هەیە یان نا. ئەگەر پرسیارەکە هی بابەتێکی جیاوازە (بۆ نموونە پرسیارەکە مێژووە بەڵام بابەتی ئێستا بیرکارییە)، هۆشدارییەکی میهرەبانانە بە کوردی سۆرانی لە لیستی 'warnings' بنووسە: 'ئەم پرسیارە وەک بابەتێکی دەرەوەی ${context.subject === "math" ? "بیرکاری" : context.subject === "physics" ? "فیزیا" : context.subject === "chemistry" ? "کیمیا" : "ئینگلیزی"} دەردەکەوێت. ئایا دڵنیایت دەتەوێت بەردەوام بیر بکەیتەوە؟'.
٣. هەرگیز ئیدیعای ئەوە مەکە کە ئەم پرسیارە پرسیارێکی فەرمی یان نیشتمانییە، مەگەر بە بەڵگە و دەقی ڕوون تێیدا نووسرابێت.
٤. ئەگەر قوتابی خۆی دەستکاری دەقەکەی کردبوو (${editedText ? `دەقی نوێی دەستکاریکراو لەلایەن قوتابی: ${editedText}` : "قوتابی دەستکاری نەکردووە"}), ئەوا لە شیکار و ڕوونکردنەوەکەتدا زیاتر پشت بەو دەقە دەستکاریکراوە ببەستە.
٥. وەڵامەکەت بە زمانی کوردی سۆرانیی فەرمی، زۆر پاراو و دڵسۆزانە پێشکەش بکە بە فۆرماتی Markdown.

پێویستە ئەنجامی وەڵامەکەت تەنها بە فۆرماتی JSON و بەم شێوازەی خوارەوە بێت:
{
  "extractedText": "دەقی دەرهێنراوی وێنەکە لێرە بنووسە",
  "detectedSubject": "بابەتی دۆزراوە (بیرکاری/فیزیا/کیمیا/ئینگلیزی/یان هیتر)",
  "responseText": "ڕوونکردنەوەی زانا بەپێی شێوازی داواکراو و بە فۆرماتی Markdown",
  "confidence": "high یان medium یان low",
  "warnings": ["هۆشدارییەکان ئەگەر هەبن لێرە بنووسە بە کوردی سۆرانی"]
}
`;

        const visionModel = getVisionModel(env);

        // Native Uint8Array to Base64 encoder for the environment
        let binaryString = "";
        for (let i = 0; i < uint8Array.length; i++) {
          binaryString += String.fromCharCode(uint8Array[i]);
        }
        const base64Data = btoa(binaryString);

        const response = await ai.models.generateContent({
          model: visionModel,
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: file.type,
              },
            },
            userInstructionsPrompt,
          ],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                extractedText: {
                  type: Type.STRING,
                  description: "Strictly extracted text of the question or formula from the image.",
                },
                detectedSubject: {
                  type: Type.STRING,
                  description: "The primary academic subject, e.g., 'math', 'physics', 'chemistry', 'english' or 'other'.",
                },
                responseText: {
                  type: Type.STRING,
                  description: "The educational explanation/hints formatted in rich markdown.",
                },
                confidence: {
                  type: Type.STRING,
                  description: "The visual extraction confidence level, must be high, medium, or low.",
                },
                warnings: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Any warning messages in formal Kurdish Sorani (e.g. if subject mismatch).",
                },
              },
              required: ["extractedText", "confidence", "warnings"],
            },
          },
        });

        const textOutput = response.text || "{}";
        const parsedResponse = JSON.parse(textOutput);

        return new Response(
          JSON.stringify(parsedResponse),
          { status: 200, headers: responseHeaders }
        );
      }

      // =========================================================================
      // STUDENT MASTERY & ADAPTIVE LEARNING ENGINE ENDPOINTS (PHASE 15)
      // =========================================================================
      
      // Helper to securely derive and authenticate student identity inside Worker
      function getWorkerAuthenticatedStudentId(req: Request): string {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          throw new Error("Missing or invalid authorization header prefix");
        }
        const token = authHeader.substring(7).trim();
        if (!token) {
          throw new Error("Authorization bearer token is empty");
        }
        
        // Cryptographically verify identity token
        const payload = AuthService.verifyToken(token);
        return payload.uid;
      }

      // Token exchange endpoint inside Cloudflare Worker
      if (pathname === "/api/auth/token" && request.method === "POST") {
        const body: any = await request.json().catch(() => ({}));
        const { studentId, idToken } = body;
        if (!studentId || typeof studentId !== "string" || studentId.trim() === "") {
          return new Response(JSON.stringify({ error: "Nasنامەی قوتابی (studentId) پێویستە." }), { status: 400, headers: responseHeaders });
        }
        
        // Cryptographically verify Firebase Identity Token
        try {
          // Worker is always running in production environment
          if (!idToken) {
            return new Response(JSON.stringify({ error: "Firebase Identity Token پێویستە لە ژینگەی بەرهەمهێناندا." }), { status: 401, headers: responseHeaders });
          }
          const verifiedUid = await AuthService.verifyFirebaseIdToken(idToken);
          if (verifiedUid !== studentId) {
            return new Response(JSON.stringify({ error: "ناونیشانی قوتابی یەکناکاتەوە لەگەڵ ناسنامەی ڕەسەن." }), { status: 403, headers: responseHeaders });
          }
        } catch (authErr: any) {
          return new Response(JSON.stringify({ error: "ناسنامەی ڕەسەن پشتڕاست نەکراوەتەوە: " + authErr.message }), { status: 401, headers: responseHeaders });
        }
        
        // Sign and return a cryptographically verified token
        const token = AuthService.signToken(studentId);
        return new Response(JSON.stringify({ token }), { status: 200, headers: responseHeaders });
      }

      // 1. GET MASTERY PROFILE
      if (pathname === "/api/learning/mastery" && request.method === "GET") {
        let studentId: string;
        try {
          studentId = getWorkerAuthenticatedStudentId(request);
        } catch (e) {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        const reqStudentId = url.searchParams.get("studentId");
        if (reqStudentId && reqStudentId !== studentId) {
          return new Response(JSON.stringify({ error: "دەستگەیشتن ڕەتکرایەوە." }), { status: 403, headers: responseHeaders });
        }

        const lp = new PersistentLearningRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        const profile = await lp.getStudentMasteryProfile(studentId);
        return new Response(JSON.stringify(profile), { status: 200, headers: responseHeaders });
      }

      // 2. GET CONCEPT MASTERY STATE
      if (pathname.startsWith("/api/learning/mastery/") && request.method === "GET") {
        let studentId: string;
        try {
          studentId = getWorkerAuthenticatedStudentId(request);
        } catch (e) {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        const reqStudentId = url.searchParams.get("studentId");
        if (reqStudentId && reqStudentId !== studentId) {
          return new Response(JSON.stringify({ error: "دەستگەیشتن ڕەتکرایەوە." }), { status: 403, headers: responseHeaders });
        }

        const parts = pathname.split("/");
        const conceptId = decodeURIComponent(parts[parts.length - 1]);

        const lp = new PersistentLearningRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        const state = await lp.getConceptMastery(studentId, conceptId);
        if (!state) {
          return new Response(JSON.stringify({ error: "چەمکی متمانە دۆزراوە بۆ ئەم قوتابییە بوونی نییە." }), { status: 404, headers: responseHeaders });
        }
        return new Response(JSON.stringify(state), { status: 200, headers: responseHeaders });
      }

      // 3. GET RECOMMENDATIONS
      if (pathname === "/api/learning/recommendations" && request.method === "GET") {
        let studentId: string;
        try {
          studentId = getWorkerAuthenticatedStudentId(request);
        } catch (e) {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        const reqStudentId = url.searchParams.get("studentId");
        if (reqStudentId && reqStudentId !== studentId) {
          return new Response(JSON.stringify({ error: "دەستگەیشتن ڕەتکرایەوە." }), { status: 403, headers: responseHeaders });
        }

        const status = url.searchParams.get("status") || undefined;
        const lp = new PersistentLearningRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        const recs = await lp.listRecommendations(studentId, status);
        return new Response(JSON.stringify(recs), { status: 200, headers: responseHeaders });
      }

      // 4. POST LEARNING EVENT
      if (pathname === "/api/learning/events" && request.method === "POST") {
        let studentId: string;
        try {
          studentId = getWorkerAuthenticatedStudentId(request);
        } catch (e) {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        const body: any = await request.json().catch(() => ({}));
        const { type, data } = body;
        if (!type) {
          return new Response(JSON.stringify({ error: "زانیاری پێویست بۆ ناردنی ڕووداو بوونی نییە." }), { status: 400, headers: responseHeaders });
        }

        const event = {
          id: "evt_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now(),
          studentId,
          timestamp: new Date().toISOString(),
          type,
          data: data || {}
        };

        const lp = new PersistentLearningRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        await lp.appendLearningEvent(studentId, event);
        const profile = await lp.getStudentMasteryProfile(studentId);
        return new Response(JSON.stringify({ success: true, eventId: event.id, profile }), { status: 200, headers: responseHeaders });
      }

      // 5. POST EXERCISE ATTEMPT (PROGRESSIVE ASSESSMENT)
      if (pathname === "/api/learning/attempts" && request.method === "POST") {
        let studentId: string;
        try {
          studentId = getWorkerAuthenticatedStudentId(request);
        } catch (e) {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        const body: any = await request.json().catch(() => ({}));
        const {
          conceptId,
          isCorrect,
          responseTimeMs,
          difficulty: reqDifficulty,
          questionText,
          studentResponse,
          misconceptionDetected,
          hintUsed,
          unreliableTiming
        } = body;

        if (!conceptId || isCorrect === undefined) {
          return new Response(JSON.stringify({ error: "زانیاری ناتەواو بۆ هەوڵدان لەسەر بابەت." }), { status: 400, headers: responseHeaders });
        }

        let difficulty: DifficultyLevel = DifficultyLevel.EASY;
        if (reqDifficulty) {
          if (Object.values(DifficultyLevel).includes(reqDifficulty as DifficultyLevel)) {
            difficulty = reqDifficulty as DifficultyLevel;
          } else {
            const numDiff = Number(reqDifficulty);
            if (numDiff === 1) difficulty = DifficultyLevel.EASY;
            else if (numDiff === 2) difficulty = DifficultyLevel.STANDARD;
            else if (numDiff === 3) difficulty = DifficultyLevel.CHALLENGING;
          }
        }

        const lp = new PersistentLearningRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        const currentProfile = await lp.getStudentMasteryProfile(studentId);
        const currentState = await lp.getConceptMastery(studentId, conceptId);

        const newState = AdaptiveLearningEngine.calculateNewMastery(currentState, {
          isCorrect,
          responseTimeMs: responseTimeMs || 5000,
          difficulty,
          hintUsed: !!hintUsed,
          unreliableTiming: !!unreliableTiming
        });

        await lp.saveMasteryChange(studentId, conceptId, newState);

        const attempt = {
          id: "att_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now(),
          studentId,
          conceptId,
          isCorrect,
          responseTimeMs: responseTimeMs || 5000,
          difficulty,
          questionText: questionText || "",
          studentResponse: studentResponse || "",
          misconceptionDetected,
          timestamp: new Date().toISOString()
        };

        const detectedMisc = AdaptiveLearningEngine.detectMisconception(attempt, currentProfile.activeMisconceptions);
        if (detectedMisc) {
          const index = currentProfile.activeMisconceptions.findIndex(
            m => m.misconceptionId === detectedMisc.misconceptionId && m.resolvedAt === null
          );
          if (index >= 0) {
            currentProfile.activeMisconceptions[index] = detectedMisc;
          } else {
            currentProfile.activeMisconceptions.push(detectedMisc);
          }
        } else if (isCorrect) {
          currentProfile.activeMisconceptions = currentProfile.activeMisconceptions.map(m => {
            if (m.conceptId === conceptId && m.resolvedAt === null) {
              if (m.status === MisconceptionStatus.SUSPECTED || m.status === MisconceptionStatus.CONFIRMED) {
                return {
                  ...m,
                  status: MisconceptionStatus.IMPROVING,
                  confidence: "medium" as const,
                  lastDetectedAt: new Date().toISOString()
                };
              } else if (m.status === MisconceptionStatus.IMPROVING) {
                return {
                  ...m,
                  status: MisconceptionStatus.RESOLVED,
                  confidence: "high" as const,
                  resolvedAt: new Date().toISOString()
                };
              }
            }
            return m;
          });
        }

        await lp.saveMasteryChange(studentId, conceptId, newState);

        const event = {
          id: "evt_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now(),
          studentId,
          timestamp: new Date().toISOString(),
          type: "EXERCISE_ATTEMPT" as const,
          data: attempt
        };
        await lp.appendLearningEvent(studentId, event);

        let conceptTitleKu = conceptId;
        const registry = CurriculumRegistry.getInstance();
        const lesson = registry.getAllLessons().find(l => l.concepts.includes(conceptId));
        if (lesson) {
          conceptTitleKu = conceptId;
        }

        const prerequisites: string[] = [];
        if (conceptId === "هاوکێشە" || conceptId === "هاوکێشەی هێڵی") {
          prerequisites.push("گۆڕدراو");
        }

        const recommendation = AdaptiveLearningEngine.generateRecommendation(
          studentId,
          conceptId,
          conceptTitleKu,
          currentProfile,
          prerequisites
        );

        await lp.saveRecommendation(recommendation);

        return new Response(JSON.stringify({
          success: true,
          masteryState: newState,
          misconceptionDetected: detectedMisc,
          recommendation
        }), { status: 200, headers: responseHeaders });
      }

      // 6. POST SESSION START
      if (pathname === "/api/learning/sessions/start" && request.method === "POST") {
        let studentId: string;
        try {
          studentId = getWorkerAuthenticatedStudentId(request);
        } catch (e) {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        const session = {
          id: "ses_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now(),
          studentId,
          startTime: new Date().toISOString(),
          endTime: null,
          events: [],
          focusScore: 1.0
        };

        const lp = new PersistentLearningRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        await lp.createLearningSession(session);
        return new Response(JSON.stringify(session), { status: 200, headers: responseHeaders });
      }

      // 7. POST SESSION END
      if (pathname.startsWith("/api/learning/sessions/") && pathname.endsWith("/end") && request.method === "POST") {
        let studentId: string;
        try {
          studentId = getWorkerAuthenticatedStudentId(request);
        } catch (e) {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        const parts = pathname.split("/");
        const sessionId = decodeURIComponent(parts[parts.length - 2]);

        const body: any = await request.json().catch(() => ({}));
        const { focusScore } = body;

        const session = {
          id: sessionId,
          studentId,
          startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          endTime: new Date().toISOString(),
          events: [],
          focusScore: focusScore !== undefined ? focusScore : 1.0
        };

        const lp = new PersistentLearningRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        await lp.updateLearningSession(session);
        return new Response(JSON.stringify(session), { status: 200, headers: responseHeaders });
      }

      // =========================================================================
      // ASSESSMENT & QUIZ INTELLIGENCE ROUTING ENDPOINTS (PHASE 16)
      // =========================================================================

      // 1. POST START ASSESSMENT
      if (pathname === "/api/assessment/start" && request.method === "POST") {
        let studentId: string;
        try {
          studentId = getWorkerAuthenticatedStudentId(request);
        } catch (e) {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        const body: any = await request.json().catch(() => ({}));
        const { unitId, subjectId, type, titleKu, instructionsKu } = body;

        if (!unitId || !subjectId) {
          return new Response(JSON.stringify({ error: "زانیاری پێویست بۆ دەستپێکردنی تاقیکردنەوە بوونی نییە." }), { status: 400, headers: responseHeaders });
        }

        const lp = new PersistentLearningRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        const ap = new PersistentAssessmentRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        const service = new AssessmentService(ap);

        const profile = await lp.getStudentMasteryProfile(studentId);
        
        // Calculate average mastery score for this unit
        const lessons = CurriculumRegistry.getInstance().getAllLessons().filter(l => l.unitId === unitId);
        const conceptIds = lessons.reduce((acc, l) => acc.concat(l.concepts), [] as string[]);
        let totalMastery = 0;
        let count = 0;
        for (const cid of conceptIds) {
          const state = profile.conceptMasteries[cid];
          if (state) {
            totalMastery += state.masteryScore;
            count++;
          }
        }
        const avgMastery = count > 0 ? totalMastery / count : 0.0;

        // Compose an elegant default blueprint matching requested parameters
        const blueprint: AssessmentBlueprint = {
          id: `bp_${unitId}_${type || "mastery_check"}_${Date.now()}`,
          type: type === "MASTERY_CHECK" ? AssessmentType.MASTERY_CHECK : AssessmentType.DIAGNOSTIC,
          curriculumId: "curriculum-zana-default",
          grade: "9",
          subjectId,
          unitId,
          conceptIds,
          totalQuestions: type === "MASTERY_CHECK" ? 10 : 5,
          targetDurationSeconds: type === "MASTERY_CHECK" ? 600 : 300,
          difficultyDistribution: {
            [DifficultyLevel.FOUNDATION]: 0.1,
            [DifficultyLevel.EASY]: 0.2,
            [DifficultyLevel.STANDARD]: 0.4,
            [DifficultyLevel.CHALLENGING]: 0.2,
            [DifficultyLevel.ADVANCED]: 0.1
          },
          questionTypeDistribution: {
            [QuestionType.MULTIPLE_CHOICE_SINGLE]: 0.6,
            [QuestionType.MULTIPLE_CHOICE_MULTIPLE]: 0.1,
            [QuestionType.TRUE_FALSE]: 0.1,
            [QuestionType.SHORT_ANSWER]: 0.1,
            [QuestionType.NUMERIC]: 0.1,
            [QuestionType.ORDERING]: 0.0,
            [QuestionType.MATCHING]: 0.0
          },
          learningObjectives: [],
          masteryObjectives: [],
          passingThresholdPercentage: 70,
          partialCreditPolicy: "strict",
          retryPolicy: { maxRetries: 3, cooldownSeconds: 0 },
          randomizationRules: { shuffleQuestions: true, shuffleOptions: true }
        };

        const { attempt, firstQuestion } = await service.startAssessment(
          studentId,
          blueprint,
          titleKu || "تاقیکردنەوەی نوێ",
          instructionsKu || "تکایە بە وریاییەوە پرسیارەکان بخوێنەرەوە.",
          avgMastery
        );

        return new Response(JSON.stringify({ attempt, firstQuestion, blueprint }), { status: 200, headers: responseHeaders });
      }

      // 2. POST SUBMIT ANSWER
      if (pathname === "/api/assessment/submit" && request.method === "POST") {
        let studentId: string;
        try {
          studentId = getWorkerAuthenticatedStudentId(request);
        } catch (e) {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        const body: any = await request.json().catch(() => ({}));
        const { attemptId, questionId, submission, blueprint } = body;

        if (!attemptId || !questionId || !submission || !blueprint) {
          return new Response(JSON.stringify({ error: "ناردنی داواکارییەکە کەموکوڕی تێدایە." }), { status: 400, headers: responseHeaders });
        }

        const lp = new PersistentLearningRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        const ap = new PersistentAssessmentRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        const service = new AssessmentService(ap);

        const result = await service.submitAnswer(
          attemptId,
          questionId,
          submission,
          lp,
          blueprint
        );

        return new Response(JSON.stringify(result), { status: 200, headers: responseHeaders });
      }

      // 3. POST FINISH ASSESSMENT
      if (pathname === "/api/assessment/finish" && request.method === "POST") {
        let studentId: string;
        try {
          studentId = getWorkerAuthenticatedStudentId(request);
        } catch (e) {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        const body: any = await request.json().catch(() => ({}));
        const { attemptId, blueprint } = body;

        if (!attemptId || !blueprint) {
          return new Response(JSON.stringify({ error: "ناردنی داواکارییەکە کەموکوڕی تێدایە." }), { status: 400, headers: responseHeaders });
        }

        const lp = new PersistentLearningRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        const ap = new PersistentAssessmentRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        const service = new AssessmentService(ap);

        const result = await service.finishAssessment(attemptId, lp, blueprint);

        return new Response(JSON.stringify({ result }), { status: 200, headers: responseHeaders });
      }

      // 4. GET ATTEMPT DETAILS
      if (pathname.startsWith("/api/assessment/attempts/") && request.method === "GET") {
        let studentId: string;
        try {
          studentId = getWorkerAuthenticatedStudentId(request);
        } catch (e) {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        const parts = pathname.split("/");
        const attemptId = decodeURIComponent(parts[parts.length - 1]);

        const ap = new PersistentAssessmentRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        const attempt = await ap.getAttempt(attemptId);

        if (!attempt) {
          return new Response(JSON.stringify({ error: "هەوڵدانەکە نەدۆزرایەوە." }), { status: 404, headers: responseHeaders });
        }

        if (attempt.studentId !== studentId) {
          return new Response(JSON.stringify({ error: "دەستگەیشتن بۆ ئەم هەوڵدانە تەنها بۆ خاوەنەکەیەتی." }), { status: 403, headers: responseHeaders });
        }

        const result = await ap.getResult(attemptId);

        return new Response(JSON.stringify({ attempt, result }), { status: 200, headers: responseHeaders });
      }

      // Fallback 404
      return new Response(
        JSON.stringify({ error: "نۆت فۆند - ڕێڕەوی داواکراو بوونی نییە." }),
        { status: 404, headers: responseHeaders }
      );
    } catch (err: unknown) {
      console.error("[AI Worker Diagnostic]", {
        pathname,
        hasApiKey: Boolean(env.GEMINI_API_KEY),
        modelPrimary: getPrimaryModel(env),
        modelVision: getVisionModel(env),
        error: err instanceof Error ? err.message.replace(/key=[^&]+/gi, "key=REDACTED") : String(err),
      });
      const category = classifyError(err);
      return new Response(
        JSON.stringify({ error: getClientSafeErrorMessage(category) }),
        { status: 500, headers: responseHeaders }
      );
    }
  },
};
