export function LoadingDots({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-1 py-2 ${className}`}>
      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"></span>
    </div>
  );
}
