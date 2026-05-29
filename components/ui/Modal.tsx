"use client";
import React, { useEffect } from "react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#1C1C1E] rounded-t-2xl p-6 pb-10 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#F5F5F5]">{title}</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#242424] text-[#888888] hover:text-[#F5F5F5] transition-colors"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
