import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";

export default function JobsPage() {
  return (
    <div>
      <PageHeader title="Jobs" actionLabel="+" actionHref="/jobs/new" />
      <div className="p-4">
        <EmptyState
          title="No jobs yet"
          description="Tap + to create your first job"
        />
      </div>
    </div>
  );
}
