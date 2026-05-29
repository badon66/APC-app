import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";

export default function CustomersPage() {
  return (
    <div>
      <PageHeader title="Customers" actionLabel="+" actionHref="/customers/new" />
      <div className="p-4">
        <EmptyState
          title="No customers yet"
          description="Tap + to add your first customer"
        />
      </div>
    </div>
  );
}
