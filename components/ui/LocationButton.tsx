'use client'

import { useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

interface LocationButtonProps {
  onAddress: (address: string) => void
}

export default function LocationButton({ onAddress }: LocationButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      )

      const { latitude, longitude } = position.coords
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      const addr = data.display_name ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
      onAddress(addr)
    } catch (err) {
      setError('Could not get location')
      setTimeout(() => setError(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-surface border border-white/8 text-muted hover:text-foreground hover:border-accent/50 transition-colors text-sm disabled:opacity-50"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
        <span>{loading ? 'Locating…' : 'Use My Location'}</span>
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
