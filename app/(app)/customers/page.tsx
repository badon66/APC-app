import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { Users } from 'lucide-react'

export default function CustomersPage() {
  return (
    <div className="min-h-screen bg-base">
      <PageHeader title="Customers" />
      <EmptyState
        icon={Users}
        title="No customers yet"
        message="Tap + to add a customer"
      />
    </div>
  )
}
