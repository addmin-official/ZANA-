import { useRef, useState } from "react";
import {
  Camera,
  Image as ImageIcon,
  UploadCloud,
  FileText,
  Lightbulb,
  Award,
  BookOpen,
  Brain,
  AlertTriangle,
  RotateCcw
} from "lucide-react";
import { useVisionQuestion } from "./useVisionQuestion.ts";
import { VisionStudyContext, VisionRequestMode } from "./visionTypes.ts";
import { VisionImagePreview } from "./VisionImagePreview.tsx";
import { VisionResultPanel } from "./VisionResultPanel.tsx";

interface VisionCapturePanelProps {
  context: VisionStudyContext;
}

export function VisionCapturePanel({ context }: VisionCapturePanelProps) {
  const {
    snapshot,
    selectImage,
    removeImage,
    setSelectedMode,
    updateEditableText,
    submitImage,
    reset,
  } = useVisionQuestion(context);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      selectImage(file, "gallery");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, source: "camera" | "gallery") => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      selectImage(file, source);
    }
  };

  const triggerGallery = () => {
    fileInputRef.current?.click();
  };

  const triggerCamera = () => {
    cameraInputRef.current?.click();
  };

  // Modes config
  const modeOptions = [
    {
      id: "explain" as VisionRequestMode,
      label: "شیکار و ڕوونکردنەوە",
      description: "وەڵامی تەواو و شیکاری چەمکەکە",
      icon: Brain,
      color: "text-blue-500 bg-blue-50 border-blue-100",
      activeColor: "bg-blue-600 text-white border-blue-600",
    },
    {
      id: "step_by_step" as VisionRequestMode,
      label: "هەنگاو بە هەنگاو",
      description: "شیکارکردنی ورد بە هەنگاوی لۆجیکی",
      icon: Award,
      color: "text-purple-500 bg-purple-50 border-purple-100",
      activeColor: "bg-purple-600 text-white border-purple-600",
    },
    {
      id: "hint" as VisionRequestMode,
      label: "سەرەداو و ڕێنمایی",
      description: "تەنها ڕێنمایی بۆ ئەوەی خۆت شیکاری بکەیت",
      icon: Lightbulb,
      color: "text-amber-500 bg-amber-50 border-amber-100",
      activeColor: "bg-amber-600 text-white border-amber-600",
    },
    {
      id: "formula" as VisionRequestMode,
      label: "یاساکان",
      description: "دەرخستنی یاسا و هاوکێشە پەیوەندیدارەکان",
      icon: BookOpen,
      color: "text-indigo-500 bg-indigo-50 border-indigo-100",
      activeColor: "bg-indigo-600 text-white border-indigo-600",
    },
    {
      id: "extract_only" as VisionRequestMode,
      label: "خوێندنەوەی دەق",
      description: "تەنها گۆڕینی وێنەکە بۆ دەقی نووسراو",
      icon: FileText,
      color: "text-emerald-500 bg-emerald-50 border-emerald-100",
      activeColor: "bg-emerald-600 text-white border-emerald-600",
    },
  ];

  // If we have a successful or failed ready state with a result
  if (snapshot.status === "ready" && snapshot.result) {
    return (
      <VisionResultPanel
        snapshot={snapshot}
        result={snapshot.result}
        onEditSubmit={(newText) => {
          updateEditableText(newText);
          submitImage(newText);
        }}
        onReset={reset}
      />
    );
  }

  return (
    <div className="space-y-5 text-right select-none" dir="rtl">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileChange(e, "gallery")}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={(e) => handleFileChange(e, "camera")}
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
      />

      {/* 1. PHOTO CAPTURE STAGE */}
      {!snapshot.image ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-6 text-center space-y-4 transition-all duration-200 ${
            isDragging
              ? "border-blue-500 bg-blue-50/50 scale-[1.01]"
              : "border-slate-200 bg-white hover:bg-slate-50/50"
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
            <UploadCloud className="w-6 h-6 text-slate-400" />
          </div>

          <div className="space-y-1">
            <p className="font-sans text-xs font-bold text-slate-700">پرسیارەکەت بخوێنەرەوە یان باربکە</p>
            <p className="font-sans text-[10px] text-slate-400 leading-normal">
              وێنەیەک لە لایەن، ڕاهێنان یان کتێبی خوێندن بگرە تا زانا بۆت شیکار بکات
            </p>
          </div>

          {/* Trigger controls */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={triggerCamera}
              className="flex items-center justify-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-sans text-xs font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer min-h-[48px]"
              aria-label="گرتنی وێنە بە کامێرا"
            >
              <Camera className="w-4 h-4 text-blue-500 shrink-0" />
              <span>وێنەگرتن</span>
            </button>

            <button
              onClick={triggerGallery}
              className="flex items-center justify-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-sans text-xs font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer min-h-[48px]"
              aria-label="دیاریکردن لە گەلەری"
            >
              <ImageIcon className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>گەلەری</span>
            </button>
          </div>
        </div>
      ) : (
        <VisionImagePreview image={snapshot.image} onClear={removeImage} />
      )}

      {/* 2. MODE SELECTION DASHBOARD (Only show if image is selected and not loading) */}
      {snapshot.image && snapshot.status !== "uploading" && snapshot.status !== "extracting" && (
        <div className="space-y-3 bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
          <h4 className="font-sans font-bold text-xs text-slate-800 border-b border-slate-50 pb-2">
            دیاریکردنی شێوازی شیکار
          </h4>

          <div className="grid grid-cols-1 gap-2">
            {modeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = snapshot.selectedMode === opt.id;

              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedMode(opt.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-right transition-all cursor-pointer ${
                    isSelected
                      ? opt.activeColor + " shadow-xs"
                      : "bg-white border-slate-100 hover:bg-slate-50/50"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-white/20 text-white" : opt.color
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-sans font-bold text-xs leading-tight">{opt.label}</h5>
                    <p
                      className={`font-sans text-[10px] mt-0.5 leading-normal ${
                        isSelected ? "text-white/80" : "text-slate-400"
                      }`}
                    >
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Submit action trigger */}
          <button
            onClick={() => submitImage()}
            disabled={false}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-sans text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[48px] mt-4 shadow-sm"
          >
            <Brain className="w-4 h-4 shrink-0 animate-pulse" />
            <span>ناردنی وێنە بۆ شیکارکردنی زانا</span>
          </button>
        </div>
      )}

      {/* 3. LOADING ENGINE STATE */}
      {(snapshot.status === "uploading" || snapshot.status === "extracting") && (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="space-y-1">
            <p className="font-sans text-xs font-bold text-slate-800">
              {snapshot.status === "uploading"
                ? "خەریکە وێنەکە دەنێردرێت بۆ زانا..."
                : "زانا خەریکە شیکار دەکات و دەقەکە دەخوێنێتەوە..."}
            </p>
            <p className="font-sans text-[10px] text-slate-400">
              تکایە چاوەڕوان بە، ئەم پڕۆسەیە چەند چرکەیەکی پێدەچێت...
            </p>
          </div>
        </div>
      )}

      {/* 4. EXPLICIT ERROR / RETRY SCREEN */}
      {snapshot.status === "failed" && snapshot.error && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <div className="space-y-1.5">
            <p className="font-sans text-sm font-bold text-rose-800">هەڵەیەک لە شیکاردا ڕوویدا</p>
            <p className="font-sans text-xs text-rose-700 leading-relaxed">{snapshot.error}</p>
          </div>

          <div className="flex gap-2.5 justify-center pt-2">
            <button
              onClick={() => submitImage()}
              className="bg-rose-600 hover:bg-rose-700 text-white font-sans text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>دووبارە تاقیکردنەوە</span>
            </button>

            <button
              onClick={reset}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-sans text-xs font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer min-h-[44px]"
            >
              پاشگەزبوونەوە
            </button>
          </div>
        </div>
      )}

      {/* General validation/loading error message */}
      {snapshot.error && snapshot.status !== "failed" && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="font-sans text-[11px] text-rose-800 font-bold leading-normal">{snapshot.error}</p>
        </div>
      )}
    </div>
  );
}
