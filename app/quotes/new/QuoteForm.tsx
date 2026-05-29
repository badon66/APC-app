'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ServiceRate, Tier, QuoteType, LineItem, Quote } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { BUSINESS_ID } from '@/lib/config'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

// ─── helpers ────────────────────────────────────────────────────────────────

type OtherService = { description: string; amount: string }

function fmt(n: number) {
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function vn(s: string | undefined): number {
  const n = parseFloat(s ?? '')
  return isNaN(n) ? 0 : n
}

const TIER_CYCLE: Tier[] = ['low', 'mid', 'high']

const TIER_STYLE: Record<Tier, string> = {
  low:  'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  mid:  'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  high: 'bg-[#3FA82A]/20 text-[#3FA82A] border border-[#3FA82A]/30',
}

function rateAt(s: ServiceRate, t: Tier): number {
  return t === 'low' ? s.rate_low : t === 'mid' ? s.rate_mid : s.rate_high
}

// ─── component ──────────────────────────────────────────────────────────────

type Props = { rates: ServiceRate[]; existingQuote?: Quote }

export default function QuoteForm({ rates, existingQuote }: Props) {
  const router = useRouter()
  const isEdit = !!existingQuote

  // customer info
  const [customerName,  setCustomerName]  = useState(existingQuote?.customer_name ?? '')
  const [address,       setAddress]       = useState(existingQuote?.address ?? '')
  const [customerPhone, setCustomerPhone] = useState(existingQuote?.customer_phone ?? '')
  const [estimatorName, setEstimatorName] = useState(existingQuote?.estimator_name ?? '')
  const [quoteDate,     setQuoteDate]     = useState(() =>
    existingQuote ? existingQuote.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
  )

  // quote type
  const [quoteType, setQuoteType] = useState<QuoteType>(existingQuote?.quote_type ?? 'asphalt')

  // per-line tier — keyed by service.id; unmapped rows default to 'mid'
  const [lineTiers, setLineTiers] = useState<Record<string, Tier>>({})

  // volumes & other services
  const [volumes,      setVolumes]      = useState<Record<string, string>>({})
  const [otherAsphalt, setOtherAsphalt] = useState<OtherService>({ description: '', amount: '' })
  const [otherConcrete,setOtherConcrete]= useState<OtherService>({ description: '', amount: '' })

  // tax: auto = 5% of mixed subtotal; taxManual = true once estimator edits the field
  const [tax,       setTax]       = useState(existingQuote?.tax ? String(existingQuote.tax) : '')
  const [taxManual, setTaxManual] = useState(isEdit) // edits keep their saved tax; new quotes get auto-5%
  const [discount,  setDiscount]  = useState(existingQuote?.discount ? String(existingQuote.discount) : '')
  const [notes,     setNotes]     = useState(existingQuote?.notes ?? '')

  // location
  const [locating, setLocating] = useState(false)

  const [saving, setSaving] = useState(false)

  // ── load estimator from localStorage on new quotes
  useEffect(() => {
    if (!isEdit) {
      const saved = localStorage.getItem('estimator_name')
      if (saved) setEstimatorName(saved)
    }
  }, [isEdit])

  // ── pre-fill volumes + per-line tiers from existing quote on edit
  useEffect(() => {
    if (!existingQuote?.line_items?.length) return
    const newVolumes: Record<string, string> = {}
    const newTiers:   Record<string, Tier>   = {}
    let asphOther: OtherService = { description: '', amount: '' }
    let concOther: OtherService = { description: '', amount: '' }

    existingQuote.line_items.forEach((item: LineItem) => {
      if (item.is_other) {
        const o = { description: item.description ?? '', amount: item.flat_amount ? String(item.flat_amount) : '' }
        if (item.category === 'asphalt') asphOther = o
        else concOther = o
      } else if (item.service_id) {
        if (item.volume > 0) newVolumes[item.service_id] = String(item.volume)
        if (item.tier)       newTiers[item.service_id]   = item.tier
      }
    })
    setVolumes(newVolumes)
    setLineTiers(newTiers)
    setOtherAsphalt(asphOther)
    setOtherConcrete(concOther)
  }, [existingQuote])

  // ── estimator name persists across sessions
  const handleEstimatorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEstimatorName(e.target.value)
    localStorage.setItem('estimator_name', e.target.value)
  }

  // ── GPS reverse-geocode via Nominatim (free, no API key required)
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()
          const a    = data.address ?? {}
          const street   = [a.house_number, a.road].filter(Boolean).join(' ')
          const city     = a.city || a.town || a.village || a.county || ''
          const province = a.state || a.province || ''
          const postal   = a.postcode || ''
          const formatted = [street, city, province, postal].filter(Boolean).join(', ')
          setAddress(formatted || data.display_name || '')
        } catch {
          alert('Could not convert location to address. Please enter manually.')
        } finally {
          setLocating(false)
        }
      },
      (err) => {
        alert(err.code === 1 ? 'Location permission denied.' : 'Could not get your location.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // ── tier helpers — no global setter; each row defaults to 'mid'
  const getRowTier = (serviceId: string): Tier => lineTiers[serviceId] ?? 'mid'

  const cycleTier = (serviceId: string) => {
    const next = TIER_CYCLE[(TIER_CYCLE.indexOf(getRowTier(serviceId)) + 1) % 3]
    setLineTiers(prev => ({ ...prev, [serviceId]: next }))
  }

  // ── filtered rate lists
  const asphaltRates  = rates.filter(r => r.category === 'asphalt' || r.category === 'both')
  const concreteRates = rates.filter(r => r.category === 'concrete' || r.category === 'both')

  // ── actual mixed-tier subtotal (each row uses its own tier)
  const calcMixed = (): number => {
    let sum = 0
    if (quoteType !== 'concrete') {
      asphaltRates.forEach(r  => { sum += vn(volumes[r.id]) * rateAt(r, getRowTier(r.id)) })
      sum += vn(otherAsphalt.amount)
    }
    if (quoteType !== 'asphalt') {
      concreteRates.forEach(r => { sum += vn(volumes[r.id]) * rateAt(r, getRowTier(r.id)) })
      sum += vn(otherConcrete.amount)
    }
    return sum
  }

  // ── hypothetical totals if every row used the same tier (reference only)
  const hypothetical = (tier: Tier): number => {
    let sum = 0
    if (quoteType !== 'concrete') {
      asphaltRates.forEach(r  => { sum += vn(volumes[r.id]) * rateAt(r, tier) })
      sum += vn(otherAsphalt.amount)
    }
    if (quoteType !== 'asphalt') {
      concreteRates.forEach(r => { sum += vn(volumes[r.id]) * rateAt(r, tier) })
      sum += vn(otherConcrete.amount)
    }
    return sum
  }

  // ── derived totals (computed every render so they stay live)
  const mixedTotal = calcMixed()
  const autoTax    = mixedTotal * 0.05                          // fix 5: 5% default
  const taxAmt     = taxManual ? vn(tax) : autoTax
  const discountAmt= vn(discount)
  const balanceDue = mixedTotal + taxAmt - discountAmt
  const hypoTotals = { low: hypothetical('low'), mid: hypothetical('mid'), high: hypothetical('high') }

  // ── build line items for Supabase save
  const buildLineItems = (): LineItem[] => {
    const items: LineItem[] = []
    const add = (list: ServiceRate[], category: 'asphalt' | 'concrete', other: OtherService) => {
      list.forEach(r => {
        const vol  = vn(volumes[r.id])
        const tier = getRowTier(r.id)
        items.push({
          service_id: r.id, service_name: r.service_name, unit: r.unit, category, tier,
          volume: vol,
          rate_low: r.rate_low, rate_mid: r.rate_mid, rate_high: r.rate_high,
          total_low:  vol * r.rate_low,
          total_mid:  vol * r.rate_mid,
          total_high: vol * r.rate_high,
          line_total: vol * rateAt(r, tier),
        })
      })
      const amt = vn(other.amount)
      if (other.description || amt > 0) {
        items.push({
          service_id: null,
          service_name: other.description || 'Other Services',
          unit: 'flat', category, volume: 0,
          rate_low: 0, rate_mid: 0, rate_high: 0,
          total_low: amt, total_mid: amt, total_high: amt,
          line_total: amt,
          is_other: true, description: other.description, flat_amount: amt,
        })
      }
    }
    if (quoteType !== 'concrete') add(asphaltRates,  'asphalt',  otherAsphalt)
    if (quoteType !== 'asphalt')  add(concreteRates, 'concrete', otherConcrete)
    return items
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        business_id: BUSINESS_ID,
        quote_type: quoteType,
        selected_tier: 'mid' as Tier,
        line_items: buildLineItems(),
        subtotal_low:  hypothetical('low'),
        subtotal_mid:  hypothetical('mid'),
        subtotal_high: hypothetical('high'),
        tax: taxAmt, discount: discountAmt, total: balanceDue,
        status: existingQuote?.status ?? 'draft',
        estimator_name: estimatorName, customer_name: customerName,
        customer_phone: customerPhone, address, notes,
      }
      if (isEdit && existingQuote) {
        const { error } = await supabase.from('quotes').update(payload)
          .eq('id', existingQuote.id).eq('business_id', BUSINESS_ID)
        if (error) throw error
        router.push(`/quotes/${existingQuote.id}`)
      } else {
        const { error } = await supabase.from('quotes').insert(payload)
        if (error) throw error
        router.push('/quotes')
      }
    } catch (err: unknown) {
      console.error('Save error:', err)
      alert('Failed to save quote. Check console for details.')
    } finally {
      setSaving(false)
    }
  }

  // ─── CSS shortcuts ────────────────────────────────────────────────────────
  const inputCls   = 'h-11 px-3 bg-[#1C1C1E] border border-white/[0.08] rounded-xl text-[#F5F5F5] text-base focus:outline-none focus:border-[#3FA82A] transition-colors placeholder:text-[#888888]'
  const smInputCls = 'h-10 px-3 bg-[#1C1C1E] border border-white/[0.08] rounded-xl text-[#F5F5F5] text-sm  focus:outline-none focus:border-[#3FA82A] transition-colors placeholder:text-[#888888]'

  // ─── service row ──────────────────────────────────────────────────────────
  // fix 1: badge shows "MID · $0.18/sq ft"
  // fix 2: total column shows "1,000 sq ft" above "$180.00"
  const renderServiceRow = (service: ServiceRate) => {
    const rowTier = getRowTier(service.id)
    const vol     = vn(volumes[service.id])
    const total   = vol * rateAt(service, rowTier)
    const hasVol  = vol > 0
    const rate    = rateAt(service, rowTier)

    return (
      <div
        key={service.id}
        className={`flex items-center gap-2 py-3 border-b border-white/[0.05] last:border-b-0 transition-opacity ${!hasVol ? 'opacity-40' : ''}`}
      >
        {/* Name + tier badge with rate */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#F5F5F5] leading-tight truncate">{service.service_name}</p>
          <button
            type="button"
            onClick={() => cycleTier(service.id)}
            className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide transition-all active:scale-95 whitespace-nowrap ${TIER_STYLE[rowTier]}`}
          >
            {rowTier.toUpperCase()} · ${rate.toFixed(2)}/{service.unit} ›
          </button>
        </div>

        {/* Volume input */}
        <input
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={volumes[service.id] ?? ''}
          onChange={e => setVolumes(prev => ({ ...prev, [service.id]: e.target.value }))}
          className={`w-20 text-right ${inputCls}`}
        />

        {/* Total — volume · unit on top, dollar amount below */}
        <div className="w-24 text-right shrink-0">
          {hasVol ? (
            <>
              <p className="text-[11px] leading-tight text-[#888888]">
                {vol.toLocaleString('en-CA')} {service.unit}
              </p>
              <p className="text-sm font-semibold text-[#F5F5F5] mt-0.5">{fmt(total)}</p>
            </>
          ) : (
            <span className="text-sm text-[#555]">—</span>
          )}
        </div>
      </div>
    )
  }

  // ─── other services row ───────────────────────────────────────────────────
  const renderOtherRow = (val: OtherService, onChange: (v: OtherService) => void) => (
    <div className="pt-3 mt-1">
      <p className="text-[10px] font-bold text-[#3FA82A] mb-2 uppercase tracking-widest">Other Services · flat rate</p>
      <div className="flex gap-2">
        <input type="text" placeholder="Description (optional)"
          value={val.description} onChange={e => onChange({ ...val, description: e.target.value })}
          className={`flex-1 ${smInputCls}`} />
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[#888888] text-sm">$</span>
          <input type="number" inputMode="decimal" placeholder="0.00"
            value={val.amount} onChange={e => onChange({ ...val, amount: e.target.value })}
            className={`w-24 text-right ${smInputCls}`} />
        </div>
      </div>
    </div>
  )

  // ─── services section block ───────────────────────────────────────────────
  const renderServicesBlock = (
    label: string | null,
    list: ServiceRate[],
    other: OtherService,
    setOther: (v: OtherService) => void,
  ) => (
    <div>
      {label && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-bold text-[#888888] uppercase tracking-widest whitespace-nowrap">{label}</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>
      )}
      {list.length === 0 ? (
        <p className="text-sm text-[#888888] py-3">No active services. Add them in Settings → Service Rates.</p>
      ) : (
        <>
          <div className="flex items-center gap-2 pb-2 mb-1 border-b border-white/[0.08]">
            <p className="flex-1 text-xs font-semibold text-[#888888] uppercase tracking-wide">Service · Tier</p>
            <p className="w-20 text-right text-xs font-semibold text-[#888888] uppercase tracking-wide">Vol.</p>
            <p className="w-24 text-right text-xs font-semibold text-[#888888] uppercase tracking-wide">Total</p>
          </div>
          {list.map(renderServiceRow)}
        </>
      )}
      {renderOtherRow(other, setOther)}
    </div>
  )

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#111111]">
      <PageHeader
        title={isEdit ? 'Edit Quote' : 'New Quote'}
        backHref={isEdit && existingQuote ? `/quotes/${existingQuote.id}` : '/'}
      />

      <div className="p-4 space-y-4" style={{ paddingBottom: '120px' }}>

        {/* ── Customer info ── */}
        <Card className="p-4 space-y-3">
          <p className="text-xs font-bold text-[#888888] uppercase tracking-widest">Customer Info</p>

          <input type="text" placeholder="Customer Name" value={customerName}
            onChange={e => setCustomerName(e.target.value)} className={`w-full ${inputCls}`} />

          {/* fix 4: address + location button */}
          <div>
            <input type="text" placeholder="Address" value={address}
              onChange={e => setAddress(e.target.value)} className={`w-full ${inputCls}`} />
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={locating}
              className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#3FA82A] disabled:opacity-40 active:opacity-70 transition-opacity"
            >
              {/* crosshair / location icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>
                <line x1="12" y1="2" x2="12" y2="6"/>
                <line x1="12" y1="18" x2="12" y2="22"/>
                <line x1="2" y1="12" x2="6" y2="12"/>
                <line x1="18" y1="12" x2="22" y2="12"/>
              </svg>
              {locating ? 'Getting location…' : 'Use My Location'}
            </button>
          </div>

          <input type="tel" inputMode="tel" placeholder="Phone Number" value={customerPhone}
            onChange={e => setCustomerPhone(e.target.value)} className={`w-full ${inputCls}`} />

          <div className="flex gap-3">
            <input type="text" placeholder="Estimator Name" value={estimatorName}
              onChange={handleEstimatorChange} className={`flex-1 ${inputCls}`} />
            <input type="date" value={quoteDate}
              onChange={e => setQuoteDate(e.target.value)} className={`w-36 ${inputCls}`} />
          </div>
        </Card>

        {/* ── Quote type ── */}
        <Card className="p-4">
          <p className="text-xs font-bold text-[#888888] uppercase tracking-widest mb-3">Quote Type</p>
          <div className="flex gap-2">
            {(['asphalt', 'concrete', 'both'] as QuoteType[]).map(type => (
              <button key={type} type="button" onClick={() => setQuoteType(type)}
                className={`flex-1 h-12 rounded-xl font-semibold text-sm capitalize transition-all active:scale-95 ${
                  quoteType === type ? 'bg-[#3FA82A] text-white' : 'bg-[#1C1C1E] text-[#888888] border border-white/[0.08]'
                }`}>
                {type}
              </button>
            ))}
          </div>
        </Card>

        {/* ── Services — fix 3: no global tier selector above this, only per-row badges ── */}
        <Card className="p-4">
          {quoteType === 'both' ? (
            <div className="space-y-6">
              {renderServicesBlock('Asphalt Services', asphaltRates, otherAsphalt, setOtherAsphalt)}
              <div className="h-px bg-white/[0.08]" />
              {renderServicesBlock('Concrete Services', concreteRates, otherConcrete, setOtherConcrete)}
            </div>
          ) : quoteType === 'asphalt' ? (
            renderServicesBlock(null, asphaltRates, otherAsphalt, setOtherAsphalt)
          ) : (
            renderServicesBlock(null, concreteRates, otherConcrete, setOtherConcrete)
          )}
        </Card>

        {/* ── Price summary ── */}
        <Card className="p-4">
          <p className="text-xs font-bold text-[#888888] uppercase tracking-widest mb-4">Price Summary</p>

          {/* Hypothetical reference — all rows at same tier */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {(['low', 'mid', 'high'] as Tier[]).map(tier => (
              <div key={tier} className="rounded-xl p-3 text-center border bg-[#1C1C1E] border-white/[0.08]">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-[#888888]">{tier}</p>
                <p className="text-sm font-bold text-[#F5F5F5]">{fmt(hypoTotals[tier])}</p>
                <p className="text-[9px] text-[#888888] mt-0.5">if all at {tier}</p>
              </div>
            ))}
          </div>

          {/* Actual calculation */}
          <div className="space-y-3 pt-3 border-t border-white/[0.08]">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#888888]">Subtotal (mixed tiers)</span>
              <span className="text-base font-semibold text-[#F5F5F5]">{fmt(mixedTotal)}</span>
            </div>

            {/* fix 5: tax auto-fills at 5%; shows "5% auto" label until manually overridden */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-[#888888]">Tax / Fees</span>
                {!taxManual && (
                  <span className="text-[10px] text-[#888888] opacity-50">5% auto</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#888888] text-sm">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={taxManual ? tax : autoTax.toFixed(2)}
                  onFocus={() => {
                    if (!taxManual) { setTax(autoTax.toFixed(2)); setTaxManual(true) }
                  }}
                  onChange={e => { setTax(e.target.value); setTaxManual(true) }}
                  className={`w-28 text-right ${smInputCls}`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-[#888888]">Discount</span>
              <div className="flex items-center gap-1">
                <span className="text-[#888888] text-sm">$</span>
                <input type="number" inputMode="decimal" placeholder="0.00" value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  className={`w-28 text-right ${smInputCls}`} />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
              <span className="text-xl font-bold text-[#F5F5F5]">Balance Due</span>
              <span className="text-3xl font-bold text-[#3FA82A]">{fmt(balanceDue)}</span>
            </div>
          </div>
        </Card>

        {/* ── Notes ── */}
        <Card className="p-4">
          <p className="text-xs font-bold text-[#888888] uppercase tracking-widest mb-3">Comments / Notes</p>
          <textarea placeholder="Add notes, special instructions, conditions..."
            value={notes} onChange={e => setNotes(e.target.value)} rows={4}
            className="w-full px-4 py-3 bg-[#1C1C1E] border border-white/[0.08] rounded-xl text-[#F5F5F5] placeholder:text-[#888888] text-base focus:outline-none focus:border-[#3FA82A] transition-colors resize-none" />
        </Card>
      </div>

      {/* ── Sticky save bar ── */}
      <div className="fixed left-0 right-0 p-4 bg-[#111111]/95 backdrop-blur-sm border-t border-white/[0.08]"
        style={{ bottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
        <Button fullWidth size="lg" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Quote'}
        </Button>
      </div>
    </div>
  )
}
