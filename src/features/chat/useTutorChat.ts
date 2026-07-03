import { useState, useEffect } from "react";
import { ChatMessage, ZanaStorage, StudentProfile } from "../../services/storage.ts";
import { sendChatMessageToZana } from "./tutorApi.ts";

export function useTutorChat(profile: StudentProfile) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load chat messages whenever profile's current subject changes
  useEffect(() => {
    if (profile.onboarded && profile.subject) {
      const saved = ZanaStorage.getChatMessages(profile.subject);
      
      // If there are no messages, insert a warm educational welcome greeting from Zana
      if (saved.length === 0) {
        const welcomeMessage: ChatMessage = {
          id: "welcome",
          sender: "zana",
          text: `بەخێربێیت قوتابی خۆشەویست **${profile.name}**! من مامۆستا **زانا**م. 
خۆشحاڵم کە ئەمڕۆ بەیەکەوە پڕۆگرامی **${
            profile.subject === "math"
              ? "بیرکاری"
              : profile.subject === "physics"
              ? "فیزیا"
              : profile.subject === "chemistry"
              ? "کیمیا"
              : "ئینگلیزی"
          }**ی پۆلی **${profile.grade}** دەخوێنین.

ئاستی خوێندنی تۆم بۆ دیاریکراوە وەک ئاستی **${profile.level}**. هەر چەمک، هاوکێشە یان یاسایەک هەیە کە لێی تێناگەیت، تەنها لێم بپرسە؛ هەنگاو بە هەنگاو و بە نموونەوە شیکاری دەکەین. 

ئامادەی دەستپێ بکەین؟ پرسیارەکەت بنووسە.`,
          timestamp: new Date().toLocaleTimeString("ku-IQ", { hour: "2-digit", minute: "2-digit" }),
          isEducational: true
        };
        ZanaStorage.saveChatMessages(profile.subject, [welcomeMessage]);
        setMessages([welcomeMessage]);
      } else {
        setMessages(saved);
      }
      setError(null);
    }
  }, [profile.subject, profile.grade, profile.name, profile.level, profile.onboarded]);

  const sendMessage = async (text: string) => {
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
    ZanaStorage.saveChatMessages(profile.subject, updatedMessages);
    
    // Increment study metrics
    ZanaStorage.incrementQuestions(1);

    setLoading(true);
    try {
      const response = await sendChatMessageToZana(text, messages, profile);
      
      const zanaMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        sender: "zana",
        text: response.text,
        timestamp: new Date().toLocaleTimeString("ku-IQ", { hour: "2-digit", minute: "2-digit" }),
        isEducational: response.isEducational
      };

      const finalMessages = [...updatedMessages, zanaMsg];
      setMessages(finalMessages);
      ZanaStorage.saveChatMessages(profile.subject, finalMessages);
    } catch (err: any) {
      setError(err.message || "کێشەیەک لە پەیوەندیکردن بە سێرڤەر ڕوویدا.");
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    ZanaStorage.clearChatMessages(profile.subject);
    setMessages([]);
    // Force re-trigger of initial welcome greeting
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
