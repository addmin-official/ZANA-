import { GeminiProvider, ProviderGenerateParams } from "./GeminiProvider.ts";
import {
  ChatRequest,
  ChatResponse,
  AssessmentRequest,
  AssessmentResponse,
  ReportRequest,
  ReportResponse,
  AskRequest,
  AskResponse,
  VisionRequest,
  VisionResponse,
  validateChatResponse,
  validateAssessmentResponse,
  validateReportResponse,
  validateAskResponse,
  validateVisionResponse,
} from "./AiContracts.ts";
import { buildSystemPrompt } from "../../ai/buildSystemPrompt.ts";
import { resolvePrimaryModel, resolveVisionModel } from "../config/aiModels.ts";

export class ProviderAdapter {
  static async generate(params: ProviderGenerateParams): Promise<{ text: string }> {
    return GeminiProvider.generate(params);
  }

  static async chat(apiKey: string, req: ChatRequest, env?: unknown): Promise<ChatResponse> {
    const model = resolvePrimaryModel(env as Record<string, unknown> | undefined);
    const systemInstruction = buildSystemPrompt({
      studentName: req.profile.name || "قوتابی",
      grade: req.profile.grade || "9",
      subject: req.profile.activeSubject || "بیرکاری",
      level: req.profile.level || "ناوەند",
      mode: "chat",
    });

    const contents = (req.history || []).map((msg) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    contents.push({
      role: "user",
      parts: [{ text: req.message }],
    });

    const response = await ProviderAdapter.generate({
      apiKey,
      model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            text: { type: "STRING" },
            isEducational: { type: "BOOLEAN" },
          },
          required: ["text", "isEducational"],
        },
      },
      pathname: "/api/chat",
    });

    let json: unknown = {};
    try {
      json = JSON.parse(response.text);
    } catch {
      json = { text: response.text, isEducational: true };
    }

    return validateChatResponse(json);
  }

  static async assessment(apiKey: string, req: AssessmentRequest, env?: unknown): Promise<AssessmentResponse> {
    const model = resolvePrimaryModel(env as Record<string, unknown> | undefined);
    const systemInstruction = buildSystemPrompt({
      studentName: req.profile.name || "قوتابی",
      grade: req.profile.grade || "9",
      subject: req.profile.activeSubject || "بیرکاری",
      level: req.profile.level || "ناوەند",
      mode: "assessment",
    });

    const currentQuestionNum = req.state.currentQuestion;
    const historySummary: string[] = [];

    for (let i = 0; i < req.state.questions.length; i++) {
      historySummary.push(`پێشنیار/پرسیار: ${req.state.questions[i]}`);
      if (req.state.answers && req.state.answers[i]) {
        historySummary.push(`وەڵامی قوتابی: ${req.state.answers[i]}`);
      }
    }

    const userInstructionsPrompt = `
تۆ ئێستا لە پرسیاری ژمارە ${currentQuestionNum}ی تاقیکردنەوەی خولی نێوان ٥ پرسیارکەیت.
مێژووی ئەم تاقیکردنەوەیە تا ئێستا:
${historySummary.join("\n")}

کارەکانت بەپێی وەڵامەکان:
١. ئەگەر لیستەکە خاڵییە و هیچ وەڵامێک نییە (پرسیاری یەکەم)، تکایە پرسیارێکی زۆر بەهێزی سەرەکی لەم بابەتەدا بۆ ئاستی ${req.profile.level || "ناوەند"} پێشکەش بکە لە 'question' و بە کورت دەستپێشخەری لە 'feedback' بنووسە.
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

    const response = await ProviderAdapter.generate({
      apiKey,
      model,
      contents: userInstructionsPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            question: { type: "STRING" },
            feedback: { type: "STRING" },
            isCorrect: { type: "BOOLEAN" },
          },
          required: ["question", "feedback", "isCorrect"],
        },
      },
      pathname: "/api/assessment",
    });

    let json: unknown = {};
    try {
      json = JSON.parse(response.text);
    } catch {
      throw new Error("Invalid provider response: invalid JSON output");
    }

    return validateAssessmentResponse(json);
  }

  static async report(apiKey: string, req: ReportRequest, env?: unknown): Promise<ReportResponse> {
    const model = resolvePrimaryModel(env as Record<string, unknown> | undefined);
    const systemInstruction = buildSystemPrompt({
      studentName: req.profile.name || "قوتابی",
      grade: req.profile.grade || "9",
      subject: req.profile.activeSubject || "بیرکاری",
      level: req.profile.level || "ناوەند",
      mode: "report",
    });

    const userPrompt = `
تکایە هەڵسەنگاندنێکی گشتگیر و کورت بۆ پێشکەوتنی ئەم قوتابییە بنووسە.
زانیارییەکانی قوتابی: ${JSON.stringify(req.profile)}
ئاماری یارمەتیدەر: ${JSON.stringify(req.summaryStats || {})}

پێویستە وەڵامەکەت تەنها ڕستەیەکی سوودبەخش و ڕێنماییکەر بێت بە فۆرماتی JSON:
{
  "recommendation": "ڕێنمایی کورت و گرنگ بۆ قوتابی یان بەخێوکار"
}
`;

    const response = await ProviderAdapter.generate({
      apiKey,
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            recommendation: { type: "STRING" },
          },
          required: ["recommendation"],
        },
      },
      pathname: "/api/report",
    });

    let json: unknown = {};
    try {
      json = JSON.parse(response.text);
    } catch {
      throw new Error("Invalid provider response: invalid JSON output");
    }

    return validateReportResponse(json);
  }

  static async ask(apiKey: string, req: AskRequest, env?: unknown): Promise<AskResponse> {
    const model = resolvePrimaryModel(env as Record<string, unknown> | undefined);
    const systemInstruction = buildSystemPrompt({
      studentName: req.context.studentName || "قوتابی",
      grade: req.context.grade || "9",
      subject: req.context.subject || "بیرکاری",
      level: req.context.level || "ناوەند",
      mode: "ask",
      lessonTitle: req.context.lessonTitle,
      conceptTitle: req.context.conceptTitle,
    });

    const contents = (req.history || []).map((msg) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    contents.push({
      role: "user",
      parts: [{ text: req.message }],
    });

    const response = await ProviderAdapter.generate({
      apiKey,
      model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            text: { type: "STRING" },
            isEducational: { type: "BOOLEAN" },
          },
          required: ["text", "isEducational"],
        },
      },
      pathname: "/api/study/ask",
    });

    let json: unknown = {};
    try {
      json = JSON.parse(response.text);
    } catch {
      json = { text: response.text, isEducational: true };
    }

    return validateAskResponse(json);
  }

  static async vision(apiKey: string, req: VisionRequest, env?: unknown): Promise<VisionResponse> {
    const model = resolveVisionModel(env as Record<string, unknown> | undefined);
    const base64Data = Buffer.from(req.imageBytes).toString("base64");

    const systemInstruction = buildSystemPrompt({
      studentName: req.context.studentId || "قوتابی",
      grade: req.context.grade || "9",
      stream: req.context.stream,
      subject: req.context.subject || "بیرکاری",
      level: req.context.level || "ناوەند",
      mode: "vision",
      lessonTitle: req.context.lessonTitle,
      conceptTitle: req.context.conceptTitle,
    });

    const contents = [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: req.mimeType,
              data: base64Data,
            },
          },
          {
            text: `شیکاری ئەم وێنەیەی وانەکە بکە بەپێی ئاستی قوتابی (${req.context.level || "ناوەند"}) و پۆلی (${req.context.grade || "١٠"}). فۆرماتی وەڵام دەبێت بە JSON بێت.`,
          },
        ],
      },
    ];

    const response = await ProviderAdapter.generate({
      apiKey,
      model,
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            extractedText: { type: "STRING" },
            detectedSubject: { type: "STRING" },
            responseText: { type: "STRING" },
            confidence: { type: "STRING", enum: ["high", "medium", "low"] },
            warnings: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
          },
          required: ["extractedText", "detectedSubject", "responseText", "confidence", "warnings"],
        },
      },
      pathname: "/api/study/vision",
    });

    let json: unknown = {};
    try {
      json = JSON.parse(response.text);
    } catch {
      throw new Error("Invalid provider response: invalid JSON output");
    }

    return validateVisionResponse(json);
  }
}
