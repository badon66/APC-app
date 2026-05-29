import React from "react";

type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  onClick,
  type = "button",
  className = "",
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-[#3FA82A] text-white hover:bg-[#35921F]",
    secondary: "bg-[#242424] text-[#F5F5F5] border border-white/[0.08] hover:bg-[#2E2E2E]",
    ghost: "bg-transparent text-[#F5F5F5] hover:bg-white/5",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  const sizes = {
    sm: "h-9 px-4 text-sm min-w-[44px]",
    md: "h-11 px-5 text-base min-w-[44px]",
    lg: "h-14 px-6 text-lg min-w-[44px]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {children}
    </button>
  );
}
