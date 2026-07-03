import { ReactNode } from "react";
import { ZanaHeader } from "./ZanaHeader.tsx";
import { BottomNavigation, NavTab } from "./BottomNavigation.tsx";
import { StudentProfile } from "../services/storage.ts";

interface AppShellProps {
  children: ReactNode;
  profile: StudentProfile;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export function AppShell({ children, profile, activeTab, onTabChange }: AppShellProps) {
  const showNav = profile.onboarded;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Top Header */}
      <ZanaHeader profile={profile} />

      {/* Main Container */}
      <main className={`flex-1 w-full max-w-md mx-auto px-4 pt-4 ${showNav ? "pb-24" : "pb-6"} flex flex-col`}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {showNav && (
        <BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
      )}
    </div>
  );
}
