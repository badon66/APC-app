'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Quote, QuoteStatus, Tier, LineItem } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { BUSINESS_ID } from '@/lib/config'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return '$' + (n || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const TIER_STYLE: Record<Tier, string> = {
  low:  'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  mid:  'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  high: 'bg-[#3FA82A]/20 text-[#3FA82A] border border-[#3FA82A]/30',
}

const STATUS_CYCLE: QuoteStatus[]          = ['draft', 'sent', 'accepted']
const STATUS_LABELS: Record<QuoteStatus, string> = { draft: 'Draft', sent: 'Sent', accepted: 'Accepted' }

// Resolve the actual total for a line item using its stored tier (falls back to quote's global tier)
function itemTotal(item: LineItem, fallback: Tier): number {
  if (item.is_other) return item.flat_amount || 0
  if (item.line_total !== undefined) return item.line_total
  const tier = item.tier ?? fallback
  return tier === 'low' ? item.total_low : tier === 'mid' ? item.total_mid : item.total_high
}

// ─── component ──────────────────────────────────────────────────────────────

export default function QuoteDetail({ quote: initial }: { quote: Quote }) {
  const router = useRouter()
  const [quote,      setQuote]      = useState<Quote>(initial)
  const [updating,   setUpdating]   = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  // ── cycle quote status
  const cycleStatus = async () => {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(quote.status) + 1) % 3]
    setUpdating(true)
    const { error } = await supabase.from('quotes').update({ status: next })
      .eq('id', quote.id).eq('business_id', BUSINESS_ID)
    if (!error) setQuote(q => ({ ...q, status: next }))
    setUpdating(false)
  }

  // ── delete
  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase.from('quotes').delete()
      .eq('id', quote.id).eq('business_id', BUSINESS_ID)
    if (!error) router.push('/quotes')
    else { alert('Delete failed.'); setDeleting(false); setShowDelete(false) }
  }

  // ── line item grouping
  const allItems     = quote.line_items ?? []
  const asphaltItems = allItems.filter((i: LineItem) => i.category === 'asphalt')
  const concreteItems= allItems.filter((i: LineItem) => i.category === 'concrete')

  // ── render a group of line items
  const renderItems = (items: LineItem[], label?: string) => (
    <div>
      {label && (
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-bold text-[#888888] uppercase tracking-widest">{label}</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>
      )}

      <div className="flex items-center gap-2 pb-2 mb-1 border-b border-white/[0.08]">
        <p className="flex-1 text-xs font-semibold text-[#888888] uppercase tracking-wide">Service · Tier</p>
        <p className="w-16 text-right text-xs font-semibold text-[#888888] uppercase tracking-wide">Vol.</p>
        <p className="w-20 text-right text-xs font-semibold text-[#888888] uppercase tracking-wide">Total</p>
      </div>

      {items.map((item, i) => {
        const total    = itemTotal(item, quote.selected_tier)
        const hasValue = item.is_other ? (item.flat_amount || 0) > 0 : item.volume > 0
        const tier     = item.tier ?? quote.selected_tier

        return (
          <div key={i}
            className={`flex items-center gap-2 py-3 border-b border-white/[0.05] last:border-b-0 ${!hasValue ? 'opacity-40' : ''}`}>

            {/* Name + tier badge */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#F5F5F5] leading-tight truncate">
                {item.is_other && item.description ? item.description : item.service_name}
              </p>
              {!item.is_other && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[#888888]">{item.unit}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${TIER_STYLE[tier]}`}>
                    {tier}
                  </span>
                </div>
              )}
              {item.is_other && (
                <span className="text-[10px] text-[#888888] mt-0.5">flat rate</span>
              )}
            </div>

            {/* Volume */}
            <div className="w-16 text-right shrink-0">
              <span className="text-sm text-[#888888]">
                {item.is_other ? '—' : hasValue ? item.volume.toLocaleString() : '—'}
              </span>
            </div>

            {/* Total */}
            <div className="w-20 text-right shrink-0">
              <span className={`text-sm font-semibold ${hasValue ? 'text-[#F5F5F5]' : 'text-[#555]'}`}>
                {hasValue ? fmt(total) : '—'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )

  const formattedDate = new Date(quote.created_at).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[#111111]">
      <PageHeader title="Quote" backHref="/quotes" />

      <div className="p-4 space-y-4 pb-32">

        {/* ── Header: customer + status ── */}
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-[#F5F5F5] truncate">
                {quote.customer_name || 'No name'}
              </h2>
              {quote.address && (
                <p className="text-sm text-[#888888] mt-1 truncate">{quote.address}</p>
              )}
              {quote.customer_phone && (
                <p className="text-sm text-[#888888]">{quote.customer_phone}</p>
              )}
            </div>
            <button onClick={cycleStatus} disabled={updating}
              className="shrink-0 active:scale-95 transition-transform">
              <Badge variant={quote.status}>
                {STATUS_LABELS[quote.status]} ›
              </Badge>
            </button>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-white/[0.08] flex-wrap">
            <Badge variant={quote.quote_type}>
              {quote.quote_type.charAt(0).toUpperCase() + quote.quote_type.slice(1)}
            </Badge>
            <div className="ml-auto text-right">
              <p className="text-xs text-[#888888]">{formattedDate}</p>
              {quote.estimator_name && (
                <p className="text-xs text-[#888888]">{quote.estimator_name}</p>
              )}
            </div>
          </div>
        </Card>

        {/* ── Line items ── */}
        {allItems.length > 0 && (
          <Card className="p-4">
            {quote.quote_type === 'both' ? (
              <div className="space-y-6">
                {renderItems(asphaltItems, 'Asphalt Services')}
                <div className="h-px bg-white/[0.08]" />
                {renderItems(concreteItems, 'Concrete Services')}
              </div>
            ) : quote.quote_type === 'asphalt' ? (
              renderItems(asphaltItems)
            ) : (
              renderItems(concreteItems)
            )}
          </Card>
        )}

        {/* ── Price summary ── */}
        <Card className="p-4">
          <p className="text-xs font-bold text-[#888888] uppercase tracking-widest mb-4">Price Summary</p>

          {/* Hypothetical tier reference — stored subtotals per tier */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {(['low', 'mid', 'high'] as Tier[]).map(tier => {
              const sub   = tier === 'low' ? (quote.subtotal_low || 0) : tier === 'mid' ? (quote.subtotal_mid || 0) : (quote.subtotal_high || 0)
              const hyp   = sub + (quote.tax || 0) - (quote.discount || 0)
              const isSel = tier === quote.selected_tier
              return (
                <div key={tier}
                  className={`rounded-xl p-3 text-center border ${isSel ? 'bg-[#3FA82A]/10 border-[#3FA82A]/40' : 'bg-[#1C1C1E] border-white/[0.08]'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isSel ? 'text-[#3FA82A]' : 'text-[#888888]'}`}>{tier}</p>
                  <p className={`text-sm font-bold ${isSel ? 'text-[#3FA82A]' : 'text-[#F5F5F5]'}`}>{fmt(hyp)}</p>
                  <p className="text-[9px] text-[#888888] mt-0.5">if all at {tier}</p>
                </div>
              )
            })}
          </div>

          {/* Actual stored total */}
          <div className="space-y-3 pt-3 border-t border-white/[0.08]">
            {(quote.tax || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-[#888888]">Tax / Fees</span>
                <span className="text-sm font-semibold text-[#F5F5F5]">{fmt(quote.tax)}</span>
              </div>
            )}
            {(quote.discount || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-[#888888]">Discount</span>
                <span className="text-sm font-semibold text-red-400">− {fmt(quote.discount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
              <span className="text-xl font-bold text-[#F5F5F5]">Balance Due</span>
              <span className="text-3xl font-bold text-[#3FA82A]">{fmt(quote.total)}</span>
            </div>
          </div>
        </Card>

        {/* ── Notes ── */}
        {quote.notes && (
          <Card className="p-4">
            <p className="text-xs font-bold text-[#888888] uppercase tracking-widest mb-2">Notes</p>
            <p className="text-sm text-[#F5F5F5] leading-relaxed whitespace-pre-wrap">{quote.notes}</p>
          </Card>
        )}

        {/* ── Actions ── */}
        <Card className="p-4 space-y-3">
          <Link href={`/quotes/${quote.id}/edit`} className="block">
            <Button variant="secondary" fullWidth>Edit Quote</Button>
          </Link>
          <Button variant="danger" fullWidth onClick={() => setShowDelete(true)}>
            Delete Quote
          </Button>
        </Card>
      </div>

      {/* ── Delete confirmation ── */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
          <div className="w-full max-w-lg bg-[#1C1C1E] rounded-t-2xl p-6 pb-10">
            <h3 className="text-xl font-bold text-[#F5F5F5] mb-2">Delete Quote?</h3>
            <p className="text-[#888888] text-sm mb-6">This cannot be undone.</p>
            <div className="space-y-3">
              <Button variant="danger" fullWidth onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </Button>
              <Button variant="secondary" fullWidth onClick={() => setShowDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
