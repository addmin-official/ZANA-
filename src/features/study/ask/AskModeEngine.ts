import { StudentProfile } from "../../student/studentTypes.ts";
import { AskContext, AskMessage, SuggestedQuestion } from "./askTypes.ts";

const HISTORY_KEY_PREFIX = "zana:ask-history:";

export function buildAskContext(
  profile: StudentProfile,
  cipSnapshot: unknown,
  lseSnapshot: unknown
): AskContext {
  const cip = cipSnapshot as Record<string, unknown> | null | undefined;
  const lse = lseSnapshot as Record<string, unknown> | null | undefined;
  const currentSession = lse?.currentSession as Record<string, unknown> | null | undefined;
  const currentNodeId = (currentSession?.currentNodeId as string) || "12_sci_math_con1";
  
  const resolution = cip?.resolution as Record<string, unknown> | null | undefined;
  const availableNodes = (resolution?.availableNodes as Array<Record<string, unknown>>) || [];
  const activeNode = availableNodes.find((n) => n.id === currentNodeId) || availableNodes[0];
  const activeLesson = availableNodes.find((n) => n.id === currentSession?.currentLessonId) || activeNode;
  const activeChapter = availableNodes.find((n) => n.id === activeLesson?.parentId) || {
    id: "chapter_fallback",
    title: (resolution?.subjectLabel as string) || "بەشی یەکەم"
  };

  return {
    studentId: profile.id,
    studentName: profile.name,
    grade: profile.grade,
    stream: profile.stream,
    subject: profile.activeSubject,
    chapterId: typeof activeChapter?.id === "string" ? activeChapter.id : undefined,
    chapterTitle: typeof activeChapter?.title === "string" ? activeChapter.title : undefined,
    lessonId: typeof activeLesson?.id === "string" ? activeLesson.id : undefined,
    lessonTitle: typeof activeLesson?.title === "string" ? activeLesson.title : undefined,
    conceptId: typeof activeNode?.id === "string" ? activeNode.id : undefined,
    conceptTitle: typeof activeNode?.title === "string" ? activeNode.title : undefined,
    level: profile.level,
    sessionId: typeof currentSession?.id === "string" ? currentSession.id : "session_fallback"
  };
}

export function generateSuggestedQuestions(
  conceptTitle: string,
  lessonTitle: string
): SuggestedQuestion[] {
  const cleanConcept = conceptTitle || "چەمکی خوێندن";
  const cleanLesson = lessonTitle || "وانەی ئێستا";
  return [
    {
      id: "sq_1",
      text: `ئەم چەمکە ("${cleanConcept}") بە شێوەیەکی سادەتر ڕوون بکەرەوە.`,
      category: "clarification"
    },
    {
      id: "sq_2",
      text: `سەبارەت بە "${cleanConcept}" لە وانەی "${cleanLesson}" نموونەیەکی کورت و ئاسانم بۆ بهێنەوە.`,
      category: "example"
    },
    {
      id: "sq_3",
      text: `زۆرترین هەڵەی قوتابیان لە کاتی حەلکردنی پرسیارەکانی "${cleanConcept}" چییە؟`,
      category: "common_mistake"
    },
    {
      id: "sq_4",
      text: `یاسا یان فۆرمۆڵە سەرەکییەکانی پەیوەست بە "${cleanConcept}" لە کوێ بەکار دێن؟`,
      category: "formula"
    },
    {
      id: "sq_5",
      text: `ڕێنمایی یان هەنگاوی داهاتووم بۆ باشتر تێگەیشتن لە "${cleanConcept}" چییە؟`,
      category: "next_step"
    }
  ];
}

export function getSessionHistory(sessionId: string): AskMessage[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const key = `${HISTORY_KEY_PREFIX}${sessionId}`;
    const stored = window.localStorage.getItem(key);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed.slice(-20); // enforce maximum of 20 messages
    }
  } catch (error) {
    console.error("Error reading Ask Mode history from localStorage:", error);
  }
  return [];
}

export function saveSessionHistory(sessionId: string, messages: AskMessage[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const key = `${HISTORY_KEY_PREFIX}${sessionId}`;
    const truncated = messages.slice(-20); // enforce maximum of 20 messages
    window.localStorage.setItem(key, JSON.stringify(truncated));
  } catch (error) {
    console.error("Error saving Ask Mode history to localStorage:", error);
  }
}

export function clearSessionHistory(sessionId: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const key = `${HISTORY_KEY_PREFIX}${sessionId}`;
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error("Error clearing Ask Mode history from localStorage:", error);
  }
}
