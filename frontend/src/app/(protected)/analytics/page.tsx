import { IconAnalytics } from "@/components/icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AnalyticsPage() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Chat volume, resolution rate, and knowledge-base metrics."
      />
      <EmptyState
        icon={<IconAnalytics className="h-6 w-6" />}
        title="Analytics coming soon"
        description="Once conversations start flowing, you'll see chat and knowledge-base metrics here."
      />
    </div>
  );
}
