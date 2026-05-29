import { supabase } from '@/lib/supabase'
import { BUSINESS_ID } from '@/lib/config'
import QuoteDetail from './QuoteDetail'
import type { Quote } from '@/lib/types'
import { notFound } from 'next/navigation'

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', params.id)
    .eq('business_id', BUSINESS_ID)
    .single()

  if (error || !quote) notFound()

  return <QuoteDetail quote={quote as Quote} />
}
