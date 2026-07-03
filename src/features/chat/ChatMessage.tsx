import { ReactNode } from "react";
import { ChatMessage as MessageType } from "../../services/storage.ts";
import { GraduationCap, User } from "lucide-react";

interface ChatMessageProps {
  message: MessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isZana = message.sender === "zana";

  // Light-weight custom renderer for markdown-like syntax (**bold**, newlines)
  const formatText = (text: string) => {
    return text.split("\n").map((line, lineIdx) => {
      let content: ReactNode = line;

      // Check for bullet lists
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const itemText = line.trim().substring(2);
        content = (
          <li className="list-disc list-inside mr-2 mt-1 font-sans text-slate-700">
            {parseBold(itemText)}
          </li>
        );
      } else if (/^\d+\.\s/.test(line.trim())) {
        // Numbered lists
        const match = line.trim().match(/^(\d+)\.\s(.*)/);
        if (match) {
          content = (
            <div className="flex gap-2 mt-1 mr-1 font-sans text-slate-700">
              <span className="font-bold text-blue-600 font-mono">{match[1]}.</span>
              <span>{parseBold(match[2])}</span>
            </div>
          );
        }
      } else {
        content = parseBold(line);
      }

      return (
        <div key={lineIdx} className={line.trim() === "" ? "h-3" : "min-h-[1.25rem] font-sans leading-relaxed text-slate-800"}>
          {content}
        </div>
      );
    });
  };

  const parseBold = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-bold text-slate-900">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div
      className={`flex gap-3 my-4 max-w-full ${
        isZana ? "flex-row" : "flex-row-reverse"
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
          isZana ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
        }`}
      >
        {isZana ? (
          <GraduationCap className="w-5 h-5" />
        ) : (
          <User className="w-5 h-5" />
        )}
      </div>

      {/* Bubble Container */}
      <div className="flex flex-col max-w-[82%]">
        {/* Sender Name & Time */}
        <div
          className={`flex items-center gap-2 mb-1 text-[10px] text-slate-400 font-sans ${
            isZana ? "justify-start" : "justify-end"
          }`}
        >
          <span className="font-bold text-slate-600">
            {isZana ? "زانا (مامۆستا)" : "تۆ"}
          </span>
          <span>{message.timestamp}</span>
        </div>

        {/* Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl text-sm border shadow-xs ${
            isZana
              ? "bg-white border-slate-100 text-slate-800 rounded-tr-none"
              : "bg-blue-600 border-blue-600 text-white rounded-tl-none"
          }`}
          style={{ direction: "rtl" }}
        >
          <div className="space-y-1 text-right break-words">
            {formatText(message.text)}
          </div>
        </div>
      </div>
    </div>
  );
}
