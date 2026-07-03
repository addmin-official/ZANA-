import { ButtonHTMLAttributes, ReactNode } from "react";

interface ZanaButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "success" | "warning" | "destructive" | "outline";
  fullWidth?: boolean;
  className?: string;
  onClick?: any;
  type?: "submit" | "button" | "reset";
  disabled?: boolean;
}

export function ZanaButton({
  children,
  variant = "primary",
  fullWidth = false,
  className = "",
  ...props
}: ZanaButtonProps) {
  const baseStyle =
    "inline-flex items-center justify-center font-sans font-medium text-base rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 select-none min-h-[48px] px-6 py-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-sm",
    secondary: "bg-slate-800 hover:bg-slate-900 text-white focus:ring-slate-700 shadow-sm",
    success: "bg-emerald-500 hover:bg-emerald-600 text-white focus:ring-emerald-400 shadow-sm",
    warning: "bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-400 shadow-sm",
    destructive: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-400 shadow-sm",
    outline: "border border-slate-200 hover:bg-slate-50 text-slate-700 focus:ring-slate-400"
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${widthStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
