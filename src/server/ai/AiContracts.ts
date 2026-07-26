export interface StudentProfileContext {
  name?: string;
  grade?: string;
  activeSubject?: string;
  level?: string;
}

export interface ChatRequest {
  message: string;
  history?: Array<{ sender: string; text: string }>;
  profile: StudentProfileContext;
}

export interface ChatResponse {
  text: string;
  isEducational: boolean;
}

export interface AssessmentRequest {
  state: {
    currentQuestion: number;
    questions: string[];
    answers: string[];
  };
  profile: StudentProfileContext;
}

export interface AssessmentResponse {
  question: string;
  feedback: string;
  isCorrect: boolean;
}

export interface ReportRequest {
  profile: StudentProfileContext;
  summaryStats?: Record<string, unknown>;
}

export interface ReportResponse {
  recommendation: string;
}

export interface AskRequest {
  message: string;
  history?: Array<{ sender: string; text: string }>;
  context: {
    studentName?: string;
    grade?: string;
    subject?: string;
    level?: string;
    lessonTitle?: string;
    conceptTitle?: string;
  };
}

export interface AskResponse {
  text: string;
  isEducational: boolean;
}

export interface VisionRequest {
  imageBytes: Uint8Array;
  mimeType: string;
  context: {
    studentId?: string;
    grade?: string;
    stream?: string;
    subject?: string;
    level?: string;
    lessonTitle?: string;
    conceptTitle?: string;
  };
  mode?: string;
  editedText?: string;
}

export interface VisionResponse {
  extractedText: string;
  detectedSubject: string;
  responseText: string;
  confidence: "high" | "medium" | "low";
  warnings: string[];
}

const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_COUNT = 50;
const MAX_HISTORY_TEXT_LENGTH = 4000;
const MAX_ARRAY_LENGTH = 50;
const MAX_WARNINGS_COUNT = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

export function parseChatRequest(body: unknown): ChatRequest {
  if (!isRecord(body)) throw new Error("داواکارییەکە تێکچووە: Request body must be a JSON object");

  if (typeof body.message !== "string" || !body.message.trim()) {
    throw new Error("پەیام (message) دیاری نەکراوە یان خاڵییە.");
  }
  if (body.message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`درێژی پەیام لە ڕادەی ڕێگەپێدراو زیاترە (زیاتر لە ${MAX_MESSAGE_LENGTH} پیت).`);
  }

  let history: Array<{ sender: string; text: string }> | undefined = undefined;
  if (body.history !== undefined) {
    if (!Array.isArray(body.history)) {
      throw new Error("مێژووی پەیوەندی (history) دەبێت لیست بێت.");
    }
    if (body.history.length > MAX_HISTORY_COUNT) {
      throw new Error(`مێژووی پەیوەندی لە ڕادەی دیاریکراو زیاترە (${MAX_HISTORY_COUNT}).`);
    }
    history = body.history.map((item, idx) => {
      if (!isRecord(item) || typeof item.sender !== "string" || typeof item.text !== "string") {
        throw new Error(`بڕگەی ${idx} لە مێژوودا هەڵەیە.`);
      }
      if (item.text.length > MAX_HISTORY_TEXT_LENGTH) {
        throw new Error(`دەقی بڕگەی ${idx} لە مێژوودا زۆر درێژە.`);
      }
      return { sender: item.sender.trim(), text: item.text.trim() };
    });
  }

  const profileObj = isRecord(body.profile) ? body.profile : {};
  const profile: StudentProfileContext = {
    name: typeof profileObj.name === "string" ? profileObj.name.slice(0, 100) : undefined,
    grade: typeof profileObj.grade === "string" ? profileObj.grade.slice(0, 20) : undefined,
    activeSubject: typeof profileObj.activeSubject === "string" ? profileObj.activeSubject.slice(0, 50) : undefined,
    level: typeof profileObj.level === "string" ? profileObj.level.slice(0, 50) : undefined,
  };

  return { message: body.message.trim(), history, profile };
}

export function parseAssessmentRequest(body: unknown): AssessmentRequest {
  if (!isRecord(body)) throw new Error("داواکارییەکە تێکچووە: Request body must be a JSON object");

  if (!isRecord(body.state)) {
    throw new Error("دۆخی تاقیکردنەوە (state) دیاری نەکراوە.");
  }

  const currentQuestion = typeof body.state.currentQuestion === "number" ? body.state.currentQuestion : 1;
  if (!Array.isArray(body.state.questions)) {
    throw new Error("لیستی پرسیارەکان (questions) دیاری نەکراوە.");
  }
  if (body.state.questions.length > MAX_ARRAY_LENGTH) {
    throw new Error("ژمارەی پرسیارەکان لە ڕادەی ڕێگەپێدراو زیاترە.");
  }

  const questions = body.state.questions.map((q) => (typeof q === "string" ? q.slice(0, 2000) : ""));
  const answers = Array.isArray(body.state.answers)
    ? body.state.answers.slice(0, MAX_ARRAY_LENGTH).map((a) => (typeof a === "string" ? a.slice(0, 2000) : ""))
    : [];

  const profileObj = isRecord(body.profile) ? body.profile : {};
  const profile: StudentProfileContext = {
    name: typeof profileObj.name === "string" ? profileObj.name.slice(0, 100) : undefined,
    grade: typeof profileObj.grade === "string" ? profileObj.grade.slice(0, 20) : undefined,
    activeSubject: typeof profileObj.activeSubject === "string" ? profileObj.activeSubject.slice(0, 50) : undefined,
    level: typeof profileObj.level === "string" ? profileObj.level.slice(0, 50) : undefined,
  };

  return {
    state: { currentQuestion, questions, answers },
    profile,
  };
}

export function parseReportRequest(body: unknown): ReportRequest {
  if (!isRecord(body)) throw new Error("داواکارییەکە تێکچووە: Request body must be a JSON object");

  const profileObj = isRecord(body.profile) ? body.profile : {};
  const profile: StudentProfileContext = {
    name: typeof profileObj.name === "string" ? profileObj.name.slice(0, 100) : undefined,
    grade: typeof profileObj.grade === "string" ? profileObj.grade.slice(0, 20) : undefined,
    activeSubject: typeof profileObj.activeSubject === "string" ? profileObj.activeSubject.slice(0, 50) : undefined,
    level: typeof profileObj.level === "string" ? profileObj.level.slice(0, 50) : undefined,
  };

  const summaryStats = isRecord(body.summaryStats) ? body.summaryStats : undefined;

  return { profile, summaryStats };
}

export function parseAskRequest(body: unknown): AskRequest {
  if (!isRecord(body)) throw new Error("داواکارییەکە تێکچووە: Request body must be a JSON object");

  if (typeof body.message !== "string" || !body.message.trim()) {
    throw new Error("پەیام (message) دیاری نەکراوە یان خاڵییە.");
  }
  if (body.message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`درێژی پەیام لە ڕادەی ڕێگەپێدراو زیاترە (زیاتر لە ${MAX_MESSAGE_LENGTH} پیت).`);
  }

  let history: Array<{ sender: string; text: string }> | undefined = undefined;
  if (body.history !== undefined) {
    if (!Array.isArray(body.history)) {
      throw new Error("مێژووی پەیوەندی (history) دەبێت لیست بێت.");
    }
    if (body.history.length > MAX_HISTORY_COUNT) {
      throw new Error(`مێژووی پەیوەندی لە ڕادەی دیاریکراو زیاترە (${MAX_HISTORY_COUNT}).`);
    }
    history = body.history.map((item, idx) => {
      if (!isRecord(item) || typeof item.sender !== "string" || typeof item.text !== "string") {
        throw new Error(`بڕگەی ${idx} لە مێژوودا هەڵەیە.`);
      }
      if (item.text.length > MAX_HISTORY_TEXT_LENGTH) {
        throw new Error(`دەقی بڕگەی ${idx} لە مێژوودا زۆر درێژە.`);
      }
      return { sender: item.sender.trim(), text: item.text.trim() };
    });
  }

  const contextObj = isRecord(body.context) ? body.context : {};
  const context = {
    studentName: typeof contextObj.studentName === "string" ? contextObj.studentName.slice(0, 100) : undefined,
    grade: typeof contextObj.grade === "string" ? contextObj.grade.slice(0, 20) : undefined,
    subject: typeof contextObj.subject === "string" ? contextObj.subject.slice(0, 50) : undefined,
    level: typeof contextObj.level === "string" ? contextObj.level.slice(0, 50) : undefined,
  };

  return { message: body.message.trim(), history, context };
}

export function parseVisionRequest(body: unknown): VisionRequest {
  if (!isRecord(body)) throw new Error("داواکارییەکە تێکچووە: Request body must be a JSON object");

  let imageBytes: Uint8Array;
  if (typeof body.imageBase64 === "string" && body.imageBase64.trim()) {
    const rawB64 = body.imageBase64.includes(",") ? body.imageBase64.split(",")[1] : body.imageBase64;
    const bin = atob(rawB64);
    if (bin.length > MAX_IMAGE_BYTES) {
      throw new Error("قەبارەی وێنەکە لە ڕادەی ڕێگەپێدراو (١٠ مێگابایت) زیاترە.");
    }
    imageBytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      imageBytes[i] = bin.charCodeAt(i);
    }
  } else if (body.imageBytes instanceof Uint8Array) {
    if (body.imageBytes.length > MAX_IMAGE_BYTES) {
      throw new Error("قەبارەی وێنەکە لە ڕادەی ڕێگەپێدراو (١٠ مێگابایت) زیاترە.");
    }
    imageBytes = body.imageBytes;
  } else {
    throw new Error("وێنەکە دیاری نەکراوە یان بە فۆرماتی دروست نییە.");
  }

  const mimeType = typeof body.mimeType === "string" && body.mimeType.trim() ? body.mimeType.trim() : "image/jpeg";
  const contextObj = isRecord(body.context) ? body.context : {};
  const context = {
    studentId: typeof contextObj.studentId === "string" ? contextObj.studentId.slice(0, 100) : undefined,
    grade: typeof contextObj.grade === "string" ? contextObj.grade.slice(0, 20) : undefined,
    stream: typeof contextObj.stream === "string" ? contextObj.stream.slice(0, 50) : undefined,
    subject: typeof contextObj.subject === "string" ? contextObj.subject.slice(0, 50) : undefined,
    level: typeof contextObj.level === "string" ? contextObj.level.slice(0, 50) : undefined,
    lessonTitle: typeof contextObj.lessonTitle === "string" ? contextObj.lessonTitle.slice(0, 200) : undefined,
    conceptTitle: typeof contextObj.conceptTitle === "string" ? contextObj.conceptTitle.slice(0, 200) : undefined,
  };

  const mode = typeof body.mode === "string" ? body.mode.slice(0, 50) : undefined;
  const editedText = typeof body.editedText === "string" ? body.editedText.slice(0, 4000) : undefined;

  return { imageBytes, mimeType, context, mode, editedText };
}

// Strict response validators (reject rather than coerce)
export function validateChatResponse(raw: unknown): ChatResponse {
  if (!isRecord(raw)) {
    throw new Error("Invalid provider response: output is not an object");
  }
  if (typeof raw.text !== "string" || !raw.text.trim()) {
    throw new Error("Invalid provider response: text is missing or empty");
  }
  if (typeof raw.isEducational !== "boolean") {
    throw new Error("Invalid provider response: isEducational must be a boolean");
  }
  return { text: raw.text.trim(), isEducational: raw.isEducational };
}

export function validateAssessmentResponse(raw: unknown): AssessmentResponse {
  if (!isRecord(raw)) {
    throw new Error("Invalid provider response: output is not an object");
  }
  if (typeof raw.question !== "string") {
    throw new Error("Invalid provider response: question must be a string");
  }
  if (typeof raw.feedback !== "string" || !raw.feedback.trim()) {
    throw new Error("Invalid provider response: feedback is missing or empty");
  }
  if (typeof raw.isCorrect !== "boolean") {
    throw new Error("Invalid provider response: isCorrect must be a boolean");
  }
  return { question: raw.question.trim(), feedback: raw.feedback.trim(), isCorrect: raw.isCorrect };
}

export function validateReportResponse(raw: unknown): ReportResponse {
  if (!isRecord(raw)) {
    throw new Error("Invalid provider response: output is not an object");
  }
  if (typeof raw.recommendation !== "string" || !raw.recommendation.trim()) {
    throw new Error("Invalid provider response: recommendation is missing or empty");
  }
  return { recommendation: raw.recommendation.trim() };
}

export function validateAskResponse(raw: unknown): AskResponse {
  if (!isRecord(raw)) {
    throw new Error("Invalid provider response: output is not an object");
  }
  if (typeof raw.text !== "string" || !raw.text.trim()) {
    throw new Error("Invalid provider response: text is missing or empty");
  }
  if (typeof raw.isEducational !== "boolean") {
    throw new Error("Invalid provider response: isEducational must be a boolean");
  }
  return { text: raw.text.trim(), isEducational: raw.isEducational };
}

export function validateVisionResponse(raw: unknown): VisionResponse {
  if (!isRecord(raw)) {
    throw new Error("Invalid provider response: output is not an object");
  }
  if (typeof raw.extractedText !== "string") {
    throw new Error("Invalid provider response: extractedText must be a string");
  }
  if (typeof raw.detectedSubject !== "string" || !raw.detectedSubject.trim()) {
    throw new Error("Invalid provider response: detectedSubject is required and non-empty");
  }
  if (typeof raw.responseText !== "string" || !raw.responseText.trim()) {
    throw new Error("Invalid provider response: responseText is required and non-empty");
  }
  if (raw.confidence !== "high" && raw.confidence !== "medium" && raw.confidence !== "low") {
    throw new Error("Invalid provider response: confidence must be high, medium, or low");
  }
  if (!Array.isArray(raw.warnings)) {
    throw new Error("Invalid provider response: warnings must be an array");
  }
  if (raw.warnings.length > MAX_WARNINGS_COUNT) {
    throw new Error(`Invalid provider response: warnings exceeds maximum length of ${MAX_WARNINGS_COUNT}`);
  }
  const warnings: string[] = [];
  for (const item of raw.warnings) {
    if (typeof item !== "string") {
      throw new Error("Invalid provider response: warning item must be a string");
    }
    warnings.push(item);
  }

  return {
    extractedText: raw.extractedText.trim(),
    detectedSubject: raw.detectedSubject.trim(),
    responseText: raw.responseText.trim(),
    confidence: raw.confidence,
    warnings,
  };
}
