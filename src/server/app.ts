import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import multer from "multer";
import { ProviderAdapter } from "./ai/AiProvider.ts";
import { classifyError, getClientSafeErrorMessage, logMinimalError, SafeErrorCategory } from "./ai/AiErrors.ts";
import {
  parseChatRequest,
  parseAssessmentRequest,
  parseReportRequest,
  parseAskRequest,
  parseVisionRequest,
} from "./ai/AiContracts.ts";
import { validateImageSignature } from "./security/imageSignature.ts";
import { PersistentLearningRecordProvider } from "../learning/providers/LearningRecordProvider.ts";
import { AdaptiveLearningEngine as StudentMasteryAdaptiveEngine } from "../learning/engine/AdaptiveLearningEngine.ts";
import { CurriculumRegistry } from "../curriculum/registry/CurriculumRegistry.ts";
import { AuthService } from "../services/authService.ts";
import { DifficultyLevel, MisconceptionStatus } from "../learning/domain/MasteryTypes.ts";

dotenv.config();

const app = express();

app.set("trust proxy", 1);

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

// Production Provider Preflight endpoint
app.get("/api/provider/preflight", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!process.env.PROVIDER_PREFLIGHT_TOKEN || authHeader !== `Bearer ${process.env.PROVIDER_PREFLIGHT_TOKEN}`) {
    return res.status(401).send("Unauthorized");
  }

  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_API_KEY.trim()) {
    return res.status(503).json({ ok: false, status: "error", error: "GEMINI_API_KEY missing" });
  }

  try {
    const { resolvePrimaryModel } = await import("./config/aiModels.ts");
    const model = resolvePrimaryModel(process.env);
    const result = await ProviderAdapter.generate({
      apiKey: process.env.GEMINI_API_KEY,
      model,
      contents: "ping",
      pathname: "/api/provider/preflight",
    });

    if (!result.text) {
      throw new Error("Empty response text from provider preflight");
    }

    res.status(200).json({ ok: true, status: "healthy" });
  } catch {
    res.status(503).json({
      ok: false,
      status: "error",
      error: "Provider preflight check failed",
    });
  }
});

export { classifyError, getClientSafeErrorMessage, logMinimalError, type SafeErrorCategory };

export class UploadValidationError extends Error {
  readonly code = "UNSUPPORTED_MIME_TYPE" as const;

  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

export const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new UploadValidationError("Unsupported MIME type"));
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

export interface RateLimitRecord {
  timestamps: number[];
}

export const rateLimitDb = new Map<string, RateLimitRecord>();

export function isRateLimited(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitDb.get(ip) || { timestamps: [] };

  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= limit) {
    return true;
  }

  record.timestamps.push(now);
  rateLimitDb.set(ip, record);
  return false;
}

function rateLimitMiddleware(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    let ip = req.ip || req.socket.remoteAddress || "unknown";

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

async function getAuthenticatedStudentId(req: Request): Promise<string> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }
  const token = authHeader.substring(7).trim();
  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  try {
    const claims = await AuthService.verifyFirebaseIdToken(token, process.env.FIREBASE_PROJECT_ID);
    return claims.uid;
  } catch {
    throw new Error("UNAUTHORIZED");
  }
}

// 1. CHAT ENDPOINT
app.post("/api/chat", rateLimitMiddleware(60, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const chatReq = parseChatRequest(req.body);
    const result = await ProviderAdapter.chat(process.env.GEMINI_API_KEY || "", chatReq);
    res.json({
      text: result.text,
      isEducational: result.isEducational,
    });
  } catch (err: unknown) {
    const category = classifyError(err);
    logMinimalError("/api/chat", category);
    res.status(category === "validation" ? 400 : 500).json({ error: getClientSafeErrorMessage(category) });
  }
});

// 2. ASSESSMENT ENDPOINT
app.post("/api/assessment", rateLimitMiddleware(60, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const assessReq = parseAssessmentRequest(req.body);
    const result = await ProviderAdapter.assessment(process.env.GEMINI_API_KEY || "", assessReq);

    const currentQuestionNum = assessReq.state.currentQuestion;
    const isLast = currentQuestionNum === 5;
    let finalLevel: string | null = null;
    if (isLast) {
      const correctCount = (assessReq.state.answers || []).filter(Boolean).length + (result.isCorrect ? 1 : 0);
      if (correctCount <= 2) finalLevel = "سەرەتا";
      else if (correctCount <= 4) finalLevel = "مامناوەند";
      else finalLevel = "پێشکەوتوو";
    }

    res.json({
      question: result.question,
      feedback: result.feedback,
      isCorrect: result.isCorrect,
      completed: isLast,
      finalLevel,
    });
  } catch (err: unknown) {
    const category = classifyError(err);
    logMinimalError("/api/assessment", category);
    res.status(category === "validation" ? 400 : 500).json({ error: getClientSafeErrorMessage(category) });
  }
});

// 3. REPORT ENDPOINT
app.post("/api/report", rateLimitMiddleware(60, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const reportReq = parseReportRequest(req.body);
    const result = await ProviderAdapter.report(process.env.GEMINI_API_KEY || "", reportReq);
    res.json({
      recommendation: result.recommendation,
    });
  } catch (err: unknown) {
    const category = classifyError(err);
    logMinimalError("/api/report", category);
    res.status(category === "validation" ? 400 : 500).json({ error: getClientSafeErrorMessage(category) });
  }
});

// 4. STUDY ASK ENDPOINT
app.post("/api/study/ask", rateLimitMiddleware(60, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const askReq = parseAskRequest(req.body);
    const result = await ProviderAdapter.ask(process.env.GEMINI_API_KEY || "", askReq);
    res.json({
      text: result.text,
      isEducational: result.isEducational,
    });
  } catch (err: unknown) {
    const category = classifyError(err);
    logMinimalError("/api/study/ask", category);
    res.status(category === "validation" ? 400 : 500).json({ error: getClientSafeErrorMessage(category) });
  }
});

// 5. STUDY VISION ENDPOINT
app.post(
  "/api/study/vision",
  rateLimitMiddleware(10, 60 * 1000),
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

      let contextParsed: unknown = {};
      if (req.body.context) {
        try {
          contextParsed = JSON.parse(req.body.context);
        } catch {
          return res.status(400).json({ error: getClientSafeErrorMessage("validation") });
        }
      }

      const visionReq = parseVisionRequest({
        imageBytes: new Uint8Array(req.file.buffer),
        mimeType: req.file.mimetype,
        context: contextParsed,
        mode: req.body.mode || "explain",
        editedText: req.body.editedText,
      });

      const result = await ProviderAdapter.vision(process.env.GEMINI_API_KEY || "", visionReq);

      res.json(result);
    } catch (err: unknown) {
      const category = classifyError(err);
      logMinimalError("/api/study/vision", category);
      res.status(category === "validation" ? 400 : 500).json({ error: getClientSafeErrorMessage(category) });
    } finally {
      if (req.file && req.file.buffer) {
        req.file.buffer = Buffer.alloc(0);
      }
    }
  },
  (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const category = classifyError(err);
    const statusCode = category === "upload_too_large" ? 413 : category === "unsupported_file" ? 415 : 400;
    logMinimalError("/api/study/vision [multer-error]", category);
    return res.status(statusCode).json({ error: getClientSafeErrorMessage(category) });
  }
);

const serverLearningProvider = new PersistentLearningRecordProvider();

async function getConceptTitleKu(conceptId: string): Promise<string> {
  const registry = CurriculumRegistry.getInstance();
  const lesson = registry.getAllLessons().find((l) => l.concepts.includes(conceptId));
  if (lesson) {
    return conceptId;
  }
  return conceptId;
}

// 6. LEARNING ENDPOINTS
app.get("/api/learning/mastery", async (req: Request, res: Response) => {
  try {
    const studentId = await getAuthenticatedStudentId(req);

    const reqStudentId = req.query.studentId as string;
    if (reqStudentId && reqStudentId !== studentId) {
      return res.status(403).json({ error: "دەستگەیشتن ڕەتکرایەوە." });
    }

    const profile = await serverLearningProvider.getStudentMasteryProfile(studentId);
    res.json(profile);
  } catch (err: unknown) {
    const category = classifyError(err);
    logMinimalError("/api/learning/mastery", category);
    res.status(err instanceof Error && err.message === "UNAUTHORIZED" ? 401 : 500).json({ error: getClientSafeErrorMessage(category) });
  }
});

app.get("/api/learning/mastery/:conceptId", async (req: Request, res: Response) => {
  try {
    const studentId = await getAuthenticatedStudentId(req);

    const reqStudentId = req.query.studentId as string;
    if (reqStudentId && reqStudentId !== studentId) {
      return res.status(403).json({ error: "دەستگەیشتن ڕەتکرایەوە." });
    }

    const { conceptId } = req.params;
    const state = await serverLearningProvider.getConceptMastery(studentId, conceptId);
    if (!state) {
      return res.status(404).json({ error: "چەمکی متمانە دۆزراوە بۆ ئەم قوتابییە بوونی نییە." });
    }
    res.json(state);
  } catch (err: unknown) {
    const category = classifyError(err);
    logMinimalError("/api/learning/mastery/:conceptId", category);
    res.status(err instanceof Error && err.message === "UNAUTHORIZED" ? 401 : 500).json({ error: getClientSafeErrorMessage(category) });
  }
});

app.get("/api/learning/recommendations", async (req: Request, res: Response) => {
  try {
    const studentId = await getAuthenticatedStudentId(req);

    const reqStudentId = req.query.studentId as string;
    if (reqStudentId && reqStudentId !== studentId) {
      return res.status(403).json({ error: "دەستگەیشتن ڕەتکرایەوە." });
    }

    const status = req.query.status as string;
    const recs = await serverLearningProvider.listRecommendations(studentId, status);
    res.json(recs);
  } catch (err: unknown) {
    const category = classifyError(err);
    logMinimalError("/api/learning/recommendations", category);
    res.status(err instanceof Error && err.message === "UNAUTHORIZED" ? 401 : 500).json({ error: getClientSafeErrorMessage(category) });
  }
});

app.post("/api/learning/events", async (req: Request, res: Response) => {
  try {
    const studentId = await getAuthenticatedStudentId(req);

    const { type, data } = req.body;
    if (!type) {
      return res.status(400).json({ error: "زانیاری پێویست بۆ ناردنی ڕووداو بوونی نییە." });
    }

    const event = {
      id: "evt_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now(),
      studentId,
      timestamp: new Date().toISOString(),
      type,
      data: data || {},
    };

    await serverLearningProvider.appendLearningEvent(studentId, event);
    const profile = await serverLearningProvider.getStudentMasteryProfile(studentId);
    res.json({ success: true, eventId: event.id, profile });
  } catch (err: unknown) {
    const category = classifyError(err);
    logMinimalError("/api/learning/events", category);
    res.status(err instanceof Error && err.message === "UNAUTHORIZED" ? 401 : 500).json({ error: getClientSafeErrorMessage(category) });
  }
});

app.post("/api/learning/attempts", async (req: Request, res: Response) => {
  try {
    const studentId = await getAuthenticatedStudentId(req);

    const {
      conceptId,
      isCorrect,
      responseTimeMs,
      difficulty: reqDifficulty,
      questionText,
      studentResponse,
      misconceptionDetected,
      hintUsed,
      unreliableTiming,
    } = req.body;

    if (!conceptId || isCorrect === undefined) {
      return res.status(400).json({ error: "زانیاری ناتەواو بۆ هەوڵدان لەسەر بابەت." });
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

    const currentProfile = await serverLearningProvider.getStudentMasteryProfile(studentId);
    const currentState = await serverLearningProvider.getConceptMastery(studentId, conceptId);

    const newState = StudentMasteryAdaptiveEngine.calculateNewMastery(currentState, {
      isCorrect,
      responseTimeMs: responseTimeMs || 5000,
      difficulty,
      hintUsed: !!hintUsed,
      unreliableTiming: !!unreliableTiming,
    });

    await serverLearningProvider.saveMasteryChange(studentId, conceptId, newState);

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
      timestamp: new Date().toISOString(),
    };

    const detectedMisc = StudentMasteryAdaptiveEngine.detectMisconception(attempt, currentProfile.activeMisconceptions);
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

    await serverLearningProvider.saveMasteryChange(studentId, conceptId, newState);

    const event = {
      id: "evt_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now(),
      studentId,
      timestamp: new Date().toISOString(),
      type: "EXERCISE_ATTEMPT" as const,
      data: attempt,
    };
    await serverLearningProvider.appendLearningEvent(studentId, event);

    const conceptTitleKu = await getConceptTitleKu(conceptId);

    const prerequisites: string[] = [];
    if (conceptId === "هاوکێشە" || conceptId === "هاوکێشەی هێڵی") {
      prerequisites.push("گۆڕدراو");
    }

    const recommendation = StudentMasteryAdaptiveEngine.generateRecommendation(
      studentId,
      conceptId,
      conceptTitleKu,
      currentProfile,
      prerequisites
    );

    await serverLearningProvider.saveRecommendation(recommendation);

    res.json({
      success: true,
      masteryState: newState,
      misconceptionDetected: detectedMisc,
      recommendation,
    });
  } catch (err: unknown) {
    const category = classifyError(err);
    logMinimalError("/api/learning/attempts", category);
    res.status(err instanceof Error && err.message === "UNAUTHORIZED" ? 401 : 500).json({ error: getClientSafeErrorMessage(category) });
  }
});

app.post("/api/learning/sessions/start", async (req: Request, res: Response) => {
  try {
    const studentId = await getAuthenticatedStudentId(req);

    const session = {
      id: "ses_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now(),
      studentId,
      startTime: new Date().toISOString(),
      endTime: null,
      events: [],
      focusScore: 1.0,
    };

    await serverLearningProvider.createLearningSession(session);
    res.json(session);
  } catch (err: unknown) {
    const category = classifyError(err);
    logMinimalError("/api/learning/sessions/start", category);
    res.status(err instanceof Error && err.message === "UNAUTHORIZED" ? 401 : 500).json({ error: getClientSafeErrorMessage(category) });
  }
});

app.post("/api/learning/sessions/:sessionId/end", async (req: Request, res: Response) => {
  try {
    const studentId = await getAuthenticatedStudentId(req);

    const { sessionId } = req.params;
    const { focusScore } = req.body;

    const session = {
      id: sessionId,
      studentId,
      startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      endTime: new Date().toISOString(),
      events: [],
      focusScore: focusScore !== undefined ? focusScore : 1.0,
    };

    await serverLearningProvider.updateLearningSession(session);
    res.json(session);
  } catch (err: unknown) {
    const category = classifyError(err);
    logMinimalError("/api/learning/sessions/:sessionId/end", category);
    res.status(err instanceof Error && err.message === "UNAUTHORIZED" ? 401 : 500).json({ error: getClientSafeErrorMessage(category) });
  }
});

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const category = classifyError(err);
  logMinimalError(req.originalUrl, category, err);
  const status = (err && typeof err === "object" && ("status" in err || "statusCode" in err))
    ? Number((err as Record<string, unknown>).status || (err as Record<string, unknown>).statusCode) || 500
    : 500;
  res.status(status).json({
    error: getClientSafeErrorMessage(category),
  });
});

export { app };
