import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { Briefcase } from 'lucide-react'

export default function JobsPage() {
  return (
    <div className="min-h-screen bg-base">
      <PageHeader title="Jobs" />
      <EmptyState
        icon={Briefcase}
        title="No jobs yet"
        message="Create a job from a customer profile"
      />
    </div>
  )
}
