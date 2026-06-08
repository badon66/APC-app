'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Plus, ChevronRight } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import { BUSINESS_ID } from '@/lib/config'
import type { Tier, QuoteStatus } from '@/lib/config'

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceRate = {
  id: string
  service_name: string
  unit: string
  rate_low: number
  rate_mid: number
  rate_high: number
}

type QuoteItem = {
  tempId: string
  serviceRateId: string
  serviceName: string
  unit: string
  rateLow: number
  rateMid: number
  rateHigh: number
  quantity: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'quoted', label: 'Quoted' },
  { value: 'thinking_about_it', label: 'Thinking About It' },
  { value: 'sold', label: 'Sold' },
  { value: 'not_interested', label: 'Not Interested' },
]

const TIERS: { value: Tier; label: string; active: string }[] = [
  { value: 'low', label: 'Low', active: 'bg-info/15 text-info border-info/30' },
  { value: 'mid', label: 'Mid', active: 'bg-warning/15 text-warning border-warning/30' },
  { value: 'high', label: 'High', active: 'bg-accent/15 text-accent border-accent/30' },
]

const INACTIVE_TIER = 'bg-transparent text-muted border-white/8 hover:bg-white/5'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRate(item: QuoteItem, tier: Tier): number {
  if (tier === 'low') return item.rateLow
  if (tier === 'high') return item.rateHigh
  return item.rateMid
}

function fmtRate(rate: number, unit: string): string {
  if (unit === 'lbs') return `$${rate.toFixed(2)}/lb`
  if (unit === 'ft') return `$${rate.toFixed(2)}/ft`
  return `$${rate.toFixed(4)}/ft²`
}

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Component ────────────────────────────────────────────────────────────────

interface QuoteBuilderProps {
  quoteId?: string
}

export default function QuoteBuilder({ quoteId }: QuoteBuilderProps) {
  const router = useRouter()
  const isEdit = !!quoteId

  // Form
  const [customerName, setCustomerName] = useState('')
  const [address, setAddress] = useState('')
  const [tier, setTier] = useState<Tier>('mid')
  const [status, setStatus] = useState<QuoteStatus>('quoted')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<QuoteItem[]>([])

  // UI
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [services, setServices] = useState<ServiceRate[]>([])
  const [nameError, setNameError] = useState('')
  const [saveError, setSaveError] = useState('')

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (parseFloat(item.quantity) || 0) * getRate(item, tier),
        0
      ),
    [items, tier]
  )

  useEffect(() => {
    loadServices()
    if (isEdit) loadQuote()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Data loading ───────────────────────────────────────────────────────────

  async function loadServices() {
    const { data } = await supabase
      .from('service_rates')
      .select('id, service_name, unit, rate_low, rate_mid, rate_high')
      .eq('business_id', BUSINESS_ID)
      .eq('active', true)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('service_name')
    setServices(data ?? [])
  }

  async function loadQuote() {
    const [quoteRes, itemsRes] = await Promise.all([
      supabase
        .from('quotes')
        .select('customer_name, address, tier, status, notes')
        .eq('id', quoteId)
        .single(),
      supabase
        .from('quote_items')
        .select('id, service_rate_id, service_name, unit, rate_low, rate_mid, rate_high, quantity')
        .eq('quote_id', quoteId)
        .order('sort_order'),
    ])

    if (!quoteRes.data) {
      router.replace('/quotes')
      return
    }

    const q = quoteRes.data
    setCustomerName(q.customer_name)
    setAddress(q.address ?? '')
    setTier(q.tier as Tier)
    setStatus(q.status as QuoteStatus)
    setNotes(q.notes ?? '')
    setItems(
      (itemsRes.data ?? []).map(i => ({
        tempId: i.id,
        serviceRateId: i.service_rate_id ?? '',
        serviceName: i.service_name,
        unit: i.unit,
        rateLow: i.rate_low,
        rateMid: i.rate_mid,
        rateHigh: i.rate_high,
        quantity: String(i.quantity),
      }))
    )
    setLoading(false)
  }

  // ─── Item handlers ──────────────────────────────────────────────────────────

  function addItem(svc: ServiceRate) {
    setItems(prev => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        serviceRateId: svc.id,
        serviceName: svc.service_name,
        unit: svc.unit,
        rateLow: svc.rate_low,
        rateMid: svc.rate_mid,
        rateHigh: svc.rate_high,
        quantity: '',
      },
    ])
    setShowPicker(false)
  }

  function removeItem(tempId: string) {
    setItems(prev => prev.filter(i => i.tempId !== tempId))
  }

  function setQty(tempId: string, qty: string) {
    setItems(prev => prev.map(i => (i.tempId === tempId ? { ...i, quantity: qty } : i)))
  }

  // ─── Save / Delete ──────────────────────────────────────────────────────────

  async function save() {
    if (!customerName.trim()) {
      setNameError('Customer name is required.')
      return
    }
    setNameError('')
    setSaveError('')
    setSaving(true)

    const quotePayload = {
      business_id: BUSINESS_ID,
      customer_name: customerName.trim(),
      address: address.trim() || null,
      tier,
      status,
      total,
      notes: notes.trim() || null,
    }

    let savedId = quoteId

    if (isEdit) {
      const { error } = await supabase.from('quotes').update(quotePayload).eq('id', quoteId)
      if (error) {
        setSaving(false)
        setSaveError('Failed to update quote. Please try again.')
        return
      }
      await supabase.from('quote_items').delete().eq('quote_id', quoteId)
    } else {
      const { data, error } = await supabase
        .from('quotes')
        .insert(quotePayload)
        .select('id')
        .single()
      if (error || !data) {
        setSaving(false)
        setSaveError('Failed to save quote. Please try again.')
        return
      }
      savedId = data.id
    }

    if (items.length > 0 && savedId) {
      await supabase.from('quote_items').insert(
        items.map((item, i) => ({
          quote_id: savedId,
          service_rate_id: item.serviceRateId || null,
          service_name: item.serviceName,
          unit: item.unit,
          rate_low: item.rateLow,
          rate_mid: item.rateMid,
          rate_high: item.rateHigh,
          quantity: parseFloat(item.quantity) || 0,
          sort_order: i,
        }))
      )
    }

    setSaving(false)
    router.push(`/quotes/${savedId}`)
  }

  async function deleteQuote() {
    setDeleting(true)
    await supabase.from('quotes').delete().eq('id', quoteId)
    router.replace('/quotes')
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-base">
        <PageHeader title="Quote" backHref="/quotes" />
        <p className="text-sm text-muted text-center py-16">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base">
      <PageHeader
        title={isEdit ? customerName || 'Edit Quote' : 'New Quote'}
        backHref="/quotes"
      />

      <div className="p-4 space-y-6 pb-40">

        {/* ── Customer ── */}
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">
            Customer
          </h2>
          <Card>
            <div className="space-y-4">
              <Input
                label="Name"
                value={customerName}
                onChange={e => {
                  setCustomerName(e.target.value)
                  if (nameError) setNameError('')
                }}
                placeholder="John Smith"
                error={nameError}
              />
              <Input
                label="Address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="123 Main St, Calgary, AB"
              />
            </div>
          </Card>
        </section>

        {/* ── Pricing Tier ── */}
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">
            Pricing Tier
          </h2>
          <Card padding="sm">
            <div className="grid grid-cols-3 gap-2">
              {TIERS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTier(t.value)}
                  className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                    tier === t.value ? t.active : INACTIVE_TIER
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Card>
        </section>

        {/* ── Services ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-widest">
              Services
            </h2>
            <Button size="sm" variant="secondary" onClick={() => setShowPicker(true)}>
              <Plus size={14} />
              Add Service
            </Button>
          </div>

          {items.length === 0 ? (
            <Card>
              <p className="text-sm text-muted text-center py-4">No services added yet.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {items.map(item => {
                const rate = getRate(item, tier)
                const qty = parseFloat(item.quantity) || 0
                return (
                  <Card key={item.tempId} padding="sm">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold text-foreground leading-tight truncate">
                            {item.serviceName}
                          </p>
                          <span className="text-sm font-bold text-foreground shrink-0">
                            {fmtMoney(qty * rate)}
                          </span>
                        </div>
                        <p className="text-xs text-muted mb-2">{fmtRate(rate, item.unit)}</p>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={item.quantity}
                          onChange={e => setQty(item.tempId, e.target.value)}
                          rightElement={
                            <span className="text-xs text-muted whitespace-nowrap">
                              {item.unit}
                            </span>
                          }
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.tempId)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-danger/10 text-muted hover:text-danger transition-colors shrink-0 mt-0.5"
                        aria-label="Remove service"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Total ── */}
        <div className="flex items-center justify-between px-4 py-4 bg-accent/10 border border-accent/20 rounded-xl">
          <span className="text-sm font-semibold text-foreground">Quote Total</span>
          <span className="text-2xl font-bold text-accent">{fmtMoney(total)}</span>
        </div>

        {/* ── Details ── */}
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">
            Details
          </h2>
          <Card>
            <div className="space-y-4">
              <Select
                label="Status"
                options={STATUS_OPTIONS}
                value={status}
                onChange={e => setStatus(e.target.value as QuoteStatus)}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Additional notes…"
                  rows={3}
                  className="w-full px-3.5 py-3 bg-surface border border-white/8 rounded-xl text-foreground placeholder:text-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-none"
                />
              </div>
            </div>
          </Card>
        </section>

        {/* ── Delete (edit only) ── */}
        {isEdit && (
          <section>
            {!confirmDel ? (
              <Button
                fullWidth
                variant="ghost"
                className="text-danger hover:bg-danger/10"
                onClick={() => setConfirmDel(true)}
              >
                <Trash2 size={14} />
                Delete Quote
              </Button>
            ) : (
              <Card>
                <p className="text-sm text-center text-muted mb-3">
                  Permanently delete this quote?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => setConfirmDel(false)}>
                    Cancel
                  </Button>
                  <Button variant="danger" onClick={deleteQuote} loading={deleting}>
                    Delete
                  </Button>
                </div>
              </Card>
            )}
          </section>
        )}

        {saveError && (
          <p className="text-sm text-danger text-center">{saveError}</p>
        )}
      </div>

      {/* ── Sticky save bar (sits above bottom nav) ── */}
      <div className="fixed bottom-20 left-0 right-0 z-40 px-4 pt-2 pb-2 bg-base border-t border-white/8">
        <Button fullWidth size="lg" onClick={save} loading={saving}>
          {isEdit ? 'Update Quote' : 'Save Quote'}
        </Button>
      </div>

      {/* ── Service picker modal ── */}
      <Modal open={showPicker} onClose={() => setShowPicker(false)} title="Add Service">
        {services.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">
            No active services. Configure them in Settings.
          </p>
        ) : (
          <div className="space-y-1">
            {services.map(svc => (
              <button
                key={svc.id}
                type="button"
                onClick={() => addItem(svc)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 active:bg-white/8 transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{svc.service_name}</p>
                  <p className="text-xs text-muted">{svc.unit}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-muted">
                  <span className="text-xs">Mid: ${svc.rate_mid.toFixed(2)}</span>
                  <ChevronRight size={14} />
                </div>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
