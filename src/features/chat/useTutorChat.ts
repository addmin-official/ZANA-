import { useState, useEffect } from "react";
import { ChatMessage, ZanaStorage, StudentProfile } from "../../services/storage.ts";
import { sendChatMessageToZana } from "./tutorApi.ts";

export interface AcademicContextPayload {
  lessonTitle?: string;
  conceptTitle?: string;
  curriculumId?: string;
}

export function useTutorChat(profile: StudentProfile, academicContext?: AcademicContextPayload) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (profile.onboardingCompleted && profile.activeSubject) {
      void (async () => {
        await Promise.resolve();
        if (!active) return;
        const saved = ZanaStorage.getChatMessages(profile.activeSubject);
        
        // If there are no messages, insert a warm educational welcome greeting from Zana grounded in Kurdish curriculum
        if (saved.length === 0) {
          const subjectKu =
            profile.activeSubject === "math"
              ? "بیرکاری"
              : profile.activeSubject === "physics"
              ? "فیزیا"
              : profile.activeSubject === "chemistry"
              ? "کیمیا"
              : "ئینگلیزی";

          const lessonContextText = academicContext?.lessonTitle
            ? `\n\n📌 **تەوەری چالاکی ئەمڕۆمان:** ${academicContext.lessonTitle}${academicContext.conceptTitle ? ` (${academicContext.conceptTitle})` : ""}`
            : "";

          const welcomeMessage: ChatMessage = {
            id: "welcome",
            sender: "zana",
            text: `بەخێربێیت قوتابی خۆشەویست **${profile.name}**! من مامۆستا **زانا**م. 
خۆشحاڵم کە ئەمڕۆ بەیەکەوە پڕۆگرامی **${subjectKu}**ی پۆلی **${profile.grade}**ی پڕۆگرامی خوێندنی فەرمی دەخوێنین.${lessonContextText}

ئاستی فێربوونت دانراوە وەک ئاستی **${profile.level}**. وەک ڕێبەری فێرکاریت، بە شێوازی سوقراتی و پرسیار و ڕاهێنان چەمکەکانت بۆ شی دەکەمەوە تا بە تەواوی لێی تێبگەیت.

ئامادەی دەستپێ بکەین؟ پرسیارەکەت بنووسە یان داوای ڕاهێنان بکە.`,
            timestamp: new Date().toLocaleTimeString("ku-IQ", { hour: "2-digit", minute: "2-digit" }),
            isEducational: true
          };
          ZanaStorage.saveChatMessages(profile.activeSubject, [welcomeMessage]);
          setMessages([welcomeMessage]);
        } else {
          setMessages(saved);
        }
        setError(null);
      })();
    }
    return () => {
      active = false;
    };
  }, [profile.activeSubject, profile.grade, profile.name, profile.level, profile.onboardingCompleted, academicContext?.lessonTitle, academicContext?.conceptTitle]);

  const sendMessage = async (text: string, overrideContext?: AcademicContextPayload) => {
    if (!text.trim()) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString("ku-IQ", { hour: "2-digit", minute: "2-digit" })
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    ZanaStorage.saveChatMessages(profile.activeSubject, updatedMessages);
    
    // Increment study metrics
    ZanaStorage.incrementQuestions(1);

    setLoading(true);
    try {
      const activeCtx = overrideContext || academicContext;
      const response = await sendChatMessageToZana(text, messages, profile, activeCtx);
      
      const zanaMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        sender: "zana",
        text: response.text,
        timestamp: new Date().toLocaleTimeString("ku-IQ", { hour: "2-digit", minute: "2-digit" }),
        isEducational: response.isEducational
      };

      const finalMessages = [...updatedMessages, zanaMsg];
      setMessages(finalMessages);
      ZanaStorage.saveChatMessages(profile.activeSubject, finalMessages);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "کێشەیەک لە پەیوەندیکردن بە سێرڤەر ڕوویدا.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    ZanaStorage.clearChatMessages(profile.activeSubject);
    setMessages([]);
    setError(null);
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearChat
  };
}

