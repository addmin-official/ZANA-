import { X, Camera, Image as ImageIcon } from "lucide-react";
import { VisionImageInput } from "./visionTypes.ts";

interface VisionImagePreviewProps {
  image: VisionImageInput;
  onClear: () => void;
}

export function VisionImagePreview({ image, onClear }: VisionImagePreviewProps) {
  // Human readable file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="relative bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col items-center justify-center overflow-hidden">
      {/* Top spec banner */}
      <div className="w-full flex items-center justify-between mb-2 pb-2 border-b border-slate-200/50 text-[10px] font-sans text-slate-400">
        <div className="flex items-center gap-1">
          {image.source === "camera" ? (
            <Camera className="w-3.5 h-3.5 text-blue-500" />
          ) : (
            <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
          )}
          <span>{image.source === "camera" ? "کامێرا" : "گەلەری"}</span>
        </div>
        <span>{formatSize(image.sizeBytes)}</span>
      </div>

      {/* Image body */}
      <div className="relative w-full max-h-[220px] rounded-xl overflow-hidden flex items-center justify-center bg-black/5">
        <img
          src={image.previewUrl}
          alt="پێشبینی وێنەی پرسیار"
          className="max-w-full max-h-[220px] object-contain rounded-xl select-none"
          referrerPolicy="no-referrer"
        />

        {/* Clear Button */}
        <button
          onClick={onClear}
          aria-label="سڕینەوەی وێنە"
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 transition-colors focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Privacy Notice */}
      <p className="font-sans text-[10px] text-slate-400 text-center mt-2 leading-relaxed">
        وێنەکە تەنها بۆ خوێندنەوە و ڕوونکردنەوەی پرسیارەکە بەکاردێت و لە ئامێرەکەتدا هەڵناگیرێت.
      </p>
    </div>
  );
}
