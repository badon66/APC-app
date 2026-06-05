'use client'

import { useRef } from 'react'
import { Camera, X } from 'lucide-react'

interface PhotoUploadProps {
  label: string
  value?: string | null
  onChange: (file: File | null) => void
  previewUrl?: string | null
}

export default function PhotoUpload({ label, value, onChange, previewUrl }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const displayUrl = previewUrl || value

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    onChange(file ?? null)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div
        className="relative rounded-xl border-2 border-dashed border-white/12 overflow-hidden cursor-pointer active:opacity-80 transition-opacity"
        onClick={() => inputRef.current?.click()}
      >
        {displayUrl ? (
          <div className="relative w-full h-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayUrl} alt={label} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted">
            <Camera size={28} strokeWidth={1.5} />
            <span className="text-sm">Tap to add photo</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
