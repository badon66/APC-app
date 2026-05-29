"use client";
import React from "react";
import type { Tier } from "@/lib/types";

type TierSelectorProps = {
  selected: Tier;
  onChange: (tier: Tier) => void;
  totals?: { low: number; mid: number; high: number };
};

const tiers: { key: Tier; label: string }[] = [
  { key: "low", label: "LOW" },
  { key: "mid", label: "MID" },
  { key: "high", label: "HIGH" },
];

export default function TierSelector({
  selected,
  onChange,
  totals,
}: TierSelectorProps) {
  return (
    <div className="flex gap-3">
      {tiers.map(({ key, label }) => {
        const isSelected = selected === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`flex-1 rounded-xl py-4 flex flex-col items-center gap-1 border transition-all active:scale-95 ${
              isSelected
                ? "bg-[#3FA82A] border-[#3FA82A] text-white"
                : "bg-[#242424] border-white/[0.08] text-[#888888]"
            }`}
          >
            <span className="text-xs font-bold tracking-widest">{label}</span>
            {totals !== undefined && (
              <span
                className={`text-base font-bold ${
                  isSelected ? "text-white" : "text-[#F5F5F5]"
                }`}
              >
                ${totals[key].toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
