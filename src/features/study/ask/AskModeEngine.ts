import { StudentProfile } from "../../student/studentTypes.ts";
import { AskContext, AskMessage, SuggestedQuestion } from "./askTypes.ts";

const HISTORY_KEY_PREFIX = "zana:ask-history:";

export function buildAskContext(
  profile: StudentProfile,
  cipSnapshot: any,
  lseSnapshot: any
): AskContext {
  const session = lseSnapshot?.currentSession;
  const currentNodeId = session?.currentNodeId || "12_sci_math_con1";
  
  const availableNodes = cipSnapshot?.resolution?.availableNodes || [];
  const activeNode = availableNodes.find((n: any) => n.id === currentNodeId) || availableNodes[0];
  const activeLesson = availableNodes.find((n: any) => n.id === session?.currentLessonId) || activeNode;
  const activeChapter = availableNodes.find((n: any) => n.id === activeLesson?.parentId) || {
    id: "chapter_fallback",
    title: cipSnapshot?.resolution?.subjectLabel || "بەشی یەکەم"
  };

  return {
    studentId: profile.id,
    studentName: profile.name,
    grade: profile.grade,
    stream: profile.stream,
    subject: profile.activeSubject,
    chapterId: activeChapter?.id,
    chapterTitle: activeChapter?.title,
    lessonId: activeLesson?.id,
    lessonTitle: activeLesson?.title,
    conceptId: activeNode?.id,
    conceptTitle: activeNode?.title,
    level: profile.level,
    sessionId: session?.id || "session_fallback"
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
