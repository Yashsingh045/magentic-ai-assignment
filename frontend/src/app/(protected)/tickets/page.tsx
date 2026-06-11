import { IconTickets } from "@/components/icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export default function TicketsPage() {
  return (
    <div>
      <PageHeader
        title="Tickets"
        description="Manage support tickets created by the AI or your team."
      />
      <EmptyState
        icon={<IconTickets className="h-6 w-6" />}
        title="No tickets yet"
        description="Tickets are created automatically when the AI can't resolve a query, and can be filtered by status and priority."
      />
    </div>
  );
}
