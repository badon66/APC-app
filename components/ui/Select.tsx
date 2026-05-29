import React from "react";

type SelectOption = { value: string; label: string };

type SelectProps = {
  label?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  name?: string;
};

export default function Select({
  label,
  options,
  value,
  onChange,
  required = false,
  disabled = false,
  className = "",
  name,
}: SelectProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-[#888888]">
          {label}
          {required && <span className="text-[#3FA82A] ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className="w-full h-12 px-4 pr-10 bg-[#1C1C1E] border border-white/[0.08] rounded-xl text-[#F5F5F5] text-base focus:outline-none focus:border-[#3FA82A] transition-colors disabled:opacity-50 appearance-none"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#1C1C1E]">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#888888]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
