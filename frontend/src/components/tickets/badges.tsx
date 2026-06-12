import { Badge } from "@/components/ui/Badge";
import type { Priority, TicketStatus } from "@/lib/types";

const STATUS: Record<
  TicketStatus,
  { tone: "indigo" | "amber" | "green" | "gray"; label: string }
> = {
  OPEN: { tone: "indigo", label: "Open" },
  IN_PROGRESS: { tone: "amber", label: "In progress" },
  RESOLVED: { tone: "green", label: "Resolved" },
  CLOSED: { tone: "gray", label: "Closed" },
};

const PRIORITY: Record<
  Priority,
  { tone: "red" | "amber" | "indigo" | "gray"; label: string }
> = {
  URGENT: { tone: "red", label: "Urgent" },
  HIGH: { tone: "amber", label: "High" },
  MEDIUM: { tone: "indigo", label: "Medium" },
  LOW: { tone: "gray", label: "Low" },
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const s = STATUS[status];
  return (
    <Badge tone={s.tone} dot pulse={status === "IN_PROGRESS"}>
      {s.label}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const p = PRIORITY[priority];
  return <Badge tone={p.tone}>{p.label}</Badge>;
}
