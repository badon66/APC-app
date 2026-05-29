import React from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
};

export default function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#242424] flex items-center justify-center mb-5 border border-white/[0.08]">
        {icon ?? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 12h6M9 16h6M9 8h3M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
              stroke="#888888"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-semibold text-[#F5F5F5] mb-2">{title}</h3>
      {description && (
        <p className="text-[#888888] text-sm leading-relaxed max-w-xs">{description}</p>
      )}
    </div>
  );
}
