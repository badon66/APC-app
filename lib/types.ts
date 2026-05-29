export type QuoteType = 'asphalt' | 'concrete' | 'both'
export type Tier = 'low' | 'mid' | 'high'
export type QuoteStatus = 'draft' | 'sent' | 'accepted'
export type JobStatus = 'new' | 'in_progress' | 'complete'
export type ServiceCategory = 'asphalt' | 'concrete' | 'both'

export interface ServiceRate {
  id: string
  business_id: string
  service_name: string
  unit: string
  category: ServiceCategory
  rate_low: number
  rate_mid: number
  rate_high: number
  active: boolean
  sort_order: number
}

export interface LineItem {
  service_id: string | null
  service_name: string
  unit: string
  category: 'asphalt' | 'concrete'
  volume: number
  rate_low: number
  rate_mid: number
  rate_high: number
  total_low: number
  total_mid: number
  total_high: number
  is_other?: boolean
  description?: string
  flat_amount?: number
}

export interface Quote {
  id: string
  business_id: string
  customer_id: string | null
  job_id: string | null
  quote_type: QuoteType
  selected_tier: Tier
  line_items: LineItem[]
  subtotal_low: number
  subtotal_mid: number
  subtotal_high: number
  tax: number
  discount: number
  total: number
  status: QuoteStatus
  estimator_name: string
  customer_name: string
  customer_phone: string
  address: string
  notes: string
  created_at: string
}

export interface Customer {
  id: string
  business_id: string
  name: string
  phone: string
  email: string
  address: string
  notes: string
  created_at: string
}

export interface Job {
  id: string
  business_id: string
  customer_id: string | null
  title: string
  status: JobStatus
  scheduled_date: string | null
  address: string
  notes: string
  earliest_date: string | null
  latest_date: string | null
  preferred_time: string
  booking_notes: string
  created_at: string
}
