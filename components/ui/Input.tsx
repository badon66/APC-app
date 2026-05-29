import React from "react";

type InputProps = {
  label?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  name?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email";
};

export default function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
  className = "",
  name,
  autoComplete,
  inputMode,
}: InputProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-[#888888]">
          {label}
          {required && <span className="text-[#3FA82A] ml-0.5">*</span>}
        </label>
      )}
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="w-full h-12 px-4 bg-[#1C1C1E] border border-white/[0.08] rounded-xl text-[#F5F5F5] placeholder:text-[#888888] text-base focus:outline-none focus:border-[#3FA82A] transition-colors disabled:opacity-50"
      />
    </div>
  );
}
