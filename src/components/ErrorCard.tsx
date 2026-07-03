import { AlertTriangle, RefreshCw } from "lucide-react";
import { ZanaButton } from "./ZanaButton.tsx";

interface ErrorCardProps {
  message: string;
  onRetry?: () => void;
  retryText?: string;
}

export function ErrorCard({
  message,
  onRetry,
  retryText = "دووبارە هەوڵبدەرەوە"
}: ErrorCardProps) {
  return (
    <div className="p-6 bg-red-50/50 border border-red-100 rounded-2xl max-w-md mx-auto my-6 text-center shadow-xs">
      <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h4 className="font-sans font-bold text-base text-red-800 mb-2">
        کێشەیەک ڕوویدا
      </h4>
      <p className="font-sans text-sm text-red-600 mb-6 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <ZanaButton variant="destructive" onClick={onRetry} className="mx-auto flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          <span>{retryText}</span>
        </ZanaButton>
      )}
    </div>
  );
}
