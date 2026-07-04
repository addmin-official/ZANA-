import { useState, useRef, useEffect, FormEvent } from "react";
import { StudentProfile } from "../../student/studentTypes.ts";
import { useAskMode } from "./useAskMode.ts";
import { SuggestedQuestions } from "./SuggestedQuestions.tsx";
import { Send, AlertCircle, RefreshCw, Trash2, HelpCircle, Sparkles } from "lucide-react";

interface AskPanelProps {
  studentProfile: StudentProfile;
  curriculumSnapshot: any;
  sessionSnapshot: any;
}

export function AskPanel({ studentProfile, curriculumSnapshot, sessionSnapshot }: AskPanelProps) {
  const {
    snapshot,
    sendQuestion,
    retryMessage,
    clearSessionHistory,
    selectSuggestedQuestion,
    isSending
  } = useAskMode(studentProfile, curriculumSnapshot, sessionSnapshot);

  const { context, messages, suggestedQuestions, error } = snapshot;

  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive or thinking state starts
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    setInput("");
    await sendQuestion(trimmed);
  };

  const activeConcept = context.conceptTitle || "چەمکی خوێندن";
  const activeLesson = context.lessonTitle || "وانەی ئێستا";

  return (
    <div className="flex flex-col h-full space-y-4 text-right" dir="rtl">
      {/* 1. Context Information Header */}
      <div className="bg-blue-50/40 border border-blue-100/60 rounded-2xl p-3.5 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-blue-800">
            <Sparkles className="w-4 h-4 shrink-0" />
            <h4 className="font-sans text-xs font-bold">زانا • پرسیار و وەڵام</h4>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearSessionHistory}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
              title="پاککردنەوەی گفتوگۆی ئێستا"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>پاککردنەوە</span>
            </button>
          )}
        </div>
        <p className="font-sans text-[11px] text-slate-500 leading-relaxed">
          پرسیار لەسەر چەمکی <span className="font-semibold text-slate-800 font-sans">“{activeConcept}”</span> بکە لە وانەی <span className="text-slate-700 font-sans">“{activeLesson}”</span>. زانا تەنها وەڵامی پەیوەندیدار بەم وانەیە دەداتەوە.
        </p>
      </div>

      {/* 2. Messages List Area */}
      <div className="flex-1 overflow-y-auto max-h-[350px] min-h-[180px] border border-slate-100/80 rounded-2xl bg-slate-50/20 p-3 space-y-3.5 scrollbar-thin">
        {messages.length === 0 ? (
          /* Empty state: show welcoming guidance and suggested questions */
          <div className="h-full flex flex-col justify-center items-center py-6 px-4 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5 max-w-sm">
              <h5 className="font-sans text-xs font-bold text-slate-800">هیچ پرسیارێک نەنێردراوە</h5>
              <p className="font-sans text-[11px] text-slate-500 leading-relaxed">
                هەر پرسیارێک یان ناڕوونییەکت هەیە لەسەر ئەم بابەتە بنووسە بۆ ئەوەی مامۆستای زیرەک زانا بە فەرمی و بە زمانی شیرینی کوردی سۆرانی هاوکاریت بکات.
              </p>
            </div>

            <div className="w-full pt-2">
              <SuggestedQuestions
                questions={suggestedQuestions}
                onSelect={selectSuggestedQuestion}
                disabled={isSending}
              />
            </div>
          </div>
        ) : (
          /* Message bubbles */
          <div className="space-y-3.5">
            {messages.map((msg) => {
              const isUser = msg.role === "student";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-start" : "items-end"}`}
                >
                  <div className="flex items-end gap-1.5 max-w-[85%]">
                    <div
                      className={`p-3 rounded-2xl text-xs font-sans leading-relaxed text-right ${
                        isUser
                          ? "bg-blue-600 text-white rounded-tr-none shadow-sm shadow-blue-100"
                          : "bg-white border border-slate-100 text-slate-800 rounded-tl-none shadow-sm shadow-slate-50/50"
                      }`}
                    >
                      {msg.text}
                    </div>

                    {/* Status & Retry indicator for user message */}
                    {isUser && msg.status === "failed" && (
                      <button
                        onClick={() => retryMessage(msg.id)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors shrink-0 cursor-pointer"
                        title="دووبارە بنێرەوە"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
                      </button>
                    )}
                  </div>

                  {/* Status indicators */}
                  <span className="font-sans text-[9px] text-slate-400 mt-1 px-1">
                    {isUser ? (
                      msg.status === "sending" ? (
                        "لە کاتی ناردندایە..."
                      ) : msg.status === "failed" ? (
                        <span className="text-red-500 flex items-center gap-0.5">
                          <AlertCircle className="w-3 h-3" />
                          ناردن سەرکەوتوو نەبوو. کلیك لە تەنیشت بکە بۆ دووبارەکردنەوە.
                        </span>
                      ) : (
                        "نێردرا"
                      )
                    ) : (
                      "مامۆستا زانا"
                    )}
                  </span>
                </div>
              );
            })}

            {/* Thinking / Sending indicator */}
            {isSending && (
              <div className="flex flex-col items-end">
                <div className="bg-slate-50 border border-slate-100 text-slate-500 px-4 py-2.5 rounded-2xl rounded-tl-none text-xs font-sans italic flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-75"></span>
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-150"></span>
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-300"></span>
                  </div>
                  <span>زانا خەریکە بیر دەکاتەوە...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* 3. Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2.5 text-red-700 font-sans text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* 4. Small Suggested Questions Row if history has messages */}
      {messages.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-sans text-[10px] text-slate-400">دەتوانیت بپرسیت:</p>
          <div className="flex flex-wrap gap-1.5 justify-start">
            {suggestedQuestions.map((q) => (
              <button
                key={q.id}
                onClick={() => !isSending && selectSuggestedQuestion(q)}
                disabled={isSending}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-100 hover:bg-slate-100/80 hover:border-slate-200 text-[10px] font-sans text-slate-600 rounded-lg text-right transition-all cursor-pointer truncate max-w-[200px]"
              >
                {q.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. Custom Composer Box */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isSending}
          placeholder="لێرە هەر پرسیارێکی زانستیت هەیە بنووسە..."
          className="flex-1 px-3.5 py-2.5 border border-slate-200 bg-white focus:bg-slate-50/10 rounded-xl font-sans text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-right min-h-[44px]"
        />
        <button
          type="submit"
          disabled={!input.trim() || isSending}
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
            !input.trim() || isSending
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer hover:scale-[1.02]"
          }`}
        >
          <Send className="w-4 h-4 rotate-180" />
        </button>
      </form>
    </div>
  );
}
