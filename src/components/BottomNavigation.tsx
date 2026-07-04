import { Sparkles, BookOpen, BookMarked, FileText, User } from "lucide-react";

export type NavTab = "daily" | "subjects" | "chat" | "report" | "profile";

interface BottomNavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { id: "daily" as NavTab, label: "ڕۆژانە", icon: Sparkles },
    { id: "subjects" as NavTab, label: "بابەتەکان", icon: BookOpen },
    { id: "chat" as NavTab, label: "خوێندن", icon: BookMarked },
    { id: "report" as NavTab, label: "ڕاپۆرت", icon: FileText },
    { id: "profile" as NavTab, label: "پڕۆفایل", icon: User }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 px-2 py-1 shadow-lg pb-safe">
      <div className="max-w-md mx-auto flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] cursor-pointer transition-colors ${
                isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive ? "scale-110" : ""} transition-transform`} />
              <span className="font-sans text-[10px] font-medium leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
