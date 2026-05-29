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
import TierSelector from '@/components/ui/TierSelector'
import Button from '@/components/ui/Button'

function fmt(n: number) {
  return '$' + (n || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const STATUS_CYCLE: QuoteStatus[] = ['draft', 'sent', 'accepted']
const STATUS_LABELS: Record<QuoteStatus, string> = { draft: 'Draft', sent: 'Sent', accepted: 'Accepted' }

export default function QuoteDetail({ quote: initial }: { quote: Quote }) {
  const router = useRouter()
  const [quote, setQuote] = useState<Quote>(initial)
  const [updating, setUpdating] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const cycleStatus = async () => {
    const idx = STATUS_CYCLE.indexOf(quote.status)
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
    setUpdating(true)
    const { error } = await supabase
      .from('quotes')
      .update({ status: next })
      .eq('id', quote.id)
      .eq('business_id', BUSINESS_ID)
    if (!error) setQuote(q => ({ ...q, status: next }))
    setUpdating(false)
  }

  const changeTier = async (tier: Tier) => {
    const selectedTotal = tier === 'low' ? quote.subtotal_low : tier === 'mid' ? quote.subtotal_mid : quote.subtotal_high
    const newTotal = selectedTotal + (quote.tax || 0) - (quote.discount || 0)
    setUpdating(true)
    const { error } = await supabase
      .from('quotes')
      .update({ selected_tier: tier, total: newTotal })
      .eq('id', quote.id)
      .eq('business_id', BUSINESS_ID)
    if (!error) setQuote(q => ({ ...q, selected_tier: tier, total: newTotal }))
    setUpdating(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', quote.id)
      .eq('business_id', BUSINESS_ID)
    if (!error) {
      router.push('/')
    } else {
      alert('Delete failed. Please try again.')
      setDeleting(false)
      setShowDelete(false)
    }
  }

  const subtotals = {
    low: quote.subtotal_low || 0,
    mid: quote.subtotal_mid || 0,
    high: quote.subtotal_high || 0,
  }

  const asphaltItems = (quote.line_items || []).filter((i: LineItem) => i.category === 'asphalt')
  const concreteItems = (quote.line_items || []).filter((i: LineItem) => i.category === 'concrete')

  const getItemTotal = (item: LineItem): number => {
    if (item.is_other) return item.flat_amount || 0
    return quote.selected_tier === 'low' ? item.total_low
      : quote.selected_tier === 'mid' ? item.total_mid
      : item.total_high
  }

  const renderLineItems = (items: LineItem[], label?: string) => (
    <div>
      {label && (
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-bold text-[#888888] uppercase tracking-widest">{label}</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>
      )}
      <div className="flex items-center gap-3 pb-2 mb-1 border-b border-white/[0.08]">
        <p className="flex-1 text-xs font-semibold text-[#888888] uppercase tracking-wide">Service</p>
        <p className="w-20 text-right text-xs font-semibold text-[#888888] uppercase tracking-wide">Vol.</p>
        <p className="w-24 text-right text-xs font-semibold text-[#888888] uppercase tracking-wide">Total</p>
      </div>
      {items.map((item, i) => {
        const total = getItemTotal(item)
        const hasValue = item.is_other ? (item.flat_amount || 0) > 0 : item.volume > 0
        return (
          <div
            key={i}
            className={`flex items-center gap-3 py-3 border-b border-white/[0.05] last:border-b-0 ${!hasValue ? 'opacity-40' : ''}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#F5F5F5] truncate">
                {item.is_other && item.description ? item.description : item.service_name}
              </p>
              {!item.is_other && (
                <p className="text-xs text-[#888888] mt-0.5">{item.unit}</p>
              )}
            </div>
            <div className="w-20 text-right shrink-0">
              <span className="text-sm text-[#888888]">
                {item.is_other ? 'flat' : hasValue ? item.volume.toLocaleString() : '—'}
              </span>
            </div>
            <div className="w-24 text-right shrink-0">
              <span className={`text-sm font-semibold ${hasValue ? 'text-[#F5F5F5]' : 'text-[#888888]'}`}>
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
      <PageHeader title="Quote" backHref="/" />

      <div className="p-4 space-y-4 pb-32">
        {/* Header info + Status */}
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
            <button
              onClick={cycleStatus}
              disabled={updating}
              className="shrink-0 active:scale-95 transition-transform"
            >
              <Badge variant={quote.status as QuoteStatus}>
                {STATUS_LABELS[quote.status]} ›
              </Badge>
            </button>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-white/[0.08]">
            <div className="flex gap-2 flex-wrap">
              <Badge variant={quote.quote_type as 'asphalt' | 'concrete' | 'both'}>
                {quote.quote_type.charAt(0).toUpperCase() + quote.quote_type.slice(1)}
              </Badge>
              <Badge variant="default">
                {quote.selected_tier.toUpperCase()} tier
              </Badge>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-[#888888]">{formattedDate}</p>
              {quote.estimator_name && (
                <p className="text-xs text-[#888888]">{quote.estimator_name}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Tier selector — still functional on detail */}
        <Card className="p-4">
          <p className="text-xs font-bold text-[#888888] uppercase tracking-widest mb-3">Pricing Tier</p>
          <TierSelector selected={quote.selected_tier} onChange={changeTier} totals={subtotals} />
        </Card>

        {/* Line items */}
        {(asphaltItems.length > 0 || concreteItems.length > 0) && (
          <Card className="p-4">
            {quote.quote_type === 'both' ? (
              <div className="space-y-6">
                {renderLineItems(asphaltItems, 'Asphalt Services')}
                <div className="h-px bg-white/[0.08]" />
                {renderLineItems(concreteItems, 'Concrete Services')}
              </div>
            ) : quote.quote_type === 'asphalt' ? (
              renderLineItems(asphaltItems)
            ) : (
              renderLineItems(concreteItems)
            )}
          </Card>
        )}

        {/* Price summary */}
        <Card className="p-4">
          <p className="text-xs font-bold text-[#888888] uppercase tracking-widest mb-4">Price Summary</p>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-[#888888]">Subtotal ({quote.selected_tier.toUpperCase()})</span>
              <span className="text-sm font-semibold text-[#F5F5F5]">{fmt(subtotals[quote.selected_tier])}</span>
            </div>
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
            <div className="flex justify-between pt-3 border-t border-white/[0.08]">
              <span className="text-xl font-bold text-[#F5F5F5]">Balance Due</span>
              <span className="text-3xl font-bold text-[#3FA82A]">{fmt(quote.total)}</span>
            </div>
          </div>
        </Card>

        {/* All three tier totals for reference */}
        <Card className="p-4">
          <p className="text-xs font-bold text-[#888888] uppercase tracking-widest mb-3">All Tier Totals</p>
          <div className="grid grid-cols-3 gap-3">
            {(['low', 'mid', 'high'] as Tier[]).map(tier => {
              const t = (tier === 'low' ? quote.subtotal_low : tier === 'mid' ? quote.subtotal_mid : quote.subtotal_high) + (quote.tax || 0) - (quote.discount || 0)
              const isSelected = quote.selected_tier === tier
              return (
                <div
                  key={tier}
                  className={`rounded-xl p-3 text-center border ${isSelected ? 'bg-[#3FA82A]/10 border-[#3FA82A]/40' : 'bg-[#1C1C1E] border-white/[0.08]'}`}
                >
                  <p className={`text-xs font-bold mb-1 uppercase tracking-wider ${isSelected ? 'text-[#3FA82A]' : 'text-[#888888]'}`}>{tier}</p>
                  <p className={`text-base font-bold ${isSelected ? 'text-[#3FA82A]' : 'text-[#F5F5F5]'}`}>{fmt(t)}</p>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Notes */}
        {quote.notes && (
          <Card className="p-4">
            <p className="text-xs font-bold text-[#888888] uppercase tracking-widest mb-2">Notes</p>
            <p className="text-sm text-[#F5F5F5] leading-relaxed whitespace-pre-wrap">{quote.notes}</p>
          </Card>
        )}

        {/* Actions */}
        <Card className="p-4 space-y-3">
          <Link href={`/quotes/${quote.id}/edit`} className="block">
            <Button variant="secondary" fullWidth>Edit Quote</Button>
          </Link>
          <Button
            variant="danger"
            fullWidth
            onClick={() => setShowDelete(true)}
          >
            Delete Quote
          </Button>
        </Card>
      </div>

      {/* Delete confirmation overlay */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
          <div className="w-full max-w-lg bg-[#1C1C1E] rounded-t-2xl p-6 pb-10">
            <h3 className="text-xl font-bold text-[#F5F5F5] mb-2">Delete Quote?</h3>
            <p className="text-[#888888] text-sm mb-6">
              This will permanently delete this quote. This action cannot be undone.
            </p>
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
