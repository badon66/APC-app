import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" />
      <div className="p-4">
        <Card className="p-4">
          <p className="text-[#888888] text-sm">Service rates and business info will be configurable here in Module 6.</p>
        </Card>
      </div>
    </div>
  );
}
