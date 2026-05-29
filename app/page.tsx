import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";

export default function QuotesPage() {
  return (
    <div>
      <PageHeader title="Quotes" actionLabel="+" actionHref="/quotes/new" />
      <div className="p-4">
        <EmptyState
          title="No quotes yet"
          description="Tap + to create your first quote"
        />
      </div>
    </div>
  );
}
