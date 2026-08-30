import { ProviderAdapter } from "../server/ai/AiProvider.ts";
import { classifyError, getClientSafeErrorMessage, type SafeErrorCategory } from "../server/ai/AiErrors.ts";
import { resolvePrimaryModel } from "../server/config/aiModels.ts";
export { classifyError, getClientSafeErrorMessage, type SafeErrorCategory };
import { PersistentLearningRecordProvider } from "../learning/providers/LearningRecordProvider.ts";
import { AdaptiveLearningEngine } from "../learning/engine/AdaptiveLearningEngine.ts";
import { DifficultyLevel, MisconceptionStatus, LearningEvent, LearningEventType, ExerciseAttempt, LearningSession } from "../learning/domain/MasteryTypes.ts";
import { CurriculumRegistry } from "../curriculum/registry/CurriculumRegistry.ts";
import { AuthService } from "../services/authService.ts";
import {
  ChatRequest,
  AssessmentRequest,
  ReportRequest,
  AskRequest,
  VisionRequest,
  parseChatRequest,
  parseAssessmentRequest,
  parseReportRequest,
  parseAskRequest,
  parseVisionRequest,
} from "../server/ai/AiContracts.ts";
import {
  PersistentAssessmentRecordProvider,
  AssessmentService,
  AssessmentBlueprint,
  AssessmentType,
  QuestionType,
  AnswerSubmission,
  AssessmentKVStore,
} from "../assessment/index.ts";
import {
  PersistentLearningPlanProvider,
  LearningPlanService,
  StudyTaskStatus,
  PlanningValidation,
  PlanRebalancer,
  PlanGenerationMode,
} from "../planning/index.ts";
import { handleStudyPlanRoute } from "../server/api/study/plan.ts";
import { handleStudentProfileRoute } from "../server/api/student/profile.ts";
import { handleFeedbackRoute } from "../server/api/feedback.ts";
import { handleTelemetryExportRoute } from "../server/api/internal/telemetryExport.ts";
import { handleHealthRoute } from "../server/api/health.ts";
import { enforceAiRateLimit } from "../server/middleware/rateLimiter.ts";
import { applySecurityHeaders } from "../server/middleware/security.ts";
import { validateProductionEnv } from "../server/config/envValidator.ts";

export interface Env {
  GEMINI_API_KEY: string;
  ALLOWED_ORIGINS: string;
  FIREBASE_PROJECT_ID: string;
  GEMINI_PRIMARY_MODEL?: string;
  GEMINI_VISION_MODEL?: string;
  ADMIN_TELEMETRY_SECRET?: string;
  PROVIDER_PREFLIGHT_TOKEN?: string;
  ZANA_REVISION?: string;
  ZANA_LEARNING_KV?: AssessmentKVStore;
  LEARNING_RECORDS_KV?: AssessmentKVStore;
  ASSETS?: { fetch: (req: Request) => Promise<Response> };
  [key: string]: unknown;
}

// 1. IN-MEMORY RATE LIMITING
export interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitDb = new Map<string, RateLimitRecord>();
const MAX_RATE_LIMIT_ENTRIES = 10000;

export function isRateLimited(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  if (rateLimitDb.size > MAX_RATE_LIMIT_ENTRIES) {
    for (const [k, v] of rateLimitDb.entries()) {
      v.timestamps = v.timestamps.filter((t) => now - t < windowMs);
      if (v.timestamps.length === 0) {
        rateLimitDb.delete(k);
      }
    }
  }

  const record = rateLimitDb.get(ip) || { timestamps: [] };
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= limit) {
    return true;
  }

  record.timestamps.push(now);
  rateLimitDb.set(ip, record);
  return false;
}

// Timing-safe comparison using Web Crypto for Bearer token validation
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const aData = encoder.encode(a);
  const bData = encoder.encode(b);

  if (aData.byteLength !== bData.byteLength) {
    return false;
  }

  const aHash = await crypto.subtle.digest("SHA-256", aData);
  const bHash = await crypto.subtle.digest("SHA-256", bData);

  const aView = new Uint8Array(aHash);
  const bView = new Uint8Array(bHash);

  let result = 0;
  for (let i = 0; i < aView.length; i++) {
    result |= aView[i] ^ bView[i];
  }
  return result === 0;
}

// 2. MAGIC BYTE SIGNATURE VALIDATOR FOR IMAGES
export function validateImageSignature(buffer: Uint8Array, declaredMimeType: string): boolean {
  if (!buffer || buffer.length === 0) {
    return false;
  }

  const mime = declaredMimeType.toLowerCase().trim();

  if (mime === "image/jpeg" || mime === "image/jpg") {
    if (buffer.length < 3) return false;
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
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
    const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    return isRiff && isWebp;
  }

  return false;
}

function isOriginAllowed(origin: string | null, env: Env): boolean {
  if (!origin) {
    return true;
  }

  const allowed = [
    ...(env.ALLOWED_ORIGINS || "").split(","),
    "https://zana-api-worker.zana-platform.workers.dev",
    "https://zana.krd",
  ]
    .map((o) => o.trim().toLowerCase().replace(/\/$/, ""))
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

  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseapp.com https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.workers.dev https://*.firebaseio.com https://*.googleapis.com https://identitytoolkit.googleapis.com;"
  );
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "1; mode=block");

  return headers;
}

// 3. REUSABLE NARROW PARSERS FOR WORKER INPUT VALIDATION
export function parseJsonObject(data: unknown, errorMessage = "داواکارییەکە کەموکوڕی تێدایە."): Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(errorMessage);
  }
  return data as Record<string, unknown>;
}

export function requireString(value: unknown, name: string, errorMessage?: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(errorMessage || `${name} پێویستە و دەبێت دەق بێت.`);
  }
  return value.trim();
}

export function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value.trim();
  return undefined;
}

export function requireBoolean(value: unknown, name: string, errorMessage?: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(errorMessage || `${name} پێویستە و دەبێت بڵیان (تڕوو/فۆڵس) بێت.`);
  }
  return value;
}

export function optionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

export function requireFiniteNumber(value: unknown, name: string, errorMessage?: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(errorMessage || `${name} پێویستە و دەبێت ژمارەیەکی دیاریکراو بێت.`);
  }
  return value;
}

export function optionalFiniteNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return undefined;
}

export function parseLearningEventType(value: unknown): LearningEventType {
  const validTypes: LearningEventType[] = [
    "EXERCISE_ATTEMPT",
    "LESSON_VIEW",
    "SESSION_START",
    "SESSION_END",
    "RECOMMENDATION_DECISION",
  ];
  if (typeof value === "string" && validTypes.includes(value as LearningEventType)) {
    return value as LearningEventType;
  }
  throw new Error("جۆری ڕووداوی فێربوون نادروستە.");
}

export function parseDifficultyLevel(value: unknown): DifficultyLevel {
  if (typeof value === "string") {
    if (Object.values(DifficultyLevel).includes(value as DifficultyLevel)) {
      return value as DifficultyLevel;
    }
  }
  if (typeof value === "number") {
    if (value === 1) return DifficultyLevel.EASY;
    if (value === 2) return DifficultyLevel.STANDARD;
    if (value === 3) return DifficultyLevel.CHALLENGING;
  }
  return DifficultyLevel.EASY;
}

export function parseAssessmentBlueprint(value: unknown): AssessmentBlueprint {
  const obj = parseJsonObject(value, "دیزاینی تاقیکردنەوە (blueprint) کەموکوڕی تێدایە.");
  const id = requireString(obj.id, "blueprint.id");
  const curriculumId = requireString(obj.curriculumId, "blueprint.curriculumId");
  const grade = requireString(obj.grade, "blueprint.grade");
  const subjectId = requireString(obj.subjectId, "blueprint.subjectId");
  const totalQuestions = requireFiniteNumber(obj.totalQuestions, "blueprint.totalQuestions");
  const targetDurationSeconds = requireFiniteNumber(obj.targetDurationSeconds, "blueprint.targetDurationSeconds");
  const passingThresholdPercentage = requireFiniteNumber(obj.passingThresholdPercentage, "blueprint.passingThresholdPercentage");

  const type = (typeof obj.type === "string" && Object.values(AssessmentType).includes(obj.type as AssessmentType))
    ? (obj.type as AssessmentType)
    : AssessmentType.MASTERY_CHECK;

  const unitId = optionalString(obj.unitId);
  const lessonIds = Array.isArray(obj.lessonIds) ? obj.lessonIds.filter((x): x is string => typeof x === "string") : undefined;
  const conceptIds = Array.isArray(obj.conceptIds) ? obj.conceptIds.filter((x): x is string => typeof x === "string") : undefined;
  const skillIds = Array.isArray(obj.skillIds) ? obj.skillIds.filter((x): x is string => typeof x === "string") : undefined;
  const learningObjectives = Array.isArray(obj.learningObjectives) ? obj.learningObjectives.filter((x): x is string => typeof x === "string") : [];
  const masteryObjectives = Array.isArray(obj.masteryObjectives) ? obj.masteryObjectives.filter((x): x is string => typeof x === "string") : [];

  const partialCreditPolicy = (obj.partialCreditPolicy === "lenient" || obj.partialCreditPolicy === "custom") ? obj.partialCreditPolicy : "strict";

  const diffObj = (obj.difficultyDistribution && typeof obj.difficultyDistribution === "object") ? (obj.difficultyDistribution as Record<string, unknown>) : {};
  const difficultyDistribution: Record<DifficultyLevel, number> = {
    [DifficultyLevel.FOUNDATION]: Number(diffObj[DifficultyLevel.FOUNDATION]) || 0.1,
    [DifficultyLevel.EASY]: Number(diffObj[DifficultyLevel.EASY]) || 0.2,
    [DifficultyLevel.STANDARD]: Number(diffObj[DifficultyLevel.STANDARD]) || 0.4,
    [DifficultyLevel.CHALLENGING]: Number(diffObj[DifficultyLevel.CHALLENGING]) || 0.2,
    [DifficultyLevel.ADVANCED]: Number(diffObj[DifficultyLevel.ADVANCED]) || 0.1,
  };

  const typeObj = (obj.questionTypeDistribution && typeof obj.questionTypeDistribution === "object") ? (obj.questionTypeDistribution as Record<string, unknown>) : {};
  const questionTypeDistribution: Record<QuestionType, number> = {
    [QuestionType.MULTIPLE_CHOICE_SINGLE]: Number(typeObj[QuestionType.MULTIPLE_CHOICE_SINGLE]) || 0.6,
    [QuestionType.MULTIPLE_CHOICE_MULTIPLE]: Number(typeObj[QuestionType.MULTIPLE_CHOICE_MULTIPLE]) || 0.1,
    [QuestionType.TRUE_FALSE]: Number(typeObj[QuestionType.TRUE_FALSE]) || 0.1,
    [QuestionType.SHORT_ANSWER]: Number(typeObj[QuestionType.SHORT_ANSWER]) || 0.1,
    [QuestionType.NUMERIC]: Number(typeObj[QuestionType.NUMERIC]) || 0.1,
    [QuestionType.ORDERING]: Number(typeObj[QuestionType.ORDERING]) || 0.0,
    [QuestionType.MATCHING]: Number(typeObj[QuestionType.MATCHING]) || 0.0,
  };

  const retryObj = (obj.retryPolicy && typeof obj.retryPolicy === "object") ? (obj.retryPolicy as Record<string, unknown>) : {};
  const retryPolicy = {
    maxRetries: Number(retryObj.maxRetries) || 3,
    cooldownSeconds: Number(retryObj.cooldownSeconds) || 0,
  };

  const randObj = (obj.randomizationRules && typeof obj.randomizationRules === "object") ? (obj.randomizationRules as Record<string, unknown>) : {};
  const randomizationRules = {
    shuffleQuestions: randObj.shuffleQuestions !== false,
    shuffleOptions: randObj.shuffleOptions !== false,
  };

  return {
    id,
    type,
    curriculumId,
    grade,
    subjectId,
    unitId,
    lessonIds,
    conceptIds,
    skillIds,
    totalQuestions,
    targetDurationSeconds,
    difficultyDistribution,
    questionTypeDistribution,
    learningObjectives,
    masteryObjectives,
    passingThresholdPercentage,
    partialCreditPolicy,
    retryPolicy,
    randomizationRules,
  };
}

export function parseAnswerSubmission(value: unknown): AnswerSubmission {
  const obj = parseJsonObject(value, "وەڵامی نێردراو (submission) کەموکوڕی تێدایە.");
  const questionId = requireString(obj.questionId, "submission.questionId");
  const responseTimeMs = requireFiniteNumber(obj.responseTimeMs, "submission.responseTimeMs");

  const selectedOptionIds = Array.isArray(obj.selectedOptionIds)
    ? obj.selectedOptionIds.filter((x): x is string => typeof x === "string")
    : undefined;
  const trueFalseValue = typeof obj.trueFalseValue === "boolean" ? obj.trueFalseValue : undefined;
  const numericValue = optionalFiniteNumber(obj.numericValue);
  const numericUnit = optionalString(obj.numericUnit);
  const shortAnswerText = optionalString(obj.shortAnswerText);
  const orderedIds = Array.isArray(obj.orderedIds)
    ? obj.orderedIds.filter((x): x is string => typeof x === "string")
    : undefined;

  let matchingPairs: Record<string, string> | undefined = undefined;
  if (obj.matchingPairs && typeof obj.matchingPairs === "object" && !Array.isArray(obj.matchingPairs)) {
    matchingPairs = {};
    for (const [k, v] of Object.entries(obj.matchingPairs)) {
      if (typeof v === "string") matchingPairs[k] = v;
    }
  }

  const hintUsed = optionalBoolean(obj.hintUsed);

  return {
    questionId,
    selectedOptionIds,
    trueFalseValue,
    numericValue,
    numericUnit,
    shortAnswerText,
    orderedIds,
    matchingPairs,
    responseTimeMs,
    hintUsed,
  };
}

async function getWorkerAuthenticatedStudentId(req: Request, env: Env): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }
  const token = authHeader.substring(7).trim();
  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  try {
    const claims = await AuthService.verifyFirebaseIdToken(token, env.FIREBASE_PROJECT_ID);
    return claims.uid;
  } catch {
    throw new Error("UNAUTHORIZED");
  }
}

export default {
  async fetch(request: Request, env: Env, ctx?: unknown): Promise<Response> {
    try {
      // 1. Fail-fast if edge environment is misconfigured in production
      const url = new URL(request.url);
      const isHealth = url.pathname === "/api/health";
      const envObj = env as unknown as Record<string, unknown>;
      const isProd = envObj.ZANA_ENV === "production" || (!envObj.ZANA_ENV && process.env.NODE_ENV === "production");

      if (!isHealth && isProd) {
        validateProductionEnv(env);
      }

      // 2. Route the request and apply edge security headers
      const rawResponse = await this.handleRequest(request, env, ctx);
      return applySecurityHeaders(rawResponse);
    } catch (error: unknown) {
      console.error("[Worker Fatal Error]", error);
      const errResponse = new Response(
        JSON.stringify({
          error: "Service Unavailable",
          message: "The system is temporarily unable to handle requests.",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
      return applySecurityHeaders(errResponse);
    }
  },

  async handleRequest(request: Request, env: Env, _ctx?: unknown): Promise<Response> {
    const url = new URL(request.url);
    let pathname = url.pathname.replace(/\/+/g, "/");

    if (pathname.startsWith("/api/") && pathname.endsWith("/") && pathname.length > 5) {
      pathname = pathname.slice(0, -1);
    }

    const origin = request.headers.get("Origin");

    // Liveness endpoint
    if (pathname === "/api/health") {
      if (request.method === "GET") {
        const responseHeaders = getCorsHeaders(origin, env);
        responseHeaders.set("Content-Type", "application/json");

        return new Response(
          JSON.stringify({
            ok: true,
            status: "ok",
            service: "zana-api-worker",
            revision: env.ZANA_REVISION || "unknown",
          }),
          { status: 200, headers: responseHeaders }
        );
      }
    }

    // Production Provider Preflight endpoint (moved to proper location)


    // OPTIONS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin, env),
      });
    }

    const responseHeaders = getCorsHeaders(origin, env);
    responseHeaders.set("Content-Type", "application/json");

    // Origin Enforcement for API
    if (pathname.startsWith("/api/")) {
      if (!isOriginAllowed(origin, env)) {
        return new Response(JSON.stringify({ error: "Disallowed Origin" }), { status: 403, headers: responseHeaders });
      }
    }

    // Static assets & SPA fallback
    if (!pathname.startsWith("/api/")) {
      if (env.ASSETS) {
        try {
          const assetResponse = await env.ASSETS.fetch(request.clone());
          if (assetResponse.status === 404) {
            const lastSegment = pathname.substring(pathname.lastIndexOf("/") + 1);
            const hasExtension = lastSegment.includes(".") && !lastSegment.endsWith(".");
            if (hasExtension) {
              return new Response(JSON.stringify({ error: "فایلەکە نەدۆزرایەوە." }), { status: 404, headers: responseHeaders });
            }
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

    // Rate limiting
    const limit = pathname === "/api/study/vision" ? 10 : 60;
    const windowMs = 60 * 1000; // 1 minute
    if (pathname.startsWith("/api/")) {
      if (isRateLimited(`${clientIp}:${pathname}`, limit, windowMs)) {
        responseHeaders.set("Retry-After", "60");
        return new Response(
          JSON.stringify({
            error: "داواکارییەکان زۆر بوون؛ تکایە چەند خولەکێک چاوەڕێ بکە و دووبارە هەوڵ بدەرەوە.",
          }),
          { status: 429, headers: responseHeaders }
        );
      }
    }

    try {
      // Production Provider Preflight endpoint
      if (pathname === "/api/provider/preflight") {
        if (request.method !== "GET") {
          return new Response("Method Not Allowed", { status: 405, headers: responseHeaders });
        }

        const authHeader = request.headers.get("Authorization");
        if (!env.PROVIDER_PREFLIGHT_TOKEN || !authHeader || !authHeader.startsWith("Bearer ")) {
          return new Response(JSON.stringify({ ok: false, status: "error", error: "Unauthorized" }), { status: 401, headers: responseHeaders });
        }

        const providedToken = authHeader.substring(7);
        const isValid = await timingSafeEqual(providedToken, env.PROVIDER_PREFLIGHT_TOKEN);
        if (!isValid) {
          return new Response(JSON.stringify({ ok: false, status: "error", error: "Unauthorized" }), { status: 401, headers: responseHeaders });
        }

        if (!env.GEMINI_API_KEY || !env.GEMINI_API_KEY.trim()) {
          return new Response(
            JSON.stringify({ ok: false, status: "error", error: "GEMINI_API_KEY missing" }),
            { status: 503, headers: responseHeaders }
          );
        }

        try {
          const model = resolvePrimaryModel(env);
          const result = await ProviderAdapter.generate({
            apiKey: env.GEMINI_API_KEY,
            model,
            contents: "ping",
            pathname: "/api/provider/preflight",
          });

          if (!result.text) {
            throw new Error("Empty response text from provider preflight");
          }

          return new Response(
            JSON.stringify({
              ok: true,
              status: "healthy"
            }),
            { status: 200, headers: responseHeaders }
          );
        } catch (error: unknown) {
          const e = error as Record<string, unknown>;
          return new Response(
            JSON.stringify({
              ok: false,
              status: "error",
              error: "Provider preflight check failed",
              diagnostic: {
                upstreamStatus: e.status || undefined,
                googleErrorCode: e.code || undefined,
                sdkErrorName: e.name || undefined,
                model: resolvePrimaryModel(env),
                apiService: "zana-api-worker"
              }
            }),
            { status: 503, headers: responseHeaders }
          );
        }
      }

      // POST /api/chat
      if (pathname === "/api/chat" && request.method === "POST") {
        let chatReq: ChatRequest;
        try {
          const body = await request.json().catch(() => ({}));
          chatReq = parseChatRequest(body);
        } catch (err: unknown) {
          return new Response(JSON.stringify({ error: (err as { message?: string })?.message || "داواکارییەکە کەموکوڕی تێدایە." }), {
            status: 400,
            headers: responseHeaders,
          });
        }

        const authHeader = request.headers.get("Authorization");
        const studentId = (authHeader && authHeader.startsWith("Bearer "))
          ? authHeader.split("Bearer ")[1].slice(0, 32)
          : (request.headers.get("CF-Connecting-IP") || "anonymous");

        try {
          await enforceAiRateLimit(env, studentId);
        } catch (rlError: unknown) {
          if ((rlError as Error)?.message === "RATE_LIMIT_EXCEEDED") {
            return new Response(
              JSON.stringify({
                error: "گەیشتیتە سنوری دیاریکراوی بەکارهێنان بۆ ئەم کاتژمێرە. تکایە دواتر هەوڵبدەرەوە.",
              }),
              {
                status: 429,
                headers: {
                  ...responseHeaders,
                  "Retry-After": "3600",
                },
              }
            );
          }
          throw rlError;
        }

        const chatResult = await ProviderAdapter.chat(env.GEMINI_API_KEY, chatReq, env);

        return new Response(
          JSON.stringify({
            text: chatResult.text,
            isEducational: chatResult.isEducational,
          }),
          { status: 200, headers: responseHeaders }
        );
      }

      // POST /api/assessment
      if (pathname === "/api/assessment" && request.method === "POST") {
        let assessReq: AssessmentRequest;
        try {
          const body = await request.json().catch(() => ({}));
          assessReq = parseAssessmentRequest(body);
        } catch (err: unknown) {
          return new Response(JSON.stringify({ error: (err as { message?: string })?.message || "زانیارییەکانی تاقیکردنەوە نەنێردراون." }), {
            status: 400,
            headers: responseHeaders,
          });
        }

        const assessmentResult = await ProviderAdapter.assessment(env.GEMINI_API_KEY, assessReq, env);

        const currentQuestionNum = assessReq.state.currentQuestion;
        const isLast = currentQuestionNum === 5;
        let finalLevel: string | null = null;
        if (isLast) {
          const correctCount = (assessReq.state.answers || []).filter(Boolean).length + (assessmentResult.isCorrect ? 1 : 0);
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

      // POST /api/report
      if (pathname === "/api/report" && request.method === "POST") {
        let reportReq: ReportRequest;
        try {
          const body = await request.json().catch(() => ({}));
          reportReq = parseReportRequest(body);
        } catch (err: unknown) {
          return new Response(JSON.stringify({ error: (err as { message?: string })?.message || "زانیارییەکان تەواو نین بۆ دروستکردنی ڕاپۆرت." }), {
            status: 400,
            headers: responseHeaders,
          });
        }

        const reportResult = await ProviderAdapter.report(env.GEMINI_API_KEY, reportReq, env);

        return new Response(
          JSON.stringify({
            recommendation: reportResult.recommendation,
          }),
          { status: 200, headers: responseHeaders }
        );
      }

      // POST /api/study/ask
      if (pathname === "/api/study/ask" && request.method === "POST") {
        let askReq: AskRequest;
        try {
          const body = await request.json().catch(() => ({}));
          askReq = parseAskRequest(body);
        } catch (err: unknown) {
          return new Response(JSON.stringify({ error: (err as { message?: string })?.message || "داواکارییەکە کەموکوڕی تێدایە." }), {
            status: 400,
            headers: responseHeaders,
          });
        }

        const askResult = await ProviderAdapter.ask(env.GEMINI_API_KEY, askReq, env);

        return new Response(
          JSON.stringify({
            text: askResult.text,
            isEducational: askResult.isEducational,
          }),
          { status: 200, headers: responseHeaders }
        );
      }

      // POST /api/study/vision
      if (pathname === "/api/study/vision" && request.method === "POST") {
        const formData = await request.formData();
        const file = formData.get("image") as File | null;

        if (!file) {
          return new Response(JSON.stringify({ error: getClientSafeErrorMessage("validation") }), {
            status: 400,
            headers: responseHeaders,
          });
        }

        if (file.size > 5 * 1024 * 1024) {
          return new Response(JSON.stringify({ error: getClientSafeErrorMessage("upload_too_large") }), {
            status: 413,
            headers: responseHeaders,
          });
        }

        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const isValidSignature = validateImageSignature(uint8Array, file.type);
        if (!isValidSignature) {
          return new Response(JSON.stringify({ error: getClientSafeErrorMessage("unsupported_file") }), {
            status: 415,
            headers: responseHeaders,
          });
        }

        const contextStr = formData.get("context") as string | null;
        const editedTextRaw = formData.get("editedText") as string | null;
        const modeRaw = (formData.get("mode") as string | null) || "explain";

        let contextParsed: unknown = {};
        if (contextStr) {
          try {
            contextParsed = JSON.parse(contextStr);
          } catch {
            return new Response(JSON.stringify({ error: getClientSafeErrorMessage("validation") }), {
              status: 400,
              headers: responseHeaders,
            });
          }
        }

        let visionReq: VisionRequest;
        try {
          visionReq = parseVisionRequest({
            imageBytes: uint8Array,
            mimeType: file.type,
            context: contextParsed,
            mode: modeRaw,
            editedText: editedTextRaw,
          });
        } catch (err: unknown) {
          return new Response(JSON.stringify({ error: (err as { message?: string })?.message || getClientSafeErrorMessage("validation") }), {
            status: 400,
            headers: responseHeaders,
          });
        }

        const visionResult = await ProviderAdapter.vision(env.GEMINI_API_KEY, visionReq, env);

        return new Response(JSON.stringify(visionResult), { status: 200, headers: responseHeaders });
      }

      // GET /api/learning/mastery
      if (pathname === "/api/learning/mastery" && request.method === "GET") {
        let studentId: string;
        try {
          studentId = await getWorkerAuthenticatedStudentId(request, env);
        } catch {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        const reqStudentId = url.searchParams.get("studentId");
        if (reqStudentId && reqStudentId !== studentId) {
          return new Response(JSON.stringify({ error: "دەسەڵاتی پێویستت نییە بۆ دەستگەیشتن بەم بەشە." }), { status: 403, headers: responseHeaders });
        }

        const lp = new PersistentLearningRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        const profile = await lp.getStudentMasteryProfile(studentId);
        return new Response(JSON.stringify(profile), { status: 200, headers: responseHeaders });
      }

      // GET /api/learning/mastery/:conceptId
      if (pathname.startsWith("/api/learning/mastery/") && request.method === "GET") {
        let studentId: string;
        try {
          studentId = await getWorkerAuthenticatedStudentId(request, env);
        } catch {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        const reqStudentId = url.searchParams.get("studentId");
        if (reqStudentId && reqStudentId !== studentId) {
          return new Response(JSON.stringify({ error: "دەسەڵاتی پێویستت نییە بۆ دەستگەیشتن بەم بەشە." }), { status: 403, headers: responseHeaders });
        }

        const parts = pathname.split("/");
        const conceptId = decodeURIComponent(parts[parts.length - 1]);

        const lp = new PersistentLearningRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        const state = await lp.getConceptMastery(studentId, conceptId);
        if (!state) {
          return new Response(JSON.stringify({ error: "چەمکی داواکراو بۆ ئەم قوتابییە بوونی نییە." }), { status: 404, headers: responseHeaders });
        }
        return new Response(JSON.stringify(state), { status: 200, headers: responseHeaders });
      }

      // GET /api/learning/recommendations
      if (pathname === "/api/learning/recommendations" && request.method === "GET") {
        let studentId: string;
        try {
          studentId = await getWorkerAuthenticatedStudentId(request, env);
        } catch {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        const reqStudentId = url.searchParams.get("studentId");
        if (reqStudentId && reqStudentId !== studentId) {
          return new Response(JSON.stringify({ error: "دەسەڵاتی پێویستت نییە بۆ دەستگەیشتن بەم بەشە." }), { status: 403, headers: responseHeaders });
        }

        const status = url.searchParams.get("status") || undefined;
        const lp = new PersistentLearningRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        const recs = await lp.listRecommendations(studentId, status);
        return new Response(JSON.stringify(recs), { status: 200, headers: responseHeaders });
      }

      // POST /api/learning/events
      if (pathname === "/api/learning/events" && request.method === "POST") {
        let studentId: string;
        try {
          studentId = await getWorkerAuthenticatedStudentId(request, env);
        } catch {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        let bodyObj: Record<string, unknown>;
        let type: LearningEventType;
        try {
          const raw = (await request.json().catch(() => ({}))) as unknown;
          bodyObj = parseJsonObject(raw);
          type = parseLearningEventType(bodyObj.type);
        } catch (err: unknown) {
          return new Response(
            JSON.stringify({ error: (err as Error)?.message || "زانیاری پێویست بۆ ناردنی ڕووداو بوونی نییە." }),
            { status: 400, headers: responseHeaders }
          );
        }

        const data = (bodyObj.data && typeof bodyObj.data === "object" && !Array.isArray(bodyObj.data))
          ? (bodyObj.data as Record<string, unknown>)
          : {};

        const event: LearningEvent = {
          id: "evt_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now(),
          studentId,
          timestamp: new Date().toISOString(),
          type,
          data,
        };

        const lp = new PersistentLearningRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        await lp.appendLearningEvent(studentId, event);
        const profile = await lp.getStudentMasteryProfile(studentId);
        return new Response(JSON.stringify({ success: true, eventId: event.id, profile }), { status: 200, headers: responseHeaders });
      }

      // POST /api/learning/attempts
      if (pathname === "/api/learning/attempts" && request.method === "POST") {
        let studentId: string;
        try {
          studentId = await getWorkerAuthenticatedStudentId(request, env);
        } catch {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        let conceptId: string;
        let isCorrect: boolean;
        let responseTimeMs: number;
        let difficulty: DifficultyLevel;
        let questionText: string;
        let studentResponse: string;
        let misconceptionDetected: string | undefined;
        let hintUsed: boolean;
        let unreliableTiming: boolean;

        try {
          const raw = (await request.json().catch(() => ({}))) as unknown;
          const bodyObj = parseJsonObject(raw);

          conceptId = requireString(bodyObj.conceptId, "conceptId", "زانیاری ناتەواو بۆ هەوڵدان لەسەر بابەت.");
          isCorrect = requireBoolean(bodyObj.isCorrect, "isCorrect", "زانیاری ناتەواو بۆ هەوڵدان لەسەر بابەت.");
          responseTimeMs = optionalFiniteNumber(bodyObj.responseTimeMs) ?? 5000;
          if (responseTimeMs < 0) {
            throw new Error("کاتی وەڵامدانەوە ناڕاستە.");
          }
          difficulty = parseDifficultyLevel(bodyObj.difficulty);
          questionText = optionalString(bodyObj.questionText) || "";
          studentResponse = optionalString(bodyObj.studentResponse) || "";
          misconceptionDetected = optionalString(bodyObj.misconceptionDetected);
          hintUsed = optionalBoolean(bodyObj.hintUsed) ?? false;
          unreliableTiming = optionalBoolean(bodyObj.unreliableTiming) ?? false;
        } catch (err: unknown) {
          return new Response(
            JSON.stringify({ error: (err as Error)?.message || "زانیاری ناتەواو بۆ هەوڵدان لەسەر بابەت." }),
            { status: 400, headers: responseHeaders }
          );
        }

        const lp = new PersistentLearningRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        const currentProfile = await lp.getStudentMasteryProfile(studentId);
        const currentState = await lp.getConceptMastery(studentId, conceptId);

        const newState = AdaptiveLearningEngine.calculateNewMastery(currentState, {
          isCorrect,
          responseTimeMs,
          difficulty,
          hintUsed,
          unreliableTiming,
        });

        await lp.saveMasteryChange(studentId, conceptId, newState);

        const attempt: ExerciseAttempt = {
          id: "att_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now(),
          studentId,
          conceptId,
          isCorrect,
          responseTimeMs,
          difficulty,
          questionText,
          studentResponse,
          misconceptionDetected,
          timestamp: new Date().toISOString(),
        };

        const detectedMisc = AdaptiveLearningEngine.detectMisconception(attempt, currentProfile.activeMisconceptions);
        if (detectedMisc) {
          const index = currentProfile.activeMisconceptions.findIndex(
            (m) => m.misconceptionId === detectedMisc.misconceptionId && m.resolvedAt === null
          );
          if (index >= 0) {
            currentProfile.activeMisconceptions[index] = detectedMisc;
          } else {
            currentProfile.activeMisconceptions.push(detectedMisc);
          }
        } else if (isCorrect) {
          currentProfile.activeMisconceptions = currentProfile.activeMisconceptions.map((m) => {
            if (m.conceptId === conceptId && m.resolvedAt === null) {
              if (m.status === MisconceptionStatus.SUSPECTED || m.status === MisconceptionStatus.CONFIRMED) {
                return {
                  ...m,
                  status: MisconceptionStatus.IMPROVING,
                  confidence: "medium" as const,
                  lastDetectedAt: new Date().toISOString(),
                };
              } else if (m.status === MisconceptionStatus.IMPROVING) {
                return {
                  ...m,
                  status: MisconceptionStatus.RESOLVED,
                  confidence: "high" as const,
                  resolvedAt: new Date().toISOString(),
                };
              }
            }
            return m;
          });
        }

        await lp.saveMasteryChange(studentId, conceptId, newState);

        const event: LearningEvent = {
          id: "evt_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now(),
          studentId,
          timestamp: new Date().toISOString(),
          type: "EXERCISE_ATTEMPT",
          data: { ...attempt },
        };
        await lp.appendLearningEvent(studentId, event);

        let conceptTitleKu = conceptId;
        const registry = CurriculumRegistry.getInstance();
        const lesson = registry.getAllLessons().find((l) => l.concepts.includes(conceptId));
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

        return new Response(
          JSON.stringify({
            success: true,
            masteryState: newState,
            misconceptionDetected: detectedMisc,
            recommendation,
          }),
          { status: 200, headers: responseHeaders }
        );
      }

      // POST /api/learning/sessions/start
      if (pathname === "/api/learning/sessions/start" && request.method === "POST") {
        let studentId: string;
        try {
          studentId = await getWorkerAuthenticatedStudentId(request, env);
        } catch {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        const session: LearningSession = {
          id: "ses_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now(),
          studentId,
          startTime: new Date().toISOString(),
          endTime: null,
          events: [],
          focusScore: 1.0,
        };

        const lp = new PersistentLearningRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        await lp.createLearningSession(session);
        return new Response(JSON.stringify(session), { status: 200, headers: responseHeaders });
      }

      // POST /api/learning/sessions/:sessionId/end
      if (pathname.startsWith("/api/learning/sessions/") && pathname.endsWith("/end") && request.method === "POST") {
        let studentId: string;
        try {
          studentId = await getWorkerAuthenticatedStudentId(request, env);
        } catch {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        const parts = pathname.split("/");
        const sessionId = decodeURIComponent(parts[parts.length - 2]);

        let focusScore = 1.0;
        try {
          const raw = (await request.json().catch(() => ({}))) as unknown;
          const bodyObj = parseJsonObject(raw);
          if ("focusScore" in bodyObj && bodyObj.focusScore !== undefined) {
            if (typeof bodyObj.focusScore !== "number" || !Number.isFinite(bodyObj.focusScore)) {
              return new Response(JSON.stringify({ error: "نمرەی سەرنجدان (focusScore) ناڕاستە." }), { status: 400, headers: responseHeaders });
            }
            focusScore = bodyObj.focusScore;
          }
        } catch {
          return new Response(JSON.stringify({ error: "داواکارییەکە کەموکوڕی تێدایە." }), { status: 400, headers: responseHeaders });
        }

        const session: LearningSession = {
          id: sessionId,
          studentId,
          startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          endTime: new Date().toISOString(),
          events: [],
          focusScore,
        };

        const lp = new PersistentLearningRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        await lp.updateLearningSession(session);
        return new Response(JSON.stringify(session), { status: 200, headers: responseHeaders });
      }

      // POST /api/assessment/start
      if (pathname === "/api/assessment/start" && request.method === "POST") {
        let studentId: string;
        try {
          studentId = await getWorkerAuthenticatedStudentId(request, env);
        } catch {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        let unitId: string;
        let subjectId: string;
        let typeStr: string | undefined;
        let titleKu: string;
        let instructionsKu: string;

        try {
          const raw = (await request.json().catch(() => ({}))) as unknown;
          const bodyObj = parseJsonObject(raw);
          unitId = requireString(bodyObj.unitId, "unitId", "زانیاری پێویست بۆ دەستپێکردنی تاقیکردنەوە بوونی نییە.");
          subjectId = requireString(bodyObj.subjectId, "subjectId", "زانیاری پێویست بۆ دەستپێکردنی تاقیکردنەوە بوونی نییە.");
          typeStr = optionalString(bodyObj.type);
          titleKu = optionalString(bodyObj.titleKu) || "تاقیکردنەوەی نوێ";
          instructionsKu = optionalString(bodyObj.instructionsKu) || "تکایە بە وریاییەوە پرسیارەکان بخوێنەرەوە.";
        } catch (err: unknown) {
          return new Response(
            JSON.stringify({ error: (err as Error)?.message || "زانیاری پێویست بۆ دەستپێکردنی تاقیکردنەوە بوونی نییە." }),
            { status: 400, headers: responseHeaders }
          );
        }

        const lp = new PersistentLearningRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        const ap = new PersistentAssessmentRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        const service = new AssessmentService(ap);

        const profile = await lp.getStudentMasteryProfile(studentId);

        const lessons = CurriculumRegistry.getInstance().getAllLessons().filter((l) => l.unitId === unitId);
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

        const blueprint: AssessmentBlueprint = {
          id: `bp_${unitId}_${typeStr || "mastery_check"}_${Date.now()}`,
          type: typeStr === "MASTERY_CHECK" ? AssessmentType.MASTERY_CHECK : AssessmentType.DIAGNOSTIC,
          curriculumId: "curriculum-zana-default",
          grade: "9",
          subjectId,
          unitId,
          conceptIds,
          totalQuestions: typeStr === "MASTERY_CHECK" ? 10 : 5,
          targetDurationSeconds: typeStr === "MASTERY_CHECK" ? 600 : 300,
          difficultyDistribution: {
            [DifficultyLevel.FOUNDATION]: 0.1,
            [DifficultyLevel.EASY]: 0.2,
            [DifficultyLevel.STANDARD]: 0.4,
            [DifficultyLevel.CHALLENGING]: 0.2,
            [DifficultyLevel.ADVANCED]: 0.1,
          },
          questionTypeDistribution: {
            [QuestionType.MULTIPLE_CHOICE_SINGLE]: 0.6,
            [QuestionType.MULTIPLE_CHOICE_MULTIPLE]: 0.1,
            [QuestionType.TRUE_FALSE]: 0.1,
            [QuestionType.SHORT_ANSWER]: 0.1,
            [QuestionType.NUMERIC]: 0.1,
            [QuestionType.ORDERING]: 0.0,
            [QuestionType.MATCHING]: 0.0,
          },
          learningObjectives: [],
          masteryObjectives: [],
          passingThresholdPercentage: 70,
          partialCreditPolicy: "strict",
          retryPolicy: { maxRetries: 3, cooldownSeconds: 0 },
          randomizationRules: { shuffleQuestions: true, shuffleOptions: true },
        };

        const { attempt, firstQuestion } = await service.startAssessment(
          studentId,
          blueprint,
          titleKu,
          instructionsKu,
          avgMastery
        );

        return new Response(JSON.stringify({ attempt, firstQuestion, blueprint }), { status: 200, headers: responseHeaders });
      }

      // POST /api/assessment/submit
      if (pathname === "/api/assessment/submit" && request.method === "POST") {
        let studentId: string;
        try {
          studentId = await getWorkerAuthenticatedStudentId(request, env);
        } catch {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        let attemptId: string;
        let questionId: string;
        let submission: AnswerSubmission;
        let blueprint: AssessmentBlueprint;

        try {
          const raw = (await request.json().catch(() => ({}))) as unknown;
          const bodyObj = parseJsonObject(raw);
          attemptId = requireString(bodyObj.attemptId, "attemptId");
          questionId = requireString(bodyObj.questionId, "questionId");
          submission = parseAnswerSubmission(bodyObj.submission);
          blueprint = parseAssessmentBlueprint(bodyObj.blueprint);
        } catch (err: unknown) {
          return new Response(
            JSON.stringify({ error: (err as Error)?.message || "ناردنی داواکارییەکە کەموکوڕی تێدایە." }),
            { status: 400, headers: responseHeaders }
          );
        }

        const lp = new PersistentLearningRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        const ap = new PersistentAssessmentRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");

        const existingAttempt = await ap.getAttempt(attemptId);
        if (!existingAttempt) {
          return new Response(JSON.stringify({ error: "هەوڵدانی تاقیکردنەوە نەدۆزرایەوە." }), { status: 404, headers: responseHeaders });
        }
        if (existingAttempt.studentId !== studentId) {
          return new Response(JSON.stringify({ error: "دەسەڵاتی پێویستت نییە بۆ ئەم تاقیکردنەوەیە." }), { status: 403, headers: responseHeaders });
        }

        const service = new AssessmentService(ap);
        const result = await service.submitAnswer(attemptId, questionId, submission, lp, blueprint);

        return new Response(JSON.stringify(result), { status: 200, headers: responseHeaders });
      }

      // POST /api/assessment/finish
      if (pathname === "/api/assessment/finish" && request.method === "POST") {
        let studentId: string;
        try {
          studentId = await getWorkerAuthenticatedStudentId(request, env);
        } catch {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        let attemptId: string;
        let blueprint: AssessmentBlueprint;

        try {
          const raw = (await request.json().catch(() => ({}))) as unknown;
          const bodyObj = parseJsonObject(raw);
          attemptId = requireString(bodyObj.attemptId, "attemptId");
          blueprint = parseAssessmentBlueprint(bodyObj.blueprint);
        } catch (err: unknown) {
          return new Response(
            JSON.stringify({ error: (err as Error)?.message || "ناردنی داواکارییەکە کەموکوڕی تێدایە." }),
            { status: 400, headers: responseHeaders }
          );
        }

        const lp = new PersistentLearningRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");
        const ap = new PersistentAssessmentRecordProvider(env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV, "production");

        const existingAttempt = await ap.getAttempt(attemptId);
        if (!existingAttempt) {
          return new Response(JSON.stringify({ error: "هەوڵدانی تاقیکردنەوە نەدۆزرایەوە." }), { status: 404, headers: responseHeaders });
        }
        if (existingAttempt.studentId !== studentId) {
          return new Response(JSON.stringify({ error: "دەسەڵاتی پێویستت نییە بۆ ئەم تاقیکردنەوەیە." }), { status: 403, headers: responseHeaders });
        }

        const service = new AssessmentService(ap);
        const result = await service.finishAssessment(attemptId, lp, blueprint);

        return new Response(JSON.stringify({ result }), { status: 200, headers: responseHeaders });
      }

      // GET /api/assessment/attempts/:attemptId
      if (pathname.startsWith("/api/assessment/attempts/") && request.method === "GET") {
        let studentId: string;
        try {
          studentId = await getWorkerAuthenticatedStudentId(request, env);
        } catch {
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
          return new Response(JSON.stringify({ error: "دەسەڵاتی پێویستت نییە بۆ دەستگەیشتن بەم بەشە." }), { status: 403, headers: responseHeaders });
        }

        const result = await ap.getResult(attemptId);

        return new Response(JSON.stringify({ attempt, result }), { status: 200, headers: responseHeaders });
      }

      // Planning routes
      if (pathname.startsWith("/api/planning")) {
        let studentId: string;
        try {
          studentId = await getWorkerAuthenticatedStudentId(request, env);
        } catch {
          return new Response(JSON.stringify({ error: "تکایە سەرەتا بچۆ ناو هەژمارەکەت." }), { status: 401, headers: responseHeaders });
        }

        try {
          const kv = env.LEARNING_RECORDS_KV || env.ZANA_LEARNING_KV;
          const planProvider = new PersistentLearningPlanProvider(kv, "production");
          const learningProvider = new PersistentLearningRecordProvider(kv, "production");
          const planningService = new LearningPlanService(planProvider, learningProvider);

          if (pathname === "/api/planning/preferences" && request.method === "GET") {
            const preferences = await planningService.getPreferences(studentId);
            return new Response(JSON.stringify(preferences), { status: 200, headers: responseHeaders });
          }

          if (pathname === "/api/planning/preferences" && request.method === "POST") {
            const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
            const preferences = await planningService.savePreferences(studentId, body as Record<string, unknown>);
            return new Response(JSON.stringify(preferences), { status: 200, headers: responseHeaders });
          }

          if (pathname === "/api/planning/goals" && request.method === "GET") {
            const goal = await planningService.getActiveGoal(studentId);
            return new Response(JSON.stringify({ goals: [goal], activeGoal: goal }), { status: 200, headers: responseHeaders });
          }

          if (pathname === "/api/planning/goals" && request.method === "POST") {
            const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
            const validated = PlanningValidation.validateGoal(studentId, body as Record<string, unknown>);
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
              status: "ACTIVE" as const,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await planProvider.saveGoal(fullGoal as never);
            return new Response(JSON.stringify(fullGoal), { status: 200, headers: responseHeaders });
          }

          if (pathname === "/api/planning/generate" && request.method === "POST") {
            const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
            const plan = await planningService.generatePlanForStudent(studentId, {
              mode: (body.mode as PlanGenerationMode) || "MANUAL_REPLAN",
              startDateIso: body.startDateIso as string | undefined,
            });
            return new Response(JSON.stringify(plan), { status: 200, headers: responseHeaders });
          }

          if (pathname === "/api/planning/current" && request.method === "GET") {
            const plan = await planningService.getCurrentPlan(studentId);
            return new Response(JSON.stringify(plan), { status: 200, headers: responseHeaders });
          }

          if (pathname === "/api/planning/today" && request.method === "GET") {
            const dateParam = url.searchParams.get("date") || undefined;
            const todayPlan = await planningService.getTodayPlan(studentId, dateParam);
            return new Response(JSON.stringify(todayPlan), { status: 200, headers: responseHeaders });
          }

          if (pathname === "/api/planning/week" && request.method === "GET") {
            const weekPlan = await planningService.getWeekPlan(studentId);
            return new Response(JSON.stringify(weekPlan), { status: 200, headers: responseHeaders });
          }

          if (pathname.includes("/tasks/") && pathname.endsWith("/start") && request.method === "POST") {
            const parts = pathname.split("/");
            const taskId = parts[parts.indexOf("tasks") + 1];
            const res = await planningService.updateTaskStatus(studentId, taskId, StudyTaskStatus.IN_PROGRESS);
            return new Response(JSON.stringify(res), { status: 200, headers: responseHeaders });
          }

          if (pathname.includes("/tasks/") && pathname.endsWith("/complete") && request.method === "POST") {
            const parts = pathname.split("/");
            const taskId = parts[parts.indexOf("tasks") + 1];
            const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
            const res = await planningService.updateTaskStatus(studentId, taskId, StudyTaskStatus.COMPLETED, body.actualDurationMinutes as number | undefined);
            return new Response(JSON.stringify(res), { status: 200, headers: responseHeaders });
          }

          if (pathname.includes("/tasks/") && pathname.endsWith("/skip") && request.method === "POST") {
            const parts = pathname.split("/");
            const taskId = parts[parts.indexOf("tasks") + 1];
            const res = await planningService.updateTaskStatus(studentId, taskId, StudyTaskStatus.SKIPPED);
            return new Response(JSON.stringify(res), { status: 200, headers: responseHeaders });
          }

          if (pathname === "/api/planning/rebalance" && request.method === "POST") {
            const plan = await planningService.getCurrentPlan(studentId);
            const prefs = await planningService.getPreferences(studentId);
            const { updatedPlan, adjustment } = PlanRebalancer.rebalancePlan(plan, prefs, {});
            await planProvider.savePlan(updatedPlan);
            await planProvider.saveAdjustment(adjustment);
            return new Response(JSON.stringify({ plan: updatedPlan, adjustment }), { status: 200, headers: responseHeaders });
          }

          if (pathname === "/api/planning/next-action" && request.method === "GET") {
            const nextAction = await planningService.getNextBestAction(studentId);
            return new Response(JSON.stringify(nextAction), { status: 200, headers: responseHeaders });
          }

          if (pathname === "/api/planning/progress" && request.method === "GET") {
            const progress = await planningService.getProgress(studentId);
            return new Response(JSON.stringify(progress), { status: 200, headers: responseHeaders });
          }
        } catch (planError: unknown) {
          const errMsg = (planError as Error)?.message || String(planError);
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

      // GET /api/health/deep
      if (pathname === "/api/health/deep" && request.method === "GET") {
        return handleHealthRoute(request, env as never);
      }

      // GET /api/study/plan
      if (pathname === "/api/study/plan" && request.method === "GET") {
        return handleStudyPlanRoute(request, env as never);
      }

      // GET /api/student/profile
      if (pathname === "/api/student/profile" && request.method === "GET") {
        return handleStudentProfileRoute(request, env as never);
      }

      // POST /api/feedback
      if (pathname === "/api/feedback" && request.method === "POST") {
        return handleFeedbackRoute(request, env as never);
      }

      // GET /api/internal/telemetry
      if (pathname === "/api/internal/telemetry" && request.method === "GET") {
        return handleTelemetryExportRoute(request, env as never);
      }

      // Fallback 404
      return new Response(JSON.stringify({ error: "نۆت فۆند - ڕێڕەوی داواکراو بوونی نییە." }), { status: 404, headers: responseHeaders });
    } catch (err: unknown) {
      const category = classifyError(err);
      const correlationId = crypto.randomUUID();
      const missingBinding = !env.GEMINI_API_KEY ? "GEMINI_API_KEY" : undefined;
      let upstreamStatus: number | undefined = undefined;
      let errorCode: string | undefined = undefined;
      if (err && typeof err === "object") {
        const errObj = err as Record<string, unknown>;
        if (typeof errObj.status === "number") upstreamStatus = errObj.status;
        else if (typeof errObj.code === "number") upstreamStatus = errObj.code;
        if (typeof errObj.name === "string") errorCode = errObj.name;
      }
      console.error("[AI Worker Diagnostic]", {
        correlationId,
        pathname,
        category,
        upstreamStatus,
        errorCode,
        missingBinding,
        hasApiKey: Boolean(env.GEMINI_API_KEY),
        hasModelOverride: Boolean(env.GEMINI_PRIMARY_MODEL || env.GEMINI_VISION_MODEL),
        errorName: err instanceof Error ? err.name : "UnknownError",
      });
      return new Response(JSON.stringify({ error: getClientSafeErrorMessage(category) }), { status: 500, headers: responseHeaders });
    }
  },
};
