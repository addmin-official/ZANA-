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
import { Type } from "@google/genai";

export class ProviderAdapter {
  static async generate(params: ProviderGenerateParams): Promise<any> {
    return GeminiProvider.generate(params);
  }

  static async chat(apiKey: string, req: ChatRequest, env?: any): Promise<ChatResponse> {
    const model = resolvePrimaryModel(env);
    const systemInstruction = buildSystemPrompt({
      studentName: req.profile.name,
      grade: req.profile.grade,
      subject: req.profile.activeSubject,
      level: req.profile.level,
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
      config: { systemInstruction, temperature: 0.7 },
      pathname: "/api/chat",
    });

    return validateChatResponse({ text: response.text });
  }

  static async assessment(apiKey: string, req: AssessmentRequest, env?: any): Promise<AssessmentResponse> {
    const model = resolvePrimaryModel(env);
    const systemInstruction = buildSystemPrompt({
      studentName: req.profile.name,
      grade: req.profile.grade,
      subject: req.profile.activeSubject,
      level: req.profile.level,
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
١. ئەگەر لیستەکە خاڵییە و هیچ وەڵامێک نییە (پرسیاری یەکەم)، تکایە پرسیارێکی زۆر بەهێزی سەرەکی لەم بابەتەدا بۆ ئاستی ${req.profile.level} پێشکەش بکە لە 'question' و بە کورت دەستپێشخەری لە 'feedback' بنووسە.
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
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            feedback: { type: Type.STRING },
            isCorrect: { type: Type.BOOLEAN },
          },
          required: ["question", "feedback", "isCorrect"],
        },
      },
      pathname: "/api/assessment",
    });

    let json: any = {};
    try {
      json = JSON.parse(response.text || "{}");
    } catch (e) {
      throw new Error("Invalid provider response: invalid JSON output");
    }

    return validateAssessmentResponse(json);
  }

  static async report(apiKey: string, req: ReportRequest, env?: any): Promise<ReportResponse> {
    const model = resolvePrimaryModel(env);
    const systemInstruction = buildSystemPrompt({
      studentName: req.profile.name,
      grade: req.profile.grade,
      subject: req.profile.activeSubject,
      level: req.profile.level,
      mode: "chat",
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
          type: Type.OBJECT,
          properties: {
            recommendation: { type: Type.STRING },
          },
          required: ["recommendation"],
        },
      },
      pathname: "/api/report",
    });

    let json: any = {};
    try {
      json = JSON.parse(response.text || "{}");
    } catch (e) {
      throw new Error("Invalid provider response: invalid JSON output");
    }

    return validateReportResponse(json);
  }

  static async ask(apiKey: string, req: AskRequest, env?: any): Promise<AskResponse> {
    const model = resolvePrimaryModel(env);
    const systemInstruction = buildSystemPrompt({
      studentName: req.context.studentName,
      grade: req.context.grade,
      subject: req.context.subject,
      level: req.context.level,
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
      config: { systemInstruction, temperature: 0.7 },
      pathname: "/api/study/ask",
    });

    return validateAskResponse({ text: response.text });
  }

  static async vision(apiKey: string, req: VisionRequest, env?: any): Promise<VisionResponse> {
    const model = resolveVisionModel(env);
    const base64Data = Buffer.from(req.imageBytes).toString("base64");

    const systemInstruction = buildSystemPrompt({
      studentName: req.context.studentId || "قوتابی",
      grade: req.context.grade,
      subject: req.context.subject,
      level: req.context.level,
      mode: "vision",
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
          type: Type.OBJECT,
          properties: {
            extractedText: { type: Type.STRING },
            detectedSubject: { type: Type.STRING },
            responseText: { type: Type.STRING },
            confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
            warnings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["extractedText", "detectedSubject", "responseText", "confidence", "warnings"],
        },
      },
      pathname: "/api/study/vision",
    });

    let json: any = {};
    try {
      json = JSON.parse(response.text || "{}");
    } catch (e) {
      throw new Error("Invalid provider response: invalid JSON output");
    }

    return validateVisionResponse(json);
  }
}
