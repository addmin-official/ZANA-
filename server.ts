import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { buildSystemPrompt } from "./src/ai/buildSystemPrompt.ts";

dotenv.config();

const PORT = 3000;

// Safe error message helper to avoid exposing raw provider error messages
function getSafeErrorMessage(err: unknown, defaultMsg: string): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = String((err as { message: unknown }).message);
    if (
      msg.includes("API_KEY") ||
      msg.includes("key") ||
      msg.includes("GoogleGenAI") ||
      msg.includes("grecaptcha") ||
      msg.includes("FetchError") ||
      msg.includes("API key")
    ) {
      return "پەیوەندی بە زانا نەکرا. تکایە دڵنیابە لە هێڵی ئینتەرنێت یان ڕێکخستنی کلیلی زانا و دووبارە هەوڵ بدەرەوە.";
    }
    return msg;
  }
  return defaultMsg;
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

async function startServer() {
  const app = express();
  app.use(express.json());

  // 1. CHAT ENDPOINT
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { message, history, profile } = req.body;

      if (!message || !profile) {
        return res.status(400).json({ error: "داواکارییەکە کەم و کوڕی تێدایە." });
      }

      const ai = getAiClient();
      const systemInstruction = buildSystemPrompt({
        studentName: profile.name,
        grade: profile.grade,
        subject: profile.activeSubject,
        level: profile.level,
        mode: "chat",
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
        model: "gemini-3.5-flash",
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
      });
    } catch (err: unknown) {
      console.error("Error in /api/chat:", err);
      res.status(500).json({ error: getSafeErrorMessage(err, "کێشەیەک ڕوویدا لە کاتی وەرگرتنی وەڵامی زانا.") });
    }
  });

  // 2. ASSESSMENT ENDPOINT
  app.post("/api/assessment", async (req: Request, res: Response) => {
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
        model: "gemini-3.5-flash",
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
      console.error("Error in /api/assessment:", err);
      res.status(500).json({ error: getSafeErrorMessage(err, "کێشەیەک ڕوویدا لە کاتی تاقیکردنەوەدا.") });
    }
  });

  // 3. REPORT ENDPOINT
  app.post("/api/report", async (req: Request, res: Response) => {
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
        model: "gemini-3.5-flash",
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
      console.error("Error in /api/report:", err);
      res.status(500).json({ error: getSafeErrorMessage(err, "ڕاپۆرت دروستکردن سەرکەوتوو نەبوو.") });
    }
  });

  // 3.5. STUDY ASK ENDPOINT
  app.post("/api/study/ask", async (req: Request, res: Response) => {
    try {
      const { message, history, context } = req.body;

      if (!message || !context) {
        return res.status(400).json({ error: "داواکارییەکە کەم و کوڕی تێدایە." });
      }

      const ai = getAiClient();
      const systemInstruction = buildSystemPrompt({
        studentName: context.studentName,
        grade: context.grade,
        subject: context.subject,
        level: context.level,
        mode: "ask",
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

      // Get model name from process.env.GEMINI_PRIMARY_MODEL or fallback to gemini-2.5-flash
      const modelName = process.env.GEMINI_PRIMARY_MODEL || "gemini-2.5-flash";

      const response = await ai.models.generateContent({
        model: modelName,
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
      });
    } catch (err: unknown) {
      console.error("Error in /api/study/ask:", err);
      res.status(500).json({ error: getSafeErrorMessage(err, "کێشەیەک ڕوویدا لە کاتی وەرگرتنی وەڵامی زانا.") });
    }
  });

  // 4. VITE MIDDLEWARE OR STATIC FILES
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ZANA Server is running on port ${PORT}`);
  });
}

startServer();
