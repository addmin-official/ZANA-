import { useEffect, useRef, useState } from "react";
import { StudentProfile } from "../services/storage.ts";
import { useTutorChat } from "../features/chat/useTutorChat.ts";
import { ChatMessage } from "../features/chat/ChatMessage.tsx";
import { ChatInput } from "../features/chat/ChatInput.tsx";
import { LoadingDots } from "../components/LoadingDots.tsx";
import { ErrorCard } from "../components/ErrorCard.tsx";
import { Trash2, AlertCircle, RefreshCw, X } from "lucide-react";

interface StudyChatScreenProps {
  profile: StudentProfile;
}

export function StudyChatScreen({ profile }: StudyChatScreenProps) {
  const { messages, loading, error, sendMessage, clearChat } = useTutorChat(profile);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the chat list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleClearConfirm = () => {
    clearChat();
    setShowConfirmClear(false);
  };

  const activeSubjectName =
    profile.subject === "math"
      ? "بیرکاری"
      : profile.subject === "physics"
      ? "فیزیا"
      : profile.subject === "chemistry"
      ? "کیمیا"
      : "ئینگلیزی";

  return (
    <div className="flex-1 flex flex-col justify-start relative -mx-4 -mt-4 bg-slate-50 min-h-[calc(100vh-140px)]">
      {/* Mini Subject Ribbon */}
      <div className="bg-white border-b border-slate-100 px-4 py-2.5 sticky top-[65px] z-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
          <p className="font-sans text-xs font-bold text-slate-700">
            گفتوگۆی {activeSubjectName} • پۆلی {profile.grade}
          </p>
        </div>
        
        {messages.length > 1 && (
          <button
            onClick={() => setShowConfirmClear(true)}
            className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 cursor-pointer font-sans bg-red-50 hover:bg-red-100/60 rounded-lg px-2 py-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>پاککردنەوە</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 pt-2 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id}>
            <ChatMessage message={msg} />
          </div>
        ))}

        {/* ZANA Typing State */}
        {loading && (
          <div className="flex gap-3 my-4 max-w-full">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <span className="font-sans font-bold text-xs">ز</span>
            </div>
            <div className="flex flex-col max-w-[82%]">
              <div className="flex items-center gap-2 mb-1 text-[10px] text-slate-400 font-sans">
                <span className="font-bold text-slate-600">مامۆستا زانا</span>
                <span className="text-[9px]">دەنوسێت...</span>
              </div>
              <div className="px-4 py-2.5 rounded-2xl border border-slate-100 bg-white text-slate-800 rounded-tr-none shadow-xs">
                <LoadingDots />
              </div>
            </div>
          </div>
        )}

        {/* Inline Error alert inside Chat */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-right my-3 text-red-700 text-xs font-sans leading-relaxed">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Floating Keyboard/Input panel */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        <ChatInput onSendMessage={sendMessage} disabled={loading} />
      </div>

      {/* Confirmation Dialog Overlay */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xs w-full p-6 text-right border border-slate-100 shadow-xl space-y-4">
            <h4 className="font-sans font-bold text-base text-slate-900">
              دڵنیایت لە پاککردنەوە؟
            </h4>
            <p className="font-sans text-xs text-slate-500 leading-relaxed">
              تەواوی مێژووی ئەم گفتوگۆیە لادەبرێت و ناتوانیت بیگەڕێنیتەوە.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-sans font-bold cursor-pointer transition-colors"
              >
                پەشیمانبوونەوە
              </button>
              <button
                onClick={handleClearConfirm}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-sans font-bold cursor-pointer transition-colors"
              >
                بەڵێ، پاکیبکەرەوە
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
