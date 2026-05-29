import React from "react";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
};

export default function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div
      className={`bg-[#242424] rounded-xl border border-white/[0.08] ${
        onClick ? "cursor-pointer active:scale-[0.98] transition-transform" : ""
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
