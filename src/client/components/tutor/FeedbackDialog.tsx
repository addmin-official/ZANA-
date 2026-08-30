import React, { useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { submitStudentFeedback } from '../../api/feedbackService.ts';

interface Props {
  topicId: string;
  grade: number;
  subject: string;
  onClose: () => void;
}

export const FeedbackDialog: React.FC<Props> = ({ topicId, grade, subject, onClose }) => {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (issueType: string) => {
    try {
      setSubmitting(true);
      await submitStudentFeedback({
        topicId,
        grade,
        subject,
        issueType,
      });
      setSuccess(true);
      setTimeout(onClose, 2000);
    } catch (error) {
      console.error(error);
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3 text-emerald-700" dir="rtl">
        <CheckCircle className="w-5 h-5" />
        <span className="font-medium">سوپاس بۆ سەرنجەکەت. تۆمارکرا.</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm" dir="rtl">
      <div className="flex items-center gap-2 mb-4 text-slate-800">
        <AlertCircle className="w-5 h-5 text-amber-500" />
        <h3 className="font-bold">کێشەیەک هەیە لەم وەڵامەدا؟</h3>
      </div>
      <div className="flex flex-col gap-2">
        <button
          disabled={submitting}
          onClick={() => handleSubmit('AI_INACCURATE')}
          className="text-right px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm text-slate-700 transition-colors"
        >
          زانیارییەکە هەڵەیە
        </button>
        <button
          disabled={submitting}
          onClick={() => handleSubmit('CONFUSING_EXPLANATION')}
          className="text-right px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm text-slate-700 transition-colors"
        >
          ڕوونکردنەوەکە ئاڵۆزە
        </button>
        <button
          disabled={submitting}
          onClick={() => handleSubmit('TECHNICAL_ERROR')}
          className="text-right px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm text-slate-700 transition-colors"
        >
          کێشەی تەلەفۆن / تەکنیکی
        </button>
      </div>
    </div>
  );
};
