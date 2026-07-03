import { useState, FormEvent, useRef, useEffect } from "react";
import { Send, AlertCircle } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = "پرسیارەکەت لێرە بنووسە..."
}: ChatInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSendMessage(text.trim());
      setText("");
    }
  };

  useEffect(() => {
    // Focus the input when disabled changes to false
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-slate-100 bg-white p-3 flex gap-2 items-center"
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 font-sans text-sm min-h-[48px] px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all text-right"
        style={{ direction: "rtl" }}
      />
      
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="w-12 h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-xl flex items-center justify-center cursor-pointer transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="ناردنی نامە"
      >
        <Send className="w-5 h-5 flip-rtl" />
      </button>
    </form>
  );
}
