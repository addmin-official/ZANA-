import express, { Request, Response } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { buildSystemPrompt } from "../ai/buildSystemPrompt.ts";
import multer from "multer";
import { getPrimaryModel, getVisionModel } from "./config/aiModels.ts";
import { validateImageSignature } from "./security/imageSignature.ts";
import { CurriculumRetriever } from "../curriculum/retrieval/CurriculumRetriever.ts";

dotenv.config();

const app = express();

// Configure Express trust proxy correctly for Firebase (bounded trust)
app.set("trust proxy", 1);

// Add secure production headers where appropriate
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

app.use(express.json());

// Minimal Health Endpoint
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "zana-api",
  });
});

// 1. SAFE ERROR RESPONSES
export type SafeErrorCategory =
  | "validation"
  | "timeout"
  | "upload_too_large"
  | "unsupported_file"
  | "provider_unavailable"
  | "internal";

export interface StudyContext {
  studentId: string;
  grade: string;
  stream: string;
  subject: string;
  level: string;
  lessonTitle?: string;
  conceptTitle?: string;
}

export function classifyError(error: unknown): SafeErrorCategory {
  if (!error) return "internal";

  if (error && typeof error === "object") {
    const errObj = error as Record<string, unknown>;
    if (errObj.code === "LIMIT_FILE_SIZE") {
      return "upload_too_large";
    }
    if (errObj.code === "UNSUPPORTED_MIME_TYPE") {
      return "unsupported_file";
    }
    if (errObj.name === "MulterError") {
      return "validation";
    }
  }

  const msg = error instanceof Error ? error.message : String(error);
  const lowerMsg = msg.toLowerCase();

  if (lowerMsg.includes("file too large") || lowerMsg.includes("limit_file_size")) {
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

export function logMinimalError(route: string, category: SafeErrorCategory, error?: unknown): void {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: route=${route} category=${category}`);
  if (process.env.NODE_ENV !== "production") {
    console.error("Detailed Dev Error:", error);
  }
}

export class UploadValidationError extends Error {
  readonly code: "UNSUPPORTED_MIME_TYPE" = "UNSUPPORTED_MIME_TYPE";

  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

// 2. STRICT MULTER FILE FILTER
export const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new UploadValidationError("Unsupported MIME type"));
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Keep image upload max size at 5 MB
  fileFilter,
});

// 3. RATE-LIMITING
export interface RateLimitRecord {
  timestamps: number[];
}

// NOTE: This in-memory rate limiting is temporary for V1 test deployment.
// For production scale, use a persistent/shared store like Redis or Firestore.
export const rateLimitDb = new Map<string, RateLimitRecord>();

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

function rateLimitMiddleware(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: express.NextFunction) => {
    let ip = req.ip || req.socket.remoteAddress || "unknown";
    
    // Normalize IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1 -> 127.0.0.1)
    if (ip.startsWith("::ffff:")) {
      ip = ip.substring(7);
    }

    if (isRateLimited(ip, limit, windowMs)) {
      const category: SafeErrorCategory = "validation";
      logMinimalError(req.originalUrl + " [rate-limit]", category);
      return res.status(429).json({
        error: "داواکارییەکان زۆر بوون؛ تکایە چەند خولەکێک چاوەڕێ بکە و دووبارە هەوڵ بدەرەوە.",
      });
    }
    next();
  };
}

interface ChatMessageInput {
  sender: string;
  text: string;
}

// Lazy initialization of the Gemini API Client
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("کلیل (GEMINI_API_KEY) بۆ سیستەمی زیرەکی زانا بەردەست نییە لە ڕێکخستنەکاندا. تکایە كلیلەکە لە پانێڵی Secrets دابنێ.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. CHAT ENDPOINT
app.post("/api/chat", rateLimitMiddleware(60, 10 * 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { message, history, profile } = req.body;

    if (!message || !profile) {
      return res.status(400).json({ error: "داواکارییەکە کەم و کوڕی تێدایە." });
    }

    // Curriculum Retrieval and Licensing Guard
    const retriever = new CurriculumRetriever();
    const retrievalResult = await retriever.retrieve({
      grade: profile.grade,
      subject: profile.activeSubject,
      query: message,
    });

    const firstLesson = retrievalResult.matchedLessons[0];
    const curriculumContext = {
      curriculumId: firstLesson?.curriculumId || "none",
      unitTitle: firstLesson?.unitId || undefined,
      lessonTitle: firstLesson?.title || undefined,
      conceptTitle: retrievalResult.matchedConcepts[0] || undefined,
      groundingStatus: retrievalResult.groundingStatus,
      sourceStatus: firstLesson?.sourceStatus || "NONE",
      retrievalConfidence: retrievalResult.confidence,
      excerpts: retrievalResult.excerpts,
    };

    const ai = getAiClient();
    const systemInstruction = buildSystemPrompt({
      studentName: profile.name,
      grade: profile.grade,
      subject: profile.activeSubject,
      level: profile.level,
      mode: "chat",
      curriculumContext,
    });

    // Map chat history to Gemini API format
    const contents = (history || []).map((msg: ChatMessageInput) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    // Append the latest user query
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: getPrimaryModel(),
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const replyText = response.text || "ببوورە، من نەمتوانی لە قسەکەت تێبگەم. تکایە دووبارە پرسیارەکەت بنووسەوە.";
    
    // Determine if educational or a redirect/unrelated topic
    const isEducational = !replyText.includes("دەرەوەی بوارە وانەییەکانی منە");

    res.json({
      text: replyText,
      isEducational,
      groundingStatus: retrievalResult.groundingStatus,
      curriculumMetadata: firstLesson ? {
        id: firstLesson.id,
        title: firstLesson.title,
        sourceStatus: firstLesson.sourceStatus,
        licenseId: firstLesson.licenseId,
        metadata: firstLesson.metadata,
      } : null,
      confidence: retrievalResult.confidence,
    });
  } catch (err: unknown) {
    const category = classifyError(err);
    logMinimalError("/api/chat", category);
    res.status(500).json({ error: getClientSafeErrorMessage(category) });
  }
});

// 2. ASSESSMENT ENDPOINT
app.post("/api/assessment", rateLimitMiddleware(60, 10 * 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { state, profile } = req.body;

    if (!state || !profile) {
      return res.status(400).json({ error: "زانیارییەکانی تاقیکردنەوە نەنێردراون." });
    }

    const ai = getAiClient();
    const systemInstruction = buildSystemPrompt({
      studentName: profile.name,
      grade: profile.grade,
      subject: profile.activeSubject,
      level: profile.level,
      mode: "assessment",
    });

    // Construct history of the assessment so far
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
      model: getPrimaryModel(),
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
      // Simple internal check
      const correctCount = (state.correctAnswers || []).filter(Boolean).length + (responseJson.isCorrect ? 1 : 0);
      if (correctCount <= 2) finalLevel = "سەرەتا";
      else if (correctCount <= 4) finalLevel = "مامناوەند";
      else finalLevel = "پێشکەوتوو";
    }

    res.json({
      question: responseJson.question || "",
      feedback: responseJson.feedback || "وەڵامەکە لەلایەن زانا هەڵسەنگێندرا.",
      isCorrect: !!responseJson.isCorrect,
      completed: isLast,
      finalLevel,
    });
  } catch (err: unknown) {
    const category = classifyError(err);
    logMinimalError("/api/assessment", category);
    res.status(500).json({ error: getClientSafeErrorMessage(category) });
  }
});

// 3. REPORT ENDPOINT
app.post("/api/report", rateLimitMiddleware(60, 10 * 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { profile, summaryStats } = req.body;

    if (!profile || !summaryStats) {
      return res.status(400).json({ error: "زانیارییەکان تەواو نین بۆ دروستکردنی ڕاپۆرت." });
    }

    const ai = getAiClient();
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
داواکاری: وەڵامەکەت تەنها بە فۆرماتی خواستراوی JSON بێت.
`;

    const response = await ai.models.generateContent({
      model: getPrimaryModel(),
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

    res.json({
      recommendation: responseJson.recommendation || "مامۆستا زانا زۆر هیوای سەرکەوتن بۆ قوتابی دەکات. هەمیشە هاندەری بن لە پۆلدا.",
    });
  } catch (err: unknown) {
    const category = classifyError(err);
    logMinimalError("/api/report", category);
    res.status(500).json({ error: getClientSafeErrorMessage(category) });
  }
});

// 3.5. STUDY ASK ENDPOINT
app.post("/api/study/ask", rateLimitMiddleware(60, 10 * 60 * 1000), async (req: Request, res: Response) => {
  try {
    const { message, history, context } = req.body;

    if (!message || !context) {
      return res.status(400).json({ error: "داواکارییەکە کەم و کوڕی تێدایە." });
    }

    // Curriculum Retrieval and Licensing Guard
    const retriever = new CurriculumRetriever();
    const retrievalResult = await retriever.retrieve({
      grade: context.grade,
      subject: context.subject,
      lessonTitle: context.lessonTitle,
      conceptTitle: context.conceptTitle,
      query: message,
    });

    const firstLesson = retrievalResult.matchedLessons[0];
    const curriculumContext = {
      curriculumId: firstLesson?.curriculumId || "none",
      unitTitle: firstLesson?.unitId || undefined,
      lessonTitle: firstLesson?.title || undefined,
      conceptTitle: retrievalResult.matchedConcepts[0] || undefined,
      groundingStatus: retrievalResult.groundingStatus,
      sourceStatus: firstLesson?.sourceStatus || "NONE",
      retrievalConfidence: retrievalResult.confidence,
      excerpts: retrievalResult.excerpts,
    };

    const ai = getAiClient();
    const systemInstruction = buildSystemPrompt({
      studentName: context.studentName,
      grade: context.grade,
      subject: context.subject,
      level: context.level,
      mode: "ask",
      curriculumContext,
    });

    // Map chat history to Gemini API format
    const contents = (history || []).map((msg: { role: "student" | "zana"; text: string }) => ({
      role: msg.role === "student" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    // Append the latest user query
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: getPrimaryModel(),
      contents,
      config: {
        systemInstruction,
        temperature: 0.5,
      },
    });

    const replyText = response.text || "ببوورە، من نەمتوانی لە پرسیارەکەت تێبگەم. تکایە دووبارە پرسیارەکەت بنووسەوە.";
    
    // Determine if educational or unrelated topic redirect
    const isEducational = !replyText.includes("بوارە وانەییەکانی من نییە") && !replyText.includes("دەرەوەی بوارە وانەییەکانی منە");

    res.json({
      text: replyText,
      isEducational,
      groundingStatus: retrievalResult.groundingStatus,
      curriculumMetadata: firstLesson ? {
        id: firstLesson.id,
        title: firstLesson.title,
        sourceStatus: firstLesson.sourceStatus,
        licenseId: firstLesson.licenseId,
        metadata: firstLesson.metadata,
      } : null,
      confidence: retrievalResult.confidence,
    });
  } catch (err: unknown) {
    const category = classifyError(err);
    logMinimalError("/api/study/ask", category);
    res.status(500).json({ error: getClientSafeErrorMessage(category) });
  }
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const VISION_REQUEST_MODES = ["explain", "extract_only", "hint", "step_by_step", "formula"] as const;
type VisionRequestMode = typeof VISION_REQUEST_MODES[number];

function isVisionRequestMode(value: unknown): value is VisionRequestMode {
  return typeof value === "string" && (VISION_REQUEST_MODES as readonly string[]).includes(value);
}

function isStudyContext(value: unknown): value is StudyContext {
  if (!isRecord(value)) return false;
  const { studentId, grade, stream, subject, level, lessonTitle, conceptTitle } = value;
  if (typeof studentId !== "string" || !studentId.trim()) return false;
  if (typeof grade !== "string" || !grade.trim()) return false;
  if (typeof stream !== "string" || !stream.trim()) return false;
  if (typeof subject !== "string" || !subject.trim()) return false;
  if (typeof level !== "string" || !level.trim()) return false;
  if (lessonTitle !== undefined && typeof lessonTitle !== "string") return false;
  if (conceptTitle !== undefined && typeof conceptTitle !== "string") return false;
  return true;
}

interface VisionResponse {
  extractedText: string;
  detectedSubject?: string;
  responseText?: string;
  confidence: "low" | "medium" | "high";
  warnings: string[];
}

function isVisionResponse(value: unknown): value is VisionResponse {
  if (!isRecord(value)) return false;
  const { extractedText, detectedSubject, responseText, confidence, warnings } = value;
  if (typeof extractedText !== "string") return false;
  if (detectedSubject !== undefined && typeof detectedSubject !== "string") return false;
  if (responseText !== undefined && typeof responseText !== "string") return false;
  if (confidence !== "low" && confidence !== "medium" && confidence !== "high") return false;
  if (!Array.isArray(warnings)) return false;
  for (const warning of warnings) {
    if (typeof warning !== "string") return false;
  }
  return true;
}

// 3.6. STUDY VISION ENDPOINT
app.post(
  "/api/study/vision",
  rateLimitMiddleware(10, 10 * 60 * 1000),
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        const category: SafeErrorCategory = "validation";
        logMinimalError("/api/study/vision [file-missing]", category);
        return res.status(400).json({ error: getClientSafeErrorMessage(category) });
      }

      const isValidSignature = validateImageSignature(req.file.buffer, req.file.mimetype);
      if (!isValidSignature) {
        const category: SafeErrorCategory = "unsupported_file";
        logMinimalError("/api/study/vision [invalid-signature]", category);
        return res.status(415).json({ error: getClientSafeErrorMessage(category) });
      }

      const body: unknown = req.body;
      if (!isRecord(body)) {
        const category: SafeErrorCategory = "validation";
        logMinimalError("/api/study/vision [body-invalid]", category);
        return res.status(400).json({ error: getClientSafeErrorMessage(category) });
      }

      const contextStr = body.context;
      const editedTextRaw = body.editedText;
      const modeRaw = body.mode !== undefined ? body.mode : "explain";

      let editedText: string | undefined;
      if (editedTextRaw !== undefined) {
        if (typeof editedTextRaw !== "string") {
          const category: SafeErrorCategory = "validation";
          logMinimalError("/api/study/vision [editedText-not-string]", category);
          return res.status(400).json({ error: getClientSafeErrorMessage(category) });
        }
        const trimmed = editedTextRaw.trim();
        if (trimmed.length > 5000) {
          const category: SafeErrorCategory = "validation";
          logMinimalError("/api/study/vision [editedText-oversized]", category);
          return res.status(400).json({ error: getClientSafeErrorMessage(category) });
        }
        editedText = trimmed;
      }

      if (!isVisionRequestMode(modeRaw)) {
        const category: SafeErrorCategory = "validation";
        logMinimalError("/api/study/vision [mode-invalid]", category);
        return res.status(400).json({ error: getClientSafeErrorMessage(category) });
      }
      const mode = modeRaw;

      if (!contextStr) {
        const category: SafeErrorCategory = "validation";
        logMinimalError("/api/study/vision [context-missing]", category);
        return res.status(400).json({ error: getClientSafeErrorMessage(category) });
      }

      if (typeof contextStr !== "string") {
        const category: SafeErrorCategory = "validation";
        logMinimalError("/api/study/vision [context-not-string]", category);
        return res.status(400).json({ error: getClientSafeErrorMessage(category) });
      }

      // Enforce maximum size constraint on the context payload (50KB)
      if (contextStr.length > 50 * 1024) {
        const category: SafeErrorCategory = "validation";
        logMinimalError("/api/study/vision [context-oversized]", category);
        return res.status(400).json({ error: getClientSafeErrorMessage(category) });
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(contextStr);
      } catch (e: unknown) {
        const category: SafeErrorCategory = "validation";
        logMinimalError("/api/study/vision [context-json-parse]", category);
        return res.status(400).json({ error: getClientSafeErrorMessage(category) });
      }

      if (!isStudyContext(parsed)) {
        const category: SafeErrorCategory = "validation";
        logMinimalError("/api/study/vision [context-fields]", category);
        return res.status(400).json({ error: getClientSafeErrorMessage(category) });
      }

      const context = parsed;

      const ai = getAiClient();
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

      // Construct pedagogical instructions based on the requested mode
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

      const visionModel = getVisionModel();

      const response = await ai.models.generateContent({
        model: visionModel,
        contents: [
          {
            inlineData: {
              data: req.file.buffer.toString("base64"),
              mimeType: req.file.mimetype,
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

      const responseText = response.text || "{}";
      let parsedResponse: unknown;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (e: unknown) {
        const category: SafeErrorCategory = "internal";
        logMinimalError("/api/study/vision [response-json-parse]", category);
        return res.status(500).json({ error: getClientSafeErrorMessage(category) });
      }

      if (!isVisionResponse(parsedResponse)) {
        const category: SafeErrorCategory = "internal";
        logMinimalError("/api/study/vision [response-validation-failed]", category);
        return res.status(500).json({ error: getClientSafeErrorMessage(category) });
      }

      res.json(parsedResponse);
    } catch (err: unknown) {
      const category = classifyError(err);
      logMinimalError("/api/study/vision", category);
      res.status(500).json({ error: getClientSafeErrorMessage(category) });
    } finally {
      if (req.file && req.file.buffer) {
        req.file.buffer = Buffer.alloc(0);
      }
    }
  },
  // Custom error handler for Multer/routing errors specifically for /api/study/vision
  (err: unknown, req: Request, res: Response, next: express.NextFunction) => {
    const category = classifyError(err);
    const statusCode = category === "upload_too_large" ? 413 : category === "unsupported_file" ? 415 : 400;
    logMinimalError("/api/study/vision [multer-error]", category);
    return res.status(statusCode).json({ error: getClientSafeErrorMessage(category) });
  }
);

// 4. VITE MIDDLEWARE OR STATIC FILES ARE REMOVED FROM RUNTIME TO ENSURE FIREBASE COMPATIBILITY
// These are now handled exclusively in server.ts for local development and non-serverless starts.


// Safe global error handler - do not expose stack traces
app.use((err: any, req: Request, res: Response, next: express.NextFunction) => {
  const category = classifyError(err);
  logMinimalError(req.originalUrl, category, err);
  res.status(err.status || err.statusCode || 500).json({
    error: getClientSafeErrorMessage(category),
  });
});

export { app };
