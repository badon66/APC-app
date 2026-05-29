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

type OtherService = { description: string; amount: string }

function fmt(n: number) {
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function volNum(v: string | undefined): number {
  return parseFloat(v || '0') || 0
}

type Props = {
  rates: ServiceRate[]
  existingQuote?: Quote
}

export default function QuoteForm({ rates, existingQuote }: Props) {
  const router = useRouter()
  const isEdit = !!existingQuote

  const [customerName, setCustomerName] = useState(existingQuote?.customer_name ?? '')
  const [address, setAddress] = useState(existingQuote?.address ?? '')
  const [customerPhone, setCustomerPhone] = useState(existingQuote?.customer_phone ?? '')
  const [estimatorName, setEstimatorName] = useState(existingQuote?.estimator_name ?? '')
  const [quoteDate, setQuoteDate] = useState(() => {
    if (existingQuote) return existingQuote.created_at.split('T')[0]
    return new Date().toISOString().split('T')[0]
  })

  const [quoteType, setQuoteType] = useState<QuoteType>(existingQuote?.quote_type ?? 'asphalt')
  const [selectedTier, setSelectedTier] = useState<Tier>(existingQuote?.selected_tier ?? 'mid')

  const [volumes, setVolumes] = useState<Record<string, string>>({})
  const [otherAsphalt, setOtherAsphalt] = useState<OtherService>({ description: '', amount: '' })
  const [otherConcrete, setOtherConcrete] = useState<OtherService>({ description: '', amount: '' })

  const [tax, setTax] = useState(existingQuote?.tax ? String(existingQuote.tax) : '')
  const [discount, setDiscount] = useState(existingQuote?.discount ? String(existingQuote.discount) : '')
  const [notes, setNotes] = useState(existingQuote?.notes ?? '')
  const [saving, setSaving] = useState(false)

  // Load estimator from localStorage (only on new quotes)
  useEffect(() => {
    if (!isEdit) {
      const saved = localStorage.getItem('estimator_name')
      if (saved && !estimatorName) setEstimatorName(saved)
    }
  }, [isEdit, estimatorName])

  // Pre-fill volumes from existing quote
  useEffect(() => {
    if (!existingQuote?.line_items) return
    const newVolumes: Record<string, string> = {}
    let asphOther: OtherService = { description: '', amount: '' }
    let concOther: OtherService = { description: '', amount: '' }

    existingQuote.line_items.forEach((item: LineItem) => {
      if (item.is_other) {
        const other: OtherService = {
          description: item.description ?? '',
          amount: item.flat_amount ? String(item.flat_amount) : '',
        }
        if (item.category === 'asphalt') asphOther = other
        else concOther = other
      } else if (item.service_id) {
        newVolumes[item.service_id] = item.volume > 0 ? String(item.volume) : ''
      }
    })
    setVolumes(newVolumes)
    setOtherAsphalt(asphOther)
    setOtherConcrete(concOther)
  }, [existingQuote])

  const handleEstimatorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEstimatorName(e.target.value)
    localStorage.setItem('estimator_name', e.target.value)
  }

  const asphaltRates = rates.filter(r => r.category === 'asphalt' || r.category === 'both')
  const concreteRates = rates.filter(r => r.category === 'concrete' || r.category === 'both')

  const calcTierTotal = (list: ServiceRate[], tier: Tier, other: OtherService): number => {
    const svcTotal = list.reduce((sum, r) => {
      const rate = tier === 'low' ? r.rate_low : tier === 'mid' ? r.rate_mid : r.rate_high
      return sum + volNum(volumes[r.id]) * rate
    }, 0)
    return svcTotal + (parseFloat(other.amount) || 0)
  }

  const subtotals = { low: 0, mid: 0, high: 0 }
  if (quoteType !== 'concrete') {
    subtotals.low += calcTierTotal(asphaltRates, 'low', otherAsphalt)
    subtotals.mid += calcTierTotal(asphaltRates, 'mid', otherAsphalt)
    subtotals.high += calcTierTotal(asphaltRates, 'high', otherAsphalt)
  }
  if (quoteType !== 'asphalt') {
    subtotals.low += calcTierTotal(concreteRates, 'low', otherConcrete)
    subtotals.mid += calcTierTotal(concreteRates, 'mid', otherConcrete)
    subtotals.high += calcTierTotal(concreteRates, 'high', otherConcrete)
  }

  const taxAmt = parseFloat(tax) || 0
  const discountAmt = parseFloat(discount) || 0
  const balanceDue = subtotals[selectedTier] + taxAmt - discountAmt

  const getLineTotal = (service: ServiceRate): number => {
    const rate = selectedTier === 'low' ? service.rate_low : selectedTier === 'mid' ? service.rate_mid : service.rate_high
    return volNum(volumes[service.id]) * rate
  }

  const buildLineItems = (): LineItem[] => {
    const items: LineItem[] = []
    const addItems = (list: ServiceRate[], category: 'asphalt' | 'concrete', other: OtherService) => {
      list.forEach(r => {
        const v = volNum(volumes[r.id])
        items.push({
          service_id: r.id,
          service_name: r.service_name,
          unit: r.unit,
          category,
          volume: v,
          rate_low: r.rate_low,
          rate_mid: r.rate_mid,
          rate_high: r.rate_high,
          total_low: v * r.rate_low,
          total_mid: v * r.rate_mid,
          total_high: v * r.rate_high,
        })
      })
      const amt = parseFloat(other.amount) || 0
      if (other.description || amt > 0) {
        items.push({
          service_id: null,
          service_name: other.description || 'Other Services',
          unit: 'flat',
          category,
          volume: 0,
          rate_low: 0, rate_mid: 0, rate_high: 0,
          total_low: amt, total_mid: amt, total_high: amt,
          is_other: true,
          description: other.description,
          flat_amount: amt,
        })
      }
    }
    if (quoteType !== 'concrete') addItems(asphaltRates, 'asphalt', otherAsphalt)
    if (quoteType !== 'asphalt') addItems(concreteRates, 'concrete', otherConcrete)
    return items
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        business_id: BUSINESS_ID,
        quote_type: quoteType,
        selected_tier: selectedTier,
        line_items: buildLineItems(),
        subtotal_low: subtotals.low,
        subtotal_mid: subtotals.mid,
        subtotal_high: subtotals.high,
        tax: taxAmt,
        discount: discountAmt,
        total: balanceDue,
        status: existingQuote?.status ?? 'draft',
        estimator_name: estimatorName,
        customer_name: customerName,
        customer_phone: customerPhone,
        address,
        notes,
      }

      if (isEdit && existingQuote) {
        const { error } = await supabase
          .from('quotes')
          .update(payload)
          .eq('id', existingQuote.id)
          .eq('business_id', BUSINESS_ID)
        if (error) throw error
        router.push(`/quotes/${existingQuote.id}`)
      } else {
        const { data, error } = await supabase
          .from('quotes')
          .insert(payload)
          .select()
          .single()
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

  const inputCls = 'h-11 px-3 bg-[#1C1C1E] border border-white/[0.08] rounded-xl text-[#F5F5F5] text-base focus:outline-none focus:border-[#3FA82A] transition-colors'
  const smInputCls = 'h-10 px-3 bg-[#1C1C1E] border border-white/[0.08] rounded-xl text-[#F5F5F5] text-sm focus:outline-none focus:border-[#3FA82A] transition-colors'

  const renderServiceRow = (service: ServiceRate) => {
    const lineTotal = getLineTotal(service)
    const hasVolume = volNum(volumes[service.id]) > 0
    return (
      <div
        key={service.id}
        className={`flex items-center gap-3 py-3 border-b border-white/[0.05] last:border-b-0 transition-opacity ${!hasVolume ? 'opacity-40' : ''}`}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#F5F5F5] leading-tight">{service.service_name}</p>
          <p className="text-xs text-[#888888] mt-0.5">{service.unit}</p>
        </div>
        <input
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={volumes[service.id] || ''}
          onChange={(e) => setVolumes(prev => ({ ...prev, [service.id]: e.target.value }))}
          className={`w-24 text-right ${inputCls}`}
        />
        <div className="w-24 text-right shrink-0">
          <span className={`text-sm font-semibold ${hasVolume ? 'text-[#F5F5F5]' : 'text-[#888888]'}`}>
            {hasVolume ? fmt(lineTotal) : '—'}
          </span>
        </div>
      </div>
    )
  }

  const renderOtherRow = (value: OtherService, onChange: (v: OtherService) => void) => (
    <div className="pt-3 mt-1">
      <p className="text-xs font-bold text-[#3FA82A] mb-2 uppercase tracking-wider">Other Services</p>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Description (optional)"
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          className={`flex-1 ${smInputCls} placeholder:text-[#888888]`}
        />
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[#888888] text-sm">$</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={value.amount}
            onChange={(e) => onChange({ ...value, amount: e.target.value })}
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
    onOtherChange: (v: OtherService) => void,
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
          <div className="flex items-center gap-3 pb-2 mb-1 border-b border-white/[0.08]">
            <p className="flex-1 text-xs font-semibold text-[#888888] uppercase tracking-wide">Service</p>
            <p className="w-24 text-right text-xs font-semibold text-[#888888] uppercase tracking-wide">Vol.</p>
            <p className="w-24 text-right text-xs font-semibold text-[#888888] uppercase tracking-wide">Total</p>
          </div>
          {list.map(renderServiceRow)}
        </>
      )}
      {renderOtherRow(other, onOtherChange)}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#111111]">
      <PageHeader
        title={isEdit ? 'Edit Quote' : 'New Quote'}
        backHref={isEdit && existingQuote ? `/quotes/${existingQuote.id}` : '/'}
      />

      <div className="p-4 space-y-4" style={{ paddingBottom: '120px' }}>
        {/* Customer Info */}
        <Card className="p-4 space-y-3">
          <p className="text-xs font-bold text-[#888888] uppercase tracking-widest">Customer Info</p>
          <input
            type="text"
            placeholder="Customer Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className={`w-full ${inputCls} placeholder:text-[#888888]`}
          />
          <input
            type="text"
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={`w-full ${inputCls} placeholder:text-[#888888]`}
          />
          <input
            type="tel"
            inputMode="tel"
            placeholder="Phone Number"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className={`w-full ${inputCls} placeholder:text-[#888888]`}
          />
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Estimator Name"
              value={estimatorName}
              onChange={handleEstimatorChange}
              className={`flex-1 ${inputCls} placeholder:text-[#888888]`}
            />
            <input
              type="date"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
              className={`w-36 ${inputCls}`}
            />
          </div>
        </Card>

        {/* Quote Type */}
        <Card className="p-4">
          <p className="text-xs font-bold text-[#888888] uppercase tracking-widest mb-3">Quote Type</p>
          <div className="flex gap-2">
            {(['asphalt', 'concrete', 'both'] as QuoteType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setQuoteType(type)}
                className={`flex-1 h-12 rounded-xl font-semibold text-sm transition-all active:scale-95 capitalize ${
                  quoteType === type
                    ? 'bg-[#3FA82A] text-white'
                    : 'bg-[#1C1C1E] text-[#888888] border border-white/[0.08]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </Card>

        {/* Tier Selector — live totals update as volumes are entered */}
        <Card className="p-4">
          <p className="text-xs font-bold text-[#888888] uppercase tracking-widest mb-3">Pricing Tier</p>
          <TierSelector selected={selectedTier} onChange={setSelectedTier} totals={subtotals} />
        </Card>

        {/* Services */}
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

        {/* Totals */}
        <Card className="p-4">
          <p className="text-xs font-bold text-[#888888] uppercase tracking-widest mb-3">Price Summary</p>
          <TierSelector selected={selectedTier} onChange={setSelectedTier} totals={subtotals} />

          <div className="mt-4 space-y-3 pt-4 border-t border-white/[0.08]">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#888888]">Tax / Fees</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#888888] text-sm">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  className={`w-28 text-right ${smInputCls}`}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#888888]">Discount</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#888888] text-sm">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className={`w-28 text-right ${smInputCls}`}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
              <span className="text-xl font-bold text-[#F5F5F5]">Balance Due</span>
              <span className="text-3xl font-bold text-[#3FA82A]">{fmt(balanceDue)}</span>
            </div>
          </div>
        </Card>

        {/* Notes */}
        <Card className="p-4">
          <p className="text-xs font-bold text-[#888888] uppercase tracking-widest mb-3">Comments / Notes</p>
          <textarea
            placeholder="Add notes, special instructions, conditions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 bg-[#1C1C1E] border border-white/[0.08] rounded-xl text-[#F5F5F5] placeholder:text-[#888888] text-base focus:outline-none focus:border-[#3FA82A] transition-colors resize-none"
          />
        </Card>
      </div>

      {/* Sticky save bar */}
      <div
        className="fixed left-0 right-0 p-4 bg-[#111111]/95 backdrop-blur-sm border-t border-white/[0.08]"
        style={{ bottom: 'calc(64px + env(safe-area-inset-bottom))' }}
      >
        <Button fullWidth size="lg" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Quote'}
        </Button>
      </div>
    </div>
  )
}
