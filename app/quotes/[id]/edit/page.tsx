import { supabase } from '@/lib/supabase'
import { BUSINESS_ID } from '@/lib/config'
import QuoteForm from '../../new/QuoteForm'
import type { Quote, ServiceRate } from '@/lib/types'
import { notFound } from 'next/navigation'

export default async function EditQuotePage({ params }: { params: { id: string } }) {
  const [{ data: quote, error: qErr }, { data: rates, error: rErr }] = await Promise.all([
    supabase
      .from('quotes')
      .select('*')
      .eq('id', params.id)
      .eq('business_id', BUSINESS_ID)
      .single(),
    supabase
      .from('service_rates')
      .select('*')
      .eq('business_id', BUSINESS_ID)
      .eq('active', true)
      .order('sort_order'),
  ])

  if (qErr || !quote) notFound()

  return (
    <QuoteForm
      rates={(rates as ServiceRate[]) ?? []}
      existingQuote={quote as Quote}
    />
  )
}
