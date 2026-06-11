import { IconEscalations } from "@/components/icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export default function EscalationsPage() {
  return (
    <div>
      <PageHeader
        title="Escalations"
        description="Urgent issues the AI flagged for human attention."
      />
      <EmptyState
        icon={<IconEscalations className="h-6 w-6" />}
        title="No escalations"
        description="When the AI detects an urgent or unresolved issue, it will appear here grouped by priority."
      />
    </div>
  );
}
