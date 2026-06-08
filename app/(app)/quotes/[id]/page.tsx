'use client'

import { useParams } from 'next/navigation'
import QuoteBuilder from '../QuoteBuilder'

export default function EditQuotePage() {
  const { id } = useParams<{ id: string }>()
  return <QuoteBuilder quoteId={id} />
}
