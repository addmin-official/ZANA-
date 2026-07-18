import { GoogleGenAI, Type } from "@google/genai";
import { buildSystemPrompt } from "../ai/buildSystemPrompt.ts";

export interface Env {
  GEMINI_API_KEY: string;
  ALLOWED_ORIGINS: string; // Comma-separated list of allowed origins
  GEMINI_PRIMARY_MODEL?: string;
  GEMINI_VISION_MODEL?: string;
}

export type SafeErrorCategory =
  | "validation"
  | "timeout"
  | "upload_too_large"
  | "unsupported_file"
  | "provider_unavailable"
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

  if (lowerMsg.includes("unsupported") || lowerMsg.includes("mime") || lowerMsg.includes("signature") || lowerMsg.includes("magic byte")) {
    return "unsupported_file";
  }

  if (lowerMsg.includes("timeout") || lowerMsg.includes("etimedout")) {
    return "timeout";
  }

  if (
    lowerMsg.includes("api_key") ||
    lowerMsg.includes("api key") ||
    lowerMsg.includes("googlegenai") ||
    lowerMsg.includes("quota") ||
    lowerMsg.includes("provider") ||
    lowerMsg.includes("model") ||
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
    case "provider_unavailable":
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
  return env.GEMINI_PRIMARY_MODEL || "gemini-2.5-flash";
}

function getVisionModel(env: Env): string {
  return env.GEMINI_VISION_MODEL || "gemini-2.5-flash";
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
  } else if (!origin) {
    // Safe placeholder fallback
    headers.set("Access-Control-Allow-Origin", "*");
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
    const origin = request.headers.get("Origin");

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin, env),
      });
    }

    const responseHeaders = getCorsHeaders(origin, env);
    responseHeaders.set("Content-Type", "application/json");

    // Origin Enforcement
    if (!isOriginAllowed(origin, env)) {
      return new Response(
        JSON.stringify({ error: "Disallowed Origin" }),
        { status: 403, headers: responseHeaders }
      );
    }

    const url = new URL(request.url);
    const pathname = url.pathname;
    const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";

    // FUTURE EXTENSION POINT: Firebase App Check token verification.
    // To verify App Check tokens on the server, you would validate the 'x-appcheck-token' header 
    // using Firebase App Check Admin SDK or by calling the Firebase App Check public verification API.
    //
    // const appCheckToken = request.headers.get("x-appcheck-token");
    // if (appCheckToken) {
    //   const isValid = await verifyAppCheckToken(appCheckToken, env);
    //   if (!isValid) return new Response("Invalid App Check Token", { status: 401, headers: responseHeaders });
    // }

    // Rate limiting per-IP & per-endpoint
    const limit = pathname === "/api/study/vision" ? 10 : 60;
    const windowMs = 10 * 60 * 1000; // 10 minutes
    if (pathname.startsWith("/api/") && pathname !== "/api/health") {
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
      // Endpoint: GET /api/health
      if (pathname === "/api/health" && request.method === "GET") {
        return new Response(
          JSON.stringify({
            status: "ok",
            service: "zana-api-worker",
          }),
          { status: 200, headers: responseHeaders }
        );
      }

      // Endpoint: POST /api/chat
      if (pathname === "/api/chat" && request.method === "POST") {
        const body: any = await request.json().catch(() => ({}));
        const { message, history, profile } = body;

        if (!message || !profile) {
          return new Response(
            JSON.stringify({ error: "داواکارییەکە کەم و کوڕی تێدایە." }),
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
            JSON.stringify({ error: "داواکارییەکە کەم و کوڕی تێدایە." }),
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

      // Fallback 404
      return new Response(
        JSON.stringify({ error: "نۆت فۆند - ڕێڕەوی داواکراو بوونی نییە." }),
        { status: 404, headers: responseHeaders }
      );
    } catch (err: unknown) {
      const category = classifyError(err);
      return new Response(
        JSON.stringify({ error: getClientSafeErrorMessage(category) }),
        { status: 500, headers: responseHeaders }
      );
    }
  },
};
