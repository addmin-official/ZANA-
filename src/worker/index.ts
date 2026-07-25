import { GoogleGenAI, Type } from "@google/genai";
import { buildSystemPrompt } from "../ai/buildSystemPrompt.ts";
import { ProviderAdapter } from "../server/ai/AiProvider.ts";
import { classifyError, getClientSafeErrorMessage, type SafeErrorCategory } from "../server/ai/AiErrors.ts";
export { classifyError, getClientSafeErrorMessage, type SafeErrorCategory };
import { PersistentLearningRecordProvider } from "../learning/providers/LearningRecordProvider.ts";
import { AdaptiveLearningEngine } from "../learning/engine/AdaptiveLearningEngine.ts";
import { DifficultyLevel, MisconceptionStatus } from "../learning/domain/MasteryTypes.ts";
import { CurriculumRegistry } from "../curriculum/registry/CurriculumRegistry.ts";
import { AuthService } from "../services/authService.ts";
import { getPrimaryModel as getCentralPrimaryModel, getVisionModel as getCentralVisionModel, normalizeModel, AI_CONFIG } from "../server/config/aiModels.ts";
import {
  PersistentAssessmentRecordProvider,
  AssessmentService,
  AssessmentBlueprint,
  AssessmentType,
  QuestionType
} from "../assessment/index.ts";
import {
  PersistentLearningPlanProvider,
  LearningPlanService,
  StudyTaskStatus,
  PlanningValidation,
  PlanRebalancer
} from "../planning/index.ts";

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
  
  const allowed = [
    ...(env.ALLOWED_ORIGINS || "").split(","),
    ...((env as any).ZANA_FRONTEND_ORIGIN ? [(env as any).ZANA_FRONTEND_ORIGIN] : []),
    "https://zana-app.web.app",
    "https://zana-official.web.app",
    "https://zana.krd",
    "http://localhost:3000",
    "http://localhost:5173",
  ]
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
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseapp.com https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.workers.dev https://*.firebaseio.com https://*.googleapis.com https://identitytoolkit.googleapis.com;");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
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
  });
}

export interface GenerateContentParams {
  model: string;
  contents: any;
  config?: any;
  pathname: string;
}

export async function executeGeminiRequest(
  ai: GoogleGenAI,
  params: GenerateContentParams,
  env: Env
): Promise<any> {
  const correlationId = crypto.randomUUID();
  const selectedModel = normalizeModel(params.model);
  const maxRetries = AI_CONFIG.maxRetries || 2;
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= maxRetries) {
    try {
      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: params.contents,
        config: params.config,
      });

      return response;
    } catch (err: any) {
      lastError = err;
      const category = classifyError(err);

      const isRetryable =
        category === "quota_exceeded" ||
        category === "rate_limited" ||
        category === "provider_unavailable" ||
        category === "timeout";

      let providerStatusCode = 500;
      let providerErrorCode = category;
      if (err && typeof err === "object") {
        if (typeof err.status === "number") providerStatusCode = err.status;
        else if (typeof err.code === "number") providerStatusCode = err.code;

        if (err.error && typeof err.error === "object") {
          if (typeof err.error.code === "number") providerStatusCode = err.error.code;
          if (typeof err.error.status === "string") providerErrorCode = err.error.status;
        }
      }

      console.error("[AI Worker Diagnostic]", {
        correlationId,
        pathname: params.pathname,
        category,
        providerStatusCode: providerStatusCode || (category === "invalid_credentials" ? 401 : category === "permission_denied" ? 403 : category === "model_not_found" ? 404 : category === "invalid_provider_request" ? 400 : 500),
        providerErrorCode,
        selectedModel,
        hasApiKey: Boolean(env.GEMINI_API_KEY),
        hasModelOverride: Boolean(env.GEMINI_PRIMARY_MODEL || env.GEMINI_VISION_MODEL),
        retryCount: attempt,
      });

      if (!isRetryable || attempt >= maxRetries) {
        throw err;
      }

      attempt++;
      const backoffMs = Math.min(300 * Math.pow(2, attempt - 1), 1000);
      await new Promise((res) => setTimeout(res, backoffMs));
    }
  }

  throw lastError;
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
        const { message, profile } = body;

        if (!message || !profile) {
          return new Response(
            JSON.stringify({ error: "داواکارییەکە کەموکوڕی تێدایە." }),
            { status: 400, headers: responseHeaders }
          );
        }

        const chatResult = await ProviderAdapter.chat(env.GEMINI_API_KEY, body, env);
        const replyText = chatResult.text;
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

        const assessmentResult = await ProviderAdapter.assessment(env.GEMINI_API_KEY, body, env);

        const currentQuestionNum = state.currentQuestion;
        const isLast = currentQuestionNum === 5;
        let finalLevel = null;
        if (isLast) {
          const correctCount = (state.correctAnswers || []).filter(Boolean).length + (assessmentResult.isCorrect ? 1 : 0);
          if (correctCount <= 2) finalLevel = "سەرەتا";
          else if (correctCount <= 4) finalLevel = "مامناوەند";
          else finalLevel = "پێشکەوتوو";
        }

        return new Response(
          JSON.stringify({
            question: assessmentResult.question,
            feedback: assessmentResult.feedback,
            isCorrect: assessmentResult.isCorrect,
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

        const reportResult = await ProviderAdapter.report(env.GEMINI_API_KEY, body, env);

        return new Response(
          JSON.stringify({
            recommendation: reportResult.recommendation,
          }),
          { status: 200, headers: responseHeaders }
        );
      }

      // Endpoint: POST /api/study/ask
      if (pathname === "/api/study/ask" && request.method === "POST") {
        const body: any = await request.json().catch(() => ({}));
        const { message, context } = body;

        if (!message || !context) {
          return new Response(
            JSON.stringify({ error: "داواکارییەکە کەموکوڕی تێدایە." }),
            { status: 400, headers: responseHeaders }
          );
        }

        const askResult = await ProviderAdapter.ask(env.GEMINI_API_KEY, body, env);
        const replyText = askResult.text;
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
          return new Response(
            JSON.stringify({ error: getClientSafeErrorMessage("validation") }),
            { status: 400, headers: responseHeaders }
          );
        }

        // 5MB file-size validation
        if (file.size > 5 * 1024 * 1024) {
          return new Response(
            JSON.stringify({ error: getClientSafeErrorMessage("upload_too_large") }),
            { status: 413, headers: responseHeaders }
          );
        }

        // Magic byte image signature validation
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const isValidSignature = validateImageSignature(uint8Array, file.type);
        if (!isValidSignature) {
          return new Response(
            JSON.stringify({ error: getClientSafeErrorMessage("unsupported_file") }),
            { status: 415, headers: responseHeaders }
          );
        }

        const contextStr = formData.get("context") as string | null;
        const editedTextRaw = formData.get("editedText") as string | null;
        const modeRaw = (formData.get("mode") as string | null) || "explain";

        let editedText: string | undefined;
        if (editedTextRaw) {
          const trimmed = editedTextRaw.trim();
          if (trimmed.length > 5000) {
            return new Response(
              JSON.stringify({ error: getClientSafeErrorMessage("validation") }),
              { status: 400, headers: responseHeaders }
            );
          }
          editedText = trimmed;
        }

        if (!contextStr || contextStr.length > 50 * 1024) {
          return new Response(
            JSON.stringify({ error: getClientSafeErrorMessage("validation") }),
            { status: 400, headers: responseHeaders }
          );
        }

        let parsed: any;
        try {
          parsed = JSON.parse(contextStr);
        } catch (e) {
          return new Response(
            JSON.stringify({ error: getClientSafeErrorMessage("validation") }),
            { status: 400, headers: responseHeaders }
          );
        }

        // Verify context fields strictly
        const { studentId, grade, stream, subject, level } = parsed;
        if (
          typeof studentId !== "string" || !studentId.trim() ||
          typeof grade !== "string" || !grade.trim() ||
          typeof stream !== "string" || !stream.trim() ||
          typeof subject !== "string" || !subject.trim() ||
          typeof level !== "string" || !level.trim()
        ) {
          return new Response(
            JSON.stringify({ error: getClientSafeErrorMessage("validation") }),
            { status: 400, headers: responseHeaders }
          );
        }

        const visionResult = await ProviderAdapter.vision(
          env.GEMINI_API_KEY,
          {
            imageBytes: uint8Array,
            mimeType: file.type,
            context: parsed,
            mode: modeRaw as any,
            editedText,
          },
          env
        );

        return new Response(
          JSON.stringify(visionResult),
          { status: 200, headers: responseHeaders }
        );
      }

      // =========================================================================
      // STUDENT MASTERY & ADAPTIVE LEARNING ENGINE ENDPOINTS (PHASE 15)
      // =========================================================================
      
      // Helper to securely derive and authenticate student identity inside Worker using Firebase ID Token
      async function getWorkerAuthenticatedStudentId(req: Request): Promise<string> {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          throw new Error("Missing or invalid authorization header prefix");
        }
        const token = authHeader.substring(7).trim();
        if (!token) {
          throw new Error("Authorization bearer token is empty");
        }
        
        // Cryptographically verify Firebase ID token directly
        const claims = await AuthService.verifyFirebaseIdToken(token);
        return claims.uid;
      }

      // Token verification endpoint inside Cloudflare Worker
      if (pathname === "/api/auth/token" && request.method === "POST") {
        const body: any = await request.json().catch(() => ({}));
        const { idToken } = body;
        if (!idToken) {
          return new Response(JSON.stringify({ error: "Firebase Identity Token پێویستە." }), { status: 400, headers: responseHeaders });
        }
        
        try {
          const claims = await AuthService.verifyFirebaseIdToken(idToken);
          return new Response(JSON.stringify({ ok: true, uid: claims.uid, expiresAt: claims.exp }), { status: 200, headers: responseHeaders });
        } catch (authErr: any) {
          return new Response(JSON.stringify({ error: "ناسنامەی ڕەسەن پشتڕاست نەکراوەتەوە: " + authErr.message }), { status: 401, headers: responseHeaders });
        }
      }

      // 1. GET MASTERY PROFILE
      if (pathname === "/api/learning/mastery" && request.method === "GET") {
        let studentId: string;
        try {
          studentId = await getWorkerAuthenticatedStudentId(request);
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
          studentId = await getWorkerAuthenticatedStudentId(request);
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
          studentId = await getWorkerAuthenticatedStudentId(request);
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
          studentId = await getWorkerAuthenticatedStudentId(request);
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
          studentId = await getWorkerAuthenticatedStudentId(request);
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
          studentId = await getWorkerAuthenticatedStudentId(request);
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
          studentId = await getWorkerAuthenticatedStudentId(request);
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
          studentId = await getWorkerAuthenticatedStudentId(request);
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
          studentId = await getWorkerAuthenticatedStudentId(request);
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
          studentId = await getWorkerAuthenticatedStudentId(request);
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
          studentId = await getWorkerAuthenticatedStudentId(request);
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

      // =========================================================================
      // PERSONAL LEARNING PLAN & STUDY PATH ENGINE ROUTING ENDPOINTS (PHASE 17)
      // =========================================================================

      if (pathname.startsWith("/api/planning")) {
        let studentId: string;
        try {
          studentId = await getWorkerAuthenticatedStudentId(request);
        } catch (e) {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        try {
          const kv = env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV;
          const planProvider = new PersistentLearningPlanProvider(kv, "production");
          const learningProvider = new PersistentLearningRecordProvider(kv, "production");
          const planningService = new LearningPlanService(planProvider, learningProvider);

          // GET /api/planning/preferences
          if (pathname === "/api/planning/preferences" && request.method === "GET") {
            const preferences = await planningService.getPreferences(studentId);
            return new Response(JSON.stringify(preferences), { status: 200, headers: responseHeaders });
          }

          // POST /api/planning/preferences
          if (pathname === "/api/planning/preferences" && request.method === "POST") {
            const body: any = await request.json().catch(() => ({}));
            const preferences = await planningService.savePreferences(studentId, body);
            return new Response(JSON.stringify(preferences), { status: 200, headers: responseHeaders });
          }

          // GET /api/planning/goals
          if (pathname === "/api/planning/goals" && request.method === "GET") {
            const goal = await planningService.getActiveGoal(studentId);
            return new Response(JSON.stringify({ goals: [goal], activeGoal: goal }), { status: 200, headers: responseHeaders });
          }

          // POST /api/planning/goals
          if (pathname === "/api/planning/goals" && request.method === "POST") {
            const body: any = await request.json().catch(() => ({}));
            const validated = PlanningValidation.validateGoal(studentId, body);
            const fullGoal = {
              id: `goal_${studentId}_${Date.now()}`,
              studentId,
              type: validated.type!,
              titleKu: validated.titleKu!,
              targetSubjectId: validated.targetSubjectId!,
              targetCurriculumScope: body.targetCurriculumScope,
              targetDate: body.targetDate,
              weeklyTargetMinutes: validated.weeklyTargetMinutes!,
              successCriteria: body.successCriteria || { metric: "mastery_score", targetValue: 0.8 },
              status: "ACTIVE" as any,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            await planProvider.saveGoal(fullGoal as any);
            return new Response(JSON.stringify(fullGoal), { status: 200, headers: responseHeaders });
          }

          // POST /api/planning/generate
          if (pathname === "/api/planning/generate" && request.method === "POST") {
            const body: any = await request.json().catch(() => ({}));
            const plan = await planningService.generatePlanForStudent(studentId, {
              mode: body.mode || "MANUAL_REPLAN",
              startDateIso: body.startDateIso
            });
            return new Response(JSON.stringify(plan), { status: 200, headers: responseHeaders });
          }

          // GET /api/planning/current
          if (pathname === "/api/planning/current" && request.method === "GET") {
            const plan = await planningService.getCurrentPlan(studentId);
            return new Response(JSON.stringify(plan), { status: 200, headers: responseHeaders });
          }

          // GET /api/planning/today
          if (pathname === "/api/planning/today" && request.method === "GET") {
            const dateParam = url.searchParams.get("date") || undefined;
            const todayPlan = await planningService.getTodayPlan(studentId, dateParam);
            return new Response(JSON.stringify(todayPlan), { status: 200, headers: responseHeaders });
          }

          // GET /api/planning/week
          if (pathname === "/api/planning/week" && request.method === "GET") {
            const weekPlan = await planningService.getWeekPlan(studentId);
            return new Response(JSON.stringify(weekPlan), { status: 200, headers: responseHeaders });
          }

          // POST /api/planning/tasks/:taskId/start
          if (pathname.includes("/tasks/") && pathname.endsWith("/start") && request.method === "POST") {
            const parts = pathname.split("/");
            const taskId = parts[parts.indexOf("tasks") + 1];
            const res = await planningService.updateTaskStatus(studentId, taskId, StudyTaskStatus.IN_PROGRESS);
            return new Response(JSON.stringify(res), { status: 200, headers: responseHeaders });
          }

          // POST /api/planning/tasks/:taskId/complete
          if (pathname.includes("/tasks/") && pathname.endsWith("/complete") && request.method === "POST") {
            const parts = pathname.split("/");
            const taskId = parts[parts.indexOf("tasks") + 1];
            const body: any = await request.json().catch(() => ({}));
            const res = await planningService.updateTaskStatus(studentId, taskId, StudyTaskStatus.COMPLETED, body.actualDurationMinutes);
            return new Response(JSON.stringify(res), { status: 200, headers: responseHeaders });
          }

          // POST /api/planning/tasks/:taskId/skip
          if (pathname.includes("/tasks/") && pathname.endsWith("/skip") && request.method === "POST") {
            const parts = pathname.split("/");
            const taskId = parts[parts.indexOf("tasks") + 1];
            const res = await planningService.updateTaskStatus(studentId, taskId, StudyTaskStatus.SKIPPED);
            return new Response(JSON.stringify(res), { status: 200, headers: responseHeaders });
          }

          // POST /api/planning/rebalance
          if (pathname === "/api/planning/rebalance" && request.method === "POST") {
            const plan = await planningService.getCurrentPlan(studentId);
            const prefs = await planningService.getPreferences(studentId);
            const { updatedPlan, adjustment } = PlanRebalancer.rebalancePlan(plan, prefs, {});
            await planProvider.savePlan(updatedPlan);
            await planProvider.saveAdjustment(adjustment);
            return new Response(JSON.stringify({ plan: updatedPlan, adjustment }), { status: 200, headers: responseHeaders });
          }

          // GET /api/planning/next-action
          if (pathname === "/api/planning/next-action" && request.method === "GET") {
            const nextAction = await planningService.getNextBestAction(studentId);
            return new Response(JSON.stringify(nextAction), { status: 200, headers: responseHeaders });
          }

          // GET /api/planning/progress
          if (pathname === "/api/planning/progress" && request.method === "GET") {
            const progress = await planningService.getProgress(studentId);
            return new Response(JSON.stringify(progress), { status: 200, headers: responseHeaders });
          }
        } catch (planError: any) {
          const errMsg = planError?.message || String(planError);
          if (errMsg.includes("نەدۆزرایەوە")) {
            return new Response(JSON.stringify({ error: errMsg }), { status: 404, headers: responseHeaders });
          }
          if (errMsg.includes("ڕێگەی پێدراو نییە")) {
            return new Response(JSON.stringify({ error: errMsg }), { status: 403, headers: responseHeaders });
          }
          if (errMsg.includes("گوێستنەوەی ڕەوشی ئەرک") || errMsg.includes("transition")) {
            return new Response(JSON.stringify({ error: errMsg }), { status: 409, headers: responseHeaders });
          }
          if (errMsg.includes("پێویست") || errMsg.includes("پێویستە") || errMsg.includes("ناڕاست")) {
            return new Response(JSON.stringify({ error: errMsg }), { status: 400, headers: responseHeaders });
          }
          return new Response(JSON.stringify({ error: errMsg }), { status: 400, headers: responseHeaders });
        }
      }

      // Fallback 404
      return new Response(
        JSON.stringify({ error: "نۆت فۆند - ڕێڕەوی داواکراو بوونی نییە." }),
        { status: 404, headers: responseHeaders }
      );
    } catch (err: unknown) {
      const category = classifyError(err);
      const correlationId = crypto.randomUUID();
      console.error("[AI Worker Diagnostic]", {
        correlationId,
        pathname,
        category,
        hasApiKey: Boolean(env.GEMINI_API_KEY),
        hasModelOverride: Boolean(env.GEMINI_PRIMARY_MODEL || env.GEMINI_VISION_MODEL),
        modelPrimary: getPrimaryModel(env),
        modelVision: getVisionModel(env),
        errorName: err instanceof Error ? err.name : "UnknownError",
      });
      return new Response(
        JSON.stringify({ error: getClientSafeErrorMessage(category) }),
        { status: 500, headers: responseHeaders }
      );
    }
  },
};
