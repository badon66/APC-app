import { supabase } from '@/lib/supabase'
import { BUSINESS_ID } from '@/lib/config'
import QuoteForm from './QuoteForm'
import type { ServiceRate } from '@/lib/types'

export default async function NewQuotePage() {
  const { data: rates, error } = await supabase
    .from('service_rates')
    .select('*')
    .eq('business_id', BUSINESS_ID)
    .eq('active', true)
    .order('sort_order')

  if (error) console.error('Failed to load rates:', error)

  return <QuoteForm rates={(rates as ServiceRate[]) ?? []} />
}
