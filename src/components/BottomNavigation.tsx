import {
  BookMarked,
  BookOpen,
  Compass,
  FileText,
  Sparkles,
  User,
} from "lucide-react";

export type NavTab = "daily" | "plan" | "subjects" | "chat" | "report" | "profile";

interface BottomNavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const TABS: ReadonlyArray<{
  id: NavTab;
  label: string;
  icon: typeof Sparkles;
}> = [
  { id: "daily", label: "ڕۆژانە", icon: Sparkles },
  { id: "plan", label: "پلانی خوێندن", icon: Compass },
  { id: "subjects", label: "بابەتەکان", icon: BookOpen },
  { id: "chat", label: "خوێندن", icon: BookMarked },
  { id: "report", label: "ڕاپۆرت", icon: FileText },
  { id: "profile", label: "پڕۆفایل", icon: User },
];

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-1 pt-1 shadow-lg backdrop-blur"
      style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
      aria-label="ڕێنوێنی سەرەکی"
      dir="rtl"
    >
      <div className="mx-auto grid min-h-14 max-w-md grid-cols-6 items-stretch">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              title={tab.label}
              onClick={() => onTabChange(tab.id)}
              className={`flex min-h-12 min-w-11 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 transition-transform ${isActive ? "scale-110" : ""}`}
                aria-hidden="true"
              />
              <span className="hidden whitespace-nowrap font-sans text-[9px] font-bold leading-none min-[400px]:inline">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
