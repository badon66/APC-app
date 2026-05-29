import React from "react";

type BadgeVariant =
  | "default"
  | "green"
  | "yellow"
  | "red"
  | "blue"
  | "asphalt"
  | "concrete"
  | "both"
  | "draft"
  | "sent"
  | "accepted"
  | "new"
  | "in_progress"
  | "complete";

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const variants: Record<BadgeVariant, string> = {
  default: "bg-white/10 text-[#F5F5F5]",
  green: "bg-[#3FA82A]/20 text-[#3FA82A]",
  yellow: "bg-yellow-500/20 text-yellow-400",
  red: "bg-red-500/20 text-red-400",
  blue: "bg-blue-500/20 text-blue-400",
  asphalt: "bg-[#3FA82A]/20 text-[#3FA82A]",
  concrete: "bg-blue-500/20 text-blue-400",
  both: "bg-purple-500/20 text-purple-400",
  draft: "bg-white/10 text-[#888888]",
  sent: "bg-yellow-500/20 text-yellow-400",
  accepted: "bg-[#3FA82A]/20 text-[#3FA82A]",
  new: "bg-blue-500/20 text-blue-400",
  in_progress: "bg-yellow-500/20 text-yellow-400",
  complete: "bg-[#3FA82A]/20 text-[#3FA82A]",
};

export default function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
