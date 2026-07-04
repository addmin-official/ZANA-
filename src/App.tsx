import { useState } from "react";
import { AppShell } from "./components/AppShell.tsx";
import { OnboardingScreen } from "./screens/OnboardingScreen.tsx";
import { DailySparkScreen } from "./screens/DailySparkScreen.tsx";
import { SubjectsScreen } from "./screens/SubjectsScreen.tsx";
import { StudyWorkspaceScreen } from "./screens/StudyWorkspaceScreen.tsx";
import { AssessmentScreen } from "./screens/AssessmentScreen.tsx";
import { ParentReportScreen } from "./screens/ParentReportScreen.tsx";
import { ProfileScreen } from "./screens/ProfileScreen.tsx";
import { useStudentProfile } from "./features/student/useStudentProfile.ts";
import { SubjectKey } from "./features/student/studentTypes.ts";
import { NavTab } from "./components/BottomNavigation.tsx";

export default function App() {
  const { profile, updateProfile, completeOnboarding, resetProfile } = useStudentProfile();
  
  // Manage active tab, plus optional "assessment" mode
  const [activeTab, setActiveTab] = useState<NavTab>("daily");
  const [isAssessmentMode, setIsAssessmentMode] = useState(false);

  const handleSelectSubject = (subjectId: SubjectKey) => {
    updateProfile({ activeSubject: subjectId });
  };

  const handleStartAssessment = () => {
    setIsAssessmentMode(true);
  };

  const handleFinishAssessment = () => {
    setIsAssessmentMode(false);
    setActiveTab("daily");
  };

  // If student has not gone through onboarding
  if (!profile.onboardingCompleted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-4">
        <OnboardingScreen onComplete={completeOnboarding} />
      </div>
    );
  }

  // Render proper view screen
  const renderScreen = () => {
    if (isAssessmentMode) {
      return (
        <AssessmentScreen
          profile={profile}
          onProfileUpdate={updateProfile}
          onNavigate={(tab) => {
            setIsAssessmentMode(false);
            setActiveTab(tab as NavTab);
          }}
        />
      );
    }

    switch (activeTab) {
      case "daily":
        return (
          <DailySparkScreen
            profile={profile}
            onNavigate={(tab) => {
              setIsAssessmentMode(false);
              setActiveTab(tab as NavTab);
            }}
            onStartAssessment={handleStartAssessment}
          />
        );
      case "subjects":
        return (
          <SubjectsScreen
            profile={profile}
            onSelectSubject={handleSelectSubject}
            onNavigate={(tab) => {
              setIsAssessmentMode(false);
              setActiveTab(tab as NavTab);
            }}
          />
        );
      case "chat":
        return <StudyWorkspaceScreen profile={profile} onNavigate={(tab) => setActiveTab(tab as NavTab)} />;
      case "report":
        return <ParentReportScreen profile={profile} />;
      case "profile":
        return (
          <ProfileScreen
            profile={profile}
            onUpdateProfile={updateProfile}
            onResetAll={resetProfile}
          />
        );
      default:
        return <DailySparkScreen profile={profile} onNavigate={(tab) => setActiveTab(tab as any)} onStartAssessment={handleStartAssessment} />;
    }
  };

  return (
    <AppShell
      profile={profile}
      activeTab={isAssessmentMode ? ("daily" as NavTab) : activeTab} // Keep highlight appropriate
      onTabChange={(tab) => {
        setIsAssessmentMode(false);
        setActiveTab(tab);
      }}
    >
      {renderScreen()}
    </AppShell>
  );
}
