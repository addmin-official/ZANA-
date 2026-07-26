import { useState } from "react";
import { AppShell } from "./components/AppShell.tsx";
import { NavTab } from "./components/BottomNavigation.tsx";
import { StudentStudyPathDashboard } from "./features/student/planning/StudentStudyPathDashboard.tsx";
import { SubjectKey } from "./features/student/studentTypes.ts";
import { useStudentProfile } from "./features/student/useStudentProfile.ts";
import { AssessmentScreen } from "./screens/AssessmentScreen.tsx";
import { DailySparkScreen } from "./screens/DailySparkScreen.tsx";
import { OnboardingScreen } from "./screens/OnboardingScreen.tsx";
import { ParentReportScreen } from "./screens/ParentReportScreen.tsx";
import { ProfileScreen } from "./screens/ProfileScreen.tsx";
import { StudyWorkspaceScreen } from "./screens/StudyWorkspaceScreen.tsx";
import { SubjectsScreen } from "./screens/SubjectsScreen.tsx";

const NAV_TABS: readonly NavTab[] = [
  "daily",
  "plan",
  "subjects",
  "chat",
  "report",
  "profile",
];

function isNavTab(value: string): value is NavTab {
  return NAV_TABS.includes(value as NavTab);
}

export default function App() {
  const {
    profile,
    updateProfile,
    completeOnboarding,
    resetProfile,
    isOfflineFallback,
    authError,
  } = useStudentProfile();

  const [activeTab, setActiveTab] = useState<NavTab>("daily");
  const [isAssessmentMode, setIsAssessmentMode] = useState(false);

  const navigateTo = (tab: string) => {
    setIsAssessmentMode(false);
    setActiveTab(isNavTab(tab) ? tab : "daily");
  };

  const handleSelectSubject = (subjectId: SubjectKey) => {
    updateProfile({ activeSubject: subjectId });
  };

  if (!profile.onboardingCompleted) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-slate-50 px-4">
        <OnboardingScreen onComplete={completeOnboarding} />
      </div>
    );
  }

  const renderScreen = () => {
    if (isAssessmentMode) {
      return (
        <AssessmentScreen
          profile={profile}
          onProfileUpdate={updateProfile}
          onNavigate={navigateTo}
        />
      );
    }

    switch (activeTab) {
      case "daily":
        return (
          <DailySparkScreen
            profile={profile}
            onNavigate={navigateTo}
            onStartAssessment={() => setIsAssessmentMode(true)}
          />
        );
      case "plan":
        return profile.authoritative ? (
          <StudentStudyPathDashboard studentId={profile.id} />
        ) : (
          <section
            className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-right"
            dir="rtl"
            role="status"
          >
            <h2 className="font-sans text-base font-black text-amber-950">
              پلانی فەرمی پێویستی بە هەژمار هەیە
            </h2>
            <p className="mt-2 font-sans text-sm leading-relaxed text-amber-900">
              بۆ پاراستنی پێشکەوتن و پلانی خوێندن، سەرەتا بە هەژمارێکی پشتڕاستکراو بچۆ ژوورەوە.
            </p>
          </section>
        );
      case "subjects":
        return (
          <SubjectsScreen
            profile={profile}
            onSelectSubject={handleSelectSubject}
            onNavigate={navigateTo}
          />
        );
      case "chat":
        return <StudyWorkspaceScreen profile={profile} onNavigate={navigateTo} />;
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
        return (
          <DailySparkScreen
            profile={profile}
            onNavigate={navigateTo}
            onStartAssessment={() => setIsAssessmentMode(true)}
          />
        );
    }
  };

  return (
    <AppShell
      profile={profile}
      activeTab={isAssessmentMode ? "daily" : activeTab}
      onTabChange={(tab) => {
        setIsAssessmentMode(false);
        setActiveTab(tab);
      }}
      isOfflineFallback={isOfflineFallback}
      authError={authError}
    >
      {renderScreen()}
    </AppShell>
  );
}
