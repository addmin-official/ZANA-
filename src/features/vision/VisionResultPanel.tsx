import { useState } from "react";
import { AlertCircle, RotateCcw, Send, CheckCircle2, AlertTriangle, Sparkles, HelpCircle } from "lucide-react";
import { VisionQuestionResult, VisionSnapshot } from "./visionTypes.ts";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";

interface VisionResultPanelProps {
  snapshot: VisionSnapshot;
  result: VisionQuestionResult;
  onEditSubmit: (newText: string) => void;
  onReset: () => void;
}

export function VisionResultPanel({
  snapshot,
  result,
  onEditSubmit,
  onReset,
}: VisionResultPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(snapshot.editableText || result.extractedText);

  const handleTextSubmit = () => {
    if (!editedText.trim()) return;
    onEditSubmit(editedText);
    setIsEditing(false);
  };

  const confidenceLabel = {
    low: { text: "نزم (پێویستی بە پێداچوونەوەیە)", color: "text-amber-600 bg-amber-50 border-amber-100" },
    medium: { text: "مامناوەند", color: "text-blue-600 bg-blue-50 border-blue-100" },
    high: { text: "بەرز", color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  }[result.confidence] || { text: "نەزانراو", color: "text-slate-600 bg-slate-50 border-slate-100" };

  const isLowConfidence = result.confidence === "low";

  return (
    <div className="space-y-5 text-right select-none" dir="rtl">
      {/* 1. EXTRACTED QUESTION SECTION */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between w-full border-b border-slate-50 pb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h4 className="font-sans font-bold text-xs text-slate-800">دەقی خوێندراوەی پرسیار</h4>
          </div>
          <span className={`font-sans text-[10px] font-bold px-2 py-0.5 rounded-full border ${confidenceLabel.color}`}>
            دڵنیایی خوێندنەوە: {confidenceLabel.text}
          </span>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full min-h-[100px] p-3 text-right text-xs font-sans border border-blue-200 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 leading-relaxed"
              dir="rtl"
              placeholder="دەقی پرسیارەکە لێرە بنووسە یان ڕاستی بکەرەوە..."
            />
            <div className="flex gap-2">
              <button
                onClick={handleTextSubmit}
                disabled={snapshot.status === "uploading" || snapshot.status === "extracting"}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-sans text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ناردنی دەق بۆ شیکار</span>
              </button>
              <button
                onClick={() => {
                  setEditedText(snapshot.editableText || result.extractedText);
                  setIsEditing(false);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-sans text-xs font-bold py-2 px-3 rounded-xl transition-colors cursor-pointer min-h-[44px]"
              >
                پاشگەزبوونەوە
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {isLowConfidence && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                <p className="font-sans text-[11px] text-amber-800 font-bold leading-relaxed">
                  زانا نەیتوانی دەقەکە بەتەواوی بە دڵنیایی بخوێنێتەوە، تکایە ڕاستی بکەرەوە ئەگەر پێویست دەکات پێش ناردن.
                </p>
              </div>
            )}

            <div className="bg-slate-50/70 border border-slate-100/80 rounded-xl p-3 text-slate-700 text-xs font-sans leading-relaxed text-right whitespace-pre-wrap">
              {snapshot.editableText || result.extractedText || "دەقەکە نەخوێندراوەتەوە."}
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 font-sans text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>دەستکاری یان ڕاستکردنەوە</span>
              </button>

              <button
                onClick={onReset}
                className="border border-slate-200 hover:bg-slate-50 text-slate-500 font-sans text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                aria-label="گرتنی وێنەی نوێ"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>وێنەی نوێ</span>
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Warnings/Subject Discrepancy Notice */}
        {result.warnings.map((warn, index) => (
          <div key={index} className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="font-sans text-[11px] text-rose-800 font-bold leading-relaxed">{warn}</p>
          </div>
        ))}
      </div>

      {/* 2. ZANA'S INTERACTIVE EXPLANATION */}
      {result.responseText && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, delay: 0.1 }}
          className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-slate-50 pb-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-right">
              <h4 className="font-sans font-black text-xs text-slate-900">ڕوونکردنەوەی فێرکاریی زانا</h4>
              <p className="font-sans text-[9px] text-slate-400">بەپێی پڕۆگرامی پەسەندکراوی خوێندن</p>
            </div>
          </div>

          <div className="markdown-body font-sans text-xs text-slate-700 leading-relaxed space-y-3 text-right">
            <ReactMarkdown>{result.responseText}</ReactMarkdown>
          </div>
        </motion.div>
      )}
    </div>
  );
}
