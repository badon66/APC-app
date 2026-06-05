import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { MapPin } from 'lucide-react'

export default function ProspectsPage() {
  return (
    <div className="min-h-screen bg-base">
      <PageHeader title="Prospects" />
      <EmptyState
        icon={MapPin}
        title="No prospects yet"
        message="Tap + to add a prospect"
      />
    </div>
  )
}
