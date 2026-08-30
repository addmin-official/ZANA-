import React from 'react';
import { Play, RotateCcw, BookOpen, CheckCircle } from 'lucide-react';
import type { NextBestAction } from '../../api/studyService.ts';

interface NextBestActionCardProps {
  action: NextBestAction;
  onActionClick: (topicId: string) => void;
}

export const NextBestActionCard: React.FC<NextBestActionCardProps> = ({ action, onActionClick }) => {
  const getIcon = () => {
    switch (action.actionType) {
      case 'LEARN':
        return <BookOpen className="w-6 h-6 text-indigo-600" />;
      case 'PRACTICE':
        return <Play className="w-6 h-6 text-green-600" />;
      case 'REVIEW':
        return <RotateCcw className="w-6 h-6 text-amber-600" />;
      case 'COURSE_COMPLETE':
        return <CheckCircle className="w-6 h-6 text-emerald-600" />;
      default:
        return <BookOpen className="w-6 h-6 text-indigo-600" />;
    }
  };

  const getButtonText = () => {
    switch (action.actionType) {
      case 'LEARN':
        return 'دەستپێکردن'; // Start
      case 'PRACTICE':
        return 'مەشقکردن'; // Practice
      case 'REVIEW':
        return 'پێداچوونەوە'; // Review
      case 'COURSE_COMPLETE':
        return 'تەواو'; // Done
      default:
        return 'دەستپێکردن';
    }
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full"
      dir="rtl"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 bg-slate-50 rounded-xl">{getIcon()}</div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{action.topicTitle || 'ڕێڕەوی فێربوون'}</h3>
          <p className="text-sm text-slate-500 mt-1">{action.rationale}</p>
        </div>
      </div>

      {action.actionType !== 'COURSE_COMPLETE' && (
        <button
          onClick={() => onActionClick(action.topicId)}
          className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors w-full sm:w-auto shadow-sm cursor-pointer"
        >
          {getButtonText()}
        </button>
      )}
    </div>
  );
};
