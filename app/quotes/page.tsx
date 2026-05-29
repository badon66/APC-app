import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BUSINESS_ID } from '@/lib/config'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import type { Quote, QuoteStatus, QuoteType } from '@/lib/types'

export const dynamic = 'force-dynamic'

const TYPE_LABELS: Record<QuoteType, string> = {
  asphalt: 'Asphalt',
  concrete: 'Concrete',
  both: 'Both',
}

const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
}

function fmt(n: number) {
  return '$' + (n || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function QuotesListPage() {
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('id, quote_type, selected_tier, total, status, created_at, customer_name, address, customer_phone, estimator_name')
    .eq('business_id', BUSINESS_ID)
    .order('created_at', { ascending: false })

  const list = (quotes as Quote[]) ?? []

  return (
    <div>
      <PageHeader title="Quotes" actionLabel="+" actionHref="/quotes/new" />

      <div className="p-4 space-y-3">
        {error ? (
          <Card className="p-4">
            <p className="text-sm font-semibold text-red-400 mb-1">Failed to load quotes</p>
            <p className="text-xs text-[#888888] font-mono break-all">{error.message}</p>
          </Card>
        ) : list.length === 0 ? (
          <EmptyState
            title="No quotes yet"
            description="Tap + to create your first quote"
          />
        ) : (
          list.map((quote) => {
            const date = new Date(quote.created_at).toLocaleDateString('en-CA', {
              month: 'short', day: 'numeric', year: 'numeric',
            })
            return (
              <Link key={quote.id} href={`/quotes/${quote.id}`}>
                <Card className="p-4 active:scale-[0.98] transition-transform">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-[#F5F5F5] truncate">
                        {quote.customer_name || quote.address || 'Unnamed Quote'}
                      </p>
                      {quote.customer_name && quote.address && (
                        <p className="text-sm text-[#888888] truncate mt-0.5">{quote.address}</p>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-[#3FA82A] shrink-0">
                      {fmt(quote.total)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Badge variant={quote.quote_type as QuoteType}>
                      {TYPE_LABELS[quote.quote_type]}
                    </Badge>
                    <Badge variant="default">
                      {(quote.selected_tier || 'mid').toUpperCase()}
                    </Badge>
                    <Badge variant={quote.status as QuoteStatus}>
                      {STATUS_LABELS[quote.status]}
                    </Badge>
                    <span className="ml-auto text-xs text-[#888888]">{date}</span>
                  </div>
                </Card>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
