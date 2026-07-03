import { ReactNode, ComponentType } from "react";
import * as Icons from "lucide-react";

interface EmptyStateProps {
  icon?: keyof typeof Icons;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({
  icon = "FileText",
  title,
  description,
  action
}: EmptyStateProps) {
  const IconComponent = Icons[icon] as ComponentType<{ className?: string }>;

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-white border border-slate-100 rounded-2xl max-w-md mx-auto my-6 shadow-xs">
      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-5">
        {IconComponent && <IconComponent className="w-8 h-8" />}
      </div>
      <h3 className="font-sans font-bold text-lg text-slate-900 mb-2">
        {title}
      </h3>
      <p className="font-sans text-sm text-slate-500 max-w-xs leading-relaxed mb-6">
        {description}
      </p>
      {action && <div className="w-full">{action}</div>}
    </div>
  );
}
