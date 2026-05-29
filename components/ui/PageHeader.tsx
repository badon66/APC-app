import React from "react";
import Link from "next/link";

type PageHeaderProps = {
  title: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  backHref?: string;
  subtitle?: string;
};

export default function PageHeader({
  title,
  actionLabel,
  actionHref,
  onAction,
  backHref,
  subtitle,
}: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-[#111111]/95 backdrop-blur-sm border-b border-white/[0.08] px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#242424] text-[#F5F5F5] text-lg"
          >
            ←
          </Link>
        )}
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F5] leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-[#888888] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-[#3FA82A] text-white text-2xl font-light shadow-lg active:scale-95 transition-transform"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-[#3FA82A] text-white text-2xl font-light shadow-lg active:scale-95 transition-transform"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
