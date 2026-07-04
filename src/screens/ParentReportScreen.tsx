import { useParentIntelligenceReport } from "../features/parentReport/useParentIntelligenceReport.ts";
import { ParentIntelligenceReportPanel } from "../features/parentReport/ParentIntelligenceReportPanel.tsx";
import { StudentProfile } from "../services/storage.ts";
import { ZanaCard } from "../components/ZanaCard.tsx";
import { ZanaButton } from "../components/ZanaButton.tsx";
import { RefreshCw, AlertCircle, Loader2 } from "lucide-react";

interface ParentReportScreenProps {
  profile: StudentProfile;
}

export function ParentReportScreen({ profile }: ParentReportScreenProps) {
  const { snapshot, loading, error, generateReport, printReport } = useParentIntelligenceReport(profile);

  if (loading && !snapshot) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <h3 className="font-sans font-bold text-lg text-slate-800">ڕاپۆرتی زیرەکی زانا</h3>
        <p className="font-sans text-sm text-slate-400 max-w-xs leading-relaxed">
          مامۆستا زانا سەرقاڵی شیکردنەوەی سەرجەم گفتوگۆ، نمرەکان و هەڵسەنگاندنەکانی {profile.name}یە بۆ نووسینی ڕاپۆرتی پێشکەوتووی دایک و باوکان...
        </p>
      </div>
    );
  }

  if (error && !snapshot) {
    return (
      <div className="flex-1 flex flex-col justify-center py-10">
        <ZanaCard className="max-w-sm mx-auto p-6 text-center border-red-100 shadow-sm">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="font-sans text-sm text-slate-600 leading-relaxed mb-6">
            {error}
          </p>
          <ZanaButton variant="destructive" onClick={() => generateReport()} className="mx-auto cursor-pointer">
            <RefreshCw className="w-4 h-4 mr-2" />
            <span>دووبارە هەوڵبدەرەوە</span>
          </ZanaButton>
        </ZanaCard>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <h3 className="font-sans font-bold text-lg text-slate-800">ئامادەکردنی ڕاپۆرت</h3>
        <p className="font-sans text-sm text-slate-400 max-w-xs leading-relaxed">
          تکایە چاوەڕێ بکە تاوەکو زانیارییەکانی قوتابی و مێژووی خوێندن شی دەکرێتەوە...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-start">
      <ParentIntelligenceReportPanel
        snapshot={snapshot}
        loading={loading}
        onRefresh={generateReport}
        onPrint={printReport}
      />
    </div>
  );
}
