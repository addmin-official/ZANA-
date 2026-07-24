import React from "react";
import { NextBestAction } from "../../../planning/domain/LearningPlanTypes.ts";
import { Sparkles, Clock, CheckCircle2, ArrowRight, Play, RefreshCw, AlertCircle } from "lucide-react";

interface NextBestActionCardProps {
  action: NextBestAction | null;
  onExecuteAction?: (action: NextBestAction) => void;
  isLoading?: boolean;
}

export const NextBestActionCard: React.FC<NextBestActionCardProps> = ({
  action,
  onExecuteAction,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div id="next-best-action-loading" className="p-6 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl animate-pulse">
        <div className="h-4 bg-emerald-800/40 rounded w-1/3 mb-4"></div>
        <div className="h-6 bg-emerald-800/40 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-emerald-800/40 rounded w-1/2"></div>
      </div>
    );
  }

  if (!action) return null;

  const getActionBadgeColor = () => {
    switch (action.actionType) {
      case "REVIEW_MISCONCEPTION":
      case "COMPLETE_PREREQUISITE":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "REST_AND_RESUME":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "TAKE_DIAGNOSTIC":
      case "TAKE_MASTERY_CHECK":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      default:
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    }
  };

  return (
    <div id="next-best-action-card" className="relative overflow-hidden p-6 bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/30 rounded-2xl shadow-xl transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold tracking-wide text-emerald-400 uppercase">
            باشترین هەنگاوی داهاتوو
          </span>
        </div>

        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${getActionBadgeColor()}`}>
          دڵنیایی: {action.confidence === "high" ? "بەرز" : action.confidence === "medium" ? "ناوەند" : "کەم"}
        </span>
      </div>

      <h3 className="text-xl font-bold text-white mb-2 leading-snug">
        {action.titleKu}
      </h3>

      <p className="text-sm text-neutral-300 mb-6 leading-relaxed">
        {action.reasonKu}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-neutral-800">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>کاتی خەمڵێندراو: {action.estimatedDurationMinutes} خولەک</span>
        </div>

        {onExecuteAction && action.actionType !== "REST_AND_RESUME" && (
          <button
            onClick={() => onExecuteAction(action)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
          >
            <span>دەستپێکردن ئێستا</span>
            <Play className="w-4 h-4 fill-current" />
          </button>
        )}
      </div>
    </div>
  );
};
