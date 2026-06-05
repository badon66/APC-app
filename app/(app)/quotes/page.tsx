import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { FileText } from 'lucide-react'

export default function QuotesPage() {
  return (
    <div className="min-h-screen bg-base">
      <PageHeader title="Quotes" />
      <EmptyState
        icon={FileText}
        title="No quotes yet"
        message="Tap + to create your first quote"
      />
    </div>
  )
}
