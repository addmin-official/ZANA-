import { SuggestedQuestion } from "./askTypes.ts";
import { ChevronLeft } from "lucide-react";

interface SuggestedQuestionsProps {
  questions: SuggestedQuestion[];
  onSelect: (question: SuggestedQuestion) => void;
  disabled?: boolean;
}

export function SuggestedQuestions({ questions, onSelect, disabled }: SuggestedQuestionsProps) {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="font-sans text-xs font-semibold text-slate-500 text-right pr-1">
        پرسیارە پێشنیارکراوەکان بۆ ئەم وانەیە:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {questions.map((q) => (
          <button
            key={q.id}
            onClick={() => !disabled && onSelect(q)}
            disabled={disabled}
            className={`w-full p-3 text-right font-sans text-xs text-slate-700 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl flex items-center justify-between gap-2.5 transition-all min-h-[48px] ${
              disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-[0.98]"
            }`}
          >
            <span className="leading-relaxed font-medium">{q.text}</span>
            <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0 transform rotate-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
