import { StudentProfile } from "../services/storage.ts";
import { AssessmentIntelligencePanel } from "../features/assessment/intelligence/AssessmentIntelligencePanel.tsx";

interface AssessmentScreenProps {
  profile: StudentProfile;
  onProfileUpdate: (profile: Partial<StudentProfile>) => void;
  onNavigate: (tab: string) => void;
}

/**
 * AssessmentScreen: Acts as the primary viewport wrapper
 * hosting the Assessment Intelligence Platform (AIP) panel.
 */
export function AssessmentScreen({
  profile,
  onProfileUpdate,
  onNavigate,
}: AssessmentScreenProps) {
  return (
    <div className="w-full h-full flex flex-col justify-start">
      <AssessmentIntelligencePanel
        studentProfile={profile}
        onProfileUpdate={onProfileUpdate}
        onNavigate={onNavigate}
      />
    </div>
  );
}
