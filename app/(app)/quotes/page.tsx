'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FileText } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import StatusBadge from '@/components/ui/StatusBadge'
import { supabase } from '@/lib/supabase'
import { BUSINESS_ID } from '@/lib/config'
import type { QuoteStatus } from '@/lib/config'

// ─── Types ────────────────────────────────────────────────────────────────────

type QuoteRow = {
  id: string
  customer_name: string
  address: string | null
  tier: string
  status: QuoteStatus
  total: number
  created_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_LABEL: Record<string, string> = {
  low: 'Low',
  mid: 'Mid',
  high: 'High',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuotesPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<QuoteRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQuotes()
  }, [])

  async function loadQuotes() {
    const { data } = await supabase
      .from('quotes')
      .select('id, customer_name, address, tier, status, total, created_at')
      .eq('business_id', BUSINESS_ID)
      .order('created_at', { ascending: false })
    setQuotes(data ?? [])
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-base">
      <PageHeader
        title="Quotes"
        rightElement={
          <Button size="sm" onClick={() => router.push('/quotes/new')}>
            <Plus size={14} />
            New
          </Button>
        }
      />

      {loading ? (
        <p className="text-sm text-muted text-center py-16">Loading…</p>
      ) : quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No quotes yet"
          message="Tap New to build your first quote"
          actionLabel="New Quote"
          onAction={() => router.push('/quotes/new')}
        />
      ) : (
        <div className="p-4 space-y-2 pb-8">
          {quotes.map(q => (
            <Card
              key={q.id}
              className="cursor-pointer active:opacity-70 transition-opacity"
              onClick={() => router.push(`/quotes/${q.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {q.customer_name}
                  </p>
                  {q.address && (
                    <p className="text-xs text-muted truncate mt-0.5">{q.address}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-muted">
                      {new Date(q.created_at).toLocaleDateString('en-CA', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-xs text-white/20">·</span>
                    <span className="text-xs text-muted">
                      {TIER_LABEL[q.tier] ?? q.tier} tier
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <StatusBadge status={q.status} size="sm" />
                  <p className="text-sm font-bold text-foreground">
                    ${q.total.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
