'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ServiceRate, Tier, QuoteType, LineItem, Quote } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { BUSINESS_ID } from '@/lib/config'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import TierSelector from '@/components/ui/TierSelector'

// ─── helpers ────────────────────────────────────────────────────────────────

type OtherService = { description: string; amount: string }

function fmt(n: number) {
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function v(s: string | undefined): number {
  const n = parseFloat(s ?? '')
  return isNaN(n) ? 0 : n
}

const TIER_CYCLE: Tier[] = ['low', 'mid', 'high']

const TIER_STYLE: Record<Tier, string> = {
  low:  'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  mid:  'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  high: 'bg-[#3FA82A]/20 text-[#3FA82A] border border-[#3FA82A]/30',
}

function rateAt(service: ServiceRate, tier: Tier): number {
  return tier === 'low' ? service.rate_low : tier === 'mid' ? service.rate_mid : service.rate_high
}

// ─── component ──────────────────────────────────────────────────────────────

type Props = { rates: ServiceRate[]; existingQuote?: Quote }

export default function QuoteForm({ rates, existingQuote }: Props) {
  const router = useRouter()
  const isEdit = !!existingQuote

  // customer info
  const [customerName, setCustomerName] = useState(existingQuote?.customer_name ?? '')
  const [address,      setAddress]       = useState(existingQuote?.address ?? '')
  const [customerPhone,setCustomerPhone] = useState(existingQuote?.customer_phone ?? '')
  const [estimatorName,setEstimatorName] = useState(existingQuote?.estimator_name ?? '')
  const [quoteDate,    setQuoteDate]     = useState(() =>
    existingQuote ? existingQuote.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
  )

  // quote type & global tier (global tier = "set all rows at once" shortcut)
  const [quoteType,   setQuoteType]   = useState<QuoteType>(existingQuote?.quote_type ?? 'asphalt')
  const [globalTier,  setGlobalTier]  = useState<Tier>(existingQuote?.selected_tier ?? 'mid')

  // per-line tier — keyed by service.id; falls back to globalTier if not set
  const [lineTiers, setLineTiers] = useState<Record<string, Tier>>({})

  // volumes & other services
  const [volumes,      setVolumes]      = useState<Record<string, string>>({})
  const [otherAsphalt, setOtherAsphalt] = useState<OtherService>({ description: '', amount: '' })
  const [otherConcrete,setOtherConcrete]= useState<OtherService>({ description: '', amount: '' })

  // totals & meta
  const [tax,     setTax]     = useState(existingQuote?.tax     ? String(existingQuote.tax)     : '')
  const [discount,setDiscount]= useState(existingQuote?.discount ? String(existingQuote.discount) : '')
  const [notes,   setNotes]   = useState(existingQuote?.notes ?? '')
  const [saving,  setSaving]  = useState(false)

  // ── load estimator name from localStorage (new quotes only)
  useEffect(() => {
    if (!isEdit) {
      const saved = localStorage.getItem('estimator_name')
      if (saved) setEstimatorName(saved)
    }
  }, [isEdit])

  // ── pre-fill volumes + per-line tiers from existing quote
  useEffect(() => {
    if (!existingQuote?.line_items?.length) return
    const newVolumes: Record<string, string> = {}
    const newTiers:   Record<string, Tier>   = {}
    let asphOther: OtherService = { description: '', amount: '' }
    let concOther: OtherService = { description: '', amount: '' }

    existingQuote.line_items.forEach((item: LineItem) => {
      if (item.is_other) {
        const o: OtherService = { description: item.description ?? '', amount: item.flat_amount ? String(item.flat_amount) : '' }
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

  // ── estimator name persists to localStorage
  const handleEstimatorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEstimatorName(e.target.value)
    localStorage.setItem('estimator_name', e.target.value)
  }

  // ── tier helpers
  const getRowTier = (serviceId: string): Tier => lineTiers[serviceId] ?? globalTier

  const cycleTier = (serviceId: string) => {
    const cur = getRowTier(serviceId)
    const next = TIER_CYCLE[(TIER_CYCLE.indexOf(cur) + 1) % 3]
    setLineTiers(prev => ({ ...prev, [serviceId]: next }))
  }

  // global tier sets ALL rows at once
  const handleGlobalTierChange = (tier: Tier) => {
    setGlobalTier(tier)
    const reset: Record<string, Tier> = {}
    rates.forEach(r => { reset[r.id] = tier })
    setLineTiers(reset)
  }

  // ── filtered rate lists
  const asphaltRates  = rates.filter(r => r.category === 'asphalt' || r.category === 'both')
  const concreteRates = rates.filter(r => r.category === 'concrete' || r.category === 'both')

  // ── per-line actual total (uses that row's tier)
  const lineTotal = (service: ServiceRate): number =>
    v(volumes[service.id]) * rateAt(service, getRowTier(service.id))

  // ── hypothetical subtotal if ALL rows used a single tier (for top selector display)
  const hypothetical = (tier: Tier): number => {
    let sum = 0
    if (quoteType !== 'concrete') {
      asphaltRates.forEach(r  => { sum += v(volumes[r.id]) * rateAt(r, tier) })
      sum += v(otherAsphalt.amount)
    }
    if (quoteType !== 'asphalt') {
      concreteRates.forEach(r => { sum += v(volumes[r.id]) * rateAt(r, tier) })
      sum += v(otherConcrete.amount)
    }
    return sum
  }

  // ── actual mixed-tier subtotal (each row uses its own tier)
  const actualSubtotal = (): number => {
    let sum = 0
    if (quoteType !== 'concrete') {
      asphaltRates.forEach(r  => { sum += lineTotal(r) })
      sum += v(otherAsphalt.amount)
    }
    if (quoteType !== 'asphalt') {
      concreteRates.forEach(r => { sum += lineTotal(r) })
      sum += v(otherConcrete.amount)
    }
    return sum
  }

  const hypotheticalTotals = { low: hypothetical('low'), mid: hypothetical('mid'), high: hypothetical('high') }
  const taxAmt      = v(tax)
  const discountAmt = v(discount)
  const mixedTotal  = actualSubtotal()
  const balanceDue  = mixedTotal + taxAmt - discountAmt

  // ── build line items for save
  const buildLineItems = (): LineItem[] => {
    const items: LineItem[] = []

    const addServices = (list: ServiceRate[], category: 'asphalt' | 'concrete', other: OtherService) => {
      list.forEach(r => {
        const vol  = v(volumes[r.id])
        const tier = getRowTier(r.id)
        items.push({
          service_id: r.id,
          service_name: r.service_name,
          unit: r.unit,
          category,
          tier,
          volume: vol,
          rate_low:  r.rate_low,
          rate_mid:  r.rate_mid,
          rate_high: r.rate_high,
          total_low:  vol * r.rate_low,
          total_mid:  vol * r.rate_mid,
          total_high: vol * r.rate_high,
          line_total: vol * rateAt(r, tier),
        })
      })
      const amt = v(other.amount)
      if (other.description || amt > 0) {
        items.push({
          service_id: null,
          service_name: other.description || 'Other Services',
          unit: 'flat',
          category,
          volume: 0,
          rate_low: 0, rate_mid: 0, rate_high: 0,
          total_low: amt, total_mid: amt, total_high: amt,
          line_total: amt,
          is_other: true,
          description: other.description,
          flat_amount: amt,
        })
      }
    }

    if (quoteType !== 'concrete') addServices(asphaltRates,  'asphalt',  otherAsphalt)
    if (quoteType !== 'asphalt')  addServices(concreteRates, 'concrete', otherConcrete)
    return items
  }

  // ── save
  const handleSave = async () => {
    setSaving(true)
    try {
      const lineItems = buildLineItems()
      const payload = {
        business_id: BUSINESS_ID,
        quote_type: quoteType,
        selected_tier: globalTier,
        line_items: lineItems,
        subtotal_low:  hypothetical('low'),
        subtotal_mid:  hypothetical('mid'),
        subtotal_high: hypothetical('high'),
        tax:      taxAmt,
        discount: discountAmt,
        total:    balanceDue,
        status:   existingQuote?.status ?? 'draft',
        estimator_name: estimatorName,
        customer_name:  customerName,
        customer_phone: customerPhone,
        address,
        notes,
      }

      if (isEdit && existingQuote) {
        const { error } = await supabase.from('quotes').update(payload).eq('id', existingQuote.id).eq('business_id', BUSINESS_ID)
        if (error) throw error
        router.push(`/quotes/${existingQuote.id}`)
      } else {
        const { data, error } = await supabase.from('quotes').insert(payload).select().single()
        if (error) throw error
        router.push(`/quotes/${data.id}`)
      }
    } catch (err: unknown) {
      console.error('Save error:', err)
      alert('Failed to save quote. Check console for details.')
    } finally {
      setSaving(false)
    }
  }

  // ─── render helpers ───────────────────────────────────────────────────────

  const inputCls   = 'h-11 px-3 bg-[#1C1C1E] border border-white/[0.08] rounded-xl text-[#F5F5F5] text-base focus:outline-none focus:border-[#3FA82A] transition-colors placeholder:text-[#888888]'
  const smInputCls = 'h-10 px-3 bg-[#1C1C1E] border border-white/[0.08] rounded-xl text-[#F5F5F5] text-sm  focus:outline-none focus:border-[#3FA82A] transition-colors placeholder:text-[#888888]'

  const renderServiceRow = (service: ServiceRate) => {
    const rowTier  = getRowTier(service.id)
    const vol      = v(volumes[service.id])
    const total    = lineTotal(service)
    const hasVol   = vol > 0

    return (
      <div
        key={service.id}
        className={`flex items-center gap-2 py-3 border-b border-white/[0.05] last:border-b-0 transition-opacity ${!hasVol ? 'opacity-40' : ''}`}
      >
        {/* Name + unit + tier badge */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#F5F5F5] leading-tight truncate">{service.service_name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[#888888]">{service.unit}</span>
            <button
              type="button"
              onClick={() => cycleTier(service.id)}
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all active:scale-95 ${TIER_STYLE[rowTier]}`}
            >
              {rowTier} <span className="opacity-60">›</span>
            </button>
          </div>
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

        {/* Line total at this row's tier */}
        <div className="w-20 text-right shrink-0">
          <span className={`text-sm font-semibold ${hasVol ? 'text-[#F5F5F5]' : 'text-[#555]'}`}>
            {hasVol ? fmt(total) : '—'}
          </span>
        </div>
      </div>
    )
  }

  const renderOtherRow = (val: OtherService, onChange: (v: OtherService) => void) => (
    <div className="pt-3 mt-1">
      <p className="text-[10px] font-bold text-[#3FA82A] mb-2 uppercase tracking-widest">Other Services · flat rate</p>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Description (optional)"
          value={val.description}
          onChange={e => onChange({ ...val, description: e.target.value })}
          className={`flex-1 ${smInputCls}`}
        />
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[#888888] text-sm">$</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={val.amount}
            onChange={e => onChange({ ...val, amount: e.target.value })}
            className={`w-24 text-right ${smInputCls}`}
          />
        </div>
      </div>
    </div>
  )

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
            <p className="w-20 text-right text-xs font-semibold text-[#888888] uppercase tracking-wide">Total</p>
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
          <input type="text" placeholder="Address" value={address}
            onChange={e => setAddress(e.target.value)} className={`w-full ${inputCls}`} />
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

        {/* ── Global tier selector ──
            Tapping a tier button instantly sets ALL rows to that tier.
            Dollar amounts show the hypothetical total if every row were at that tier. */}
        <Card className="p-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-bold text-[#888888] uppercase tracking-widest">Set All Rows</p>
            <p className="text-[10px] text-[#888888]">Tap a tier to apply to every row</p>
          </div>
          <TierSelector selected={globalTier} onChange={handleGlobalTierChange} totals={hypotheticalTotals} />
        </Card>

        {/* ── Services ── */}
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

          {/* Hypothetical tier reference row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {(['low', 'mid', 'high'] as Tier[]).map(tier => {
              const isGlobal = tier === globalTier
              return (
                <div key={tier}
                  className={`rounded-xl p-3 text-center border ${isGlobal ? 'bg-[#3FA82A]/10 border-[#3FA82A]/40' : 'bg-[#1C1C1E] border-white/[0.08]'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isGlobal ? 'text-[#3FA82A]' : 'text-[#888888]'}`}>{tier}</p>
                  <p className={`text-sm font-bold ${isGlobal ? 'text-[#3FA82A]' : 'text-[#F5F5F5]'}`}>{fmt(hypotheticalTotals[tier])}</p>
                  <p className="text-[9px] text-[#888888] mt-0.5">if all at {tier}</p>
                </div>
              )
            })}
          </div>

          {/* Actual mixed total */}
          <div className="space-y-3 pt-3 border-t border-white/[0.08]">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#888888]">Subtotal (mixed tiers)</span>
              <span className="text-base font-semibold text-[#F5F5F5]">{fmt(mixedTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#888888]">Tax / Fees</span>
              <div className="flex items-center gap-1">
                <span className="text-[#888888] text-sm">$</span>
                <input type="number" inputMode="decimal" placeholder="0.00" value={tax}
                  onChange={e => setTax(e.target.value)}
                  className={`w-28 text-right ${smInputCls}`} />
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
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Quote'}
        </Button>
      </div>
    </div>
  )
}
