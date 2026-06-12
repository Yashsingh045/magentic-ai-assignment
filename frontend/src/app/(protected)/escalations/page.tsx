"use client";

import { useEffect, useState } from "react";
import { IconEscalations } from "@/components/icons";
import { PriorityBadge, StatusBadge } from "@/components/tickets/badges";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import type { EscalationItem, GroupedEscalations, Priority } from "@/lib/types";

const PRIORITY_ORDER: Priority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];

const GROUP_ACCENT: Record<Priority, string> = {
  URGENT: "border-l-red-500",
  HIGH: "border-l-amber-500",
  MEDIUM: "border-l-indigo-500",
  LOW: "border-l-gray-400",
};

export default function EscalationsPage() {
  const [groups, setGroups] = useState<GroupedEscalations | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<GroupedEscalations>("/escalations")
      .then((r) => active && setGroups(r.data))
      .catch((err) => active && setError(getApiErrorMessage(err)));
    return () => {
      active = false;
    };
  }, []);

  const loading = groups === null && !error;
  const total = groups
    ? PRIORITY_ORDER.reduce((n, p) => n + groups[p].length, 0)
    : 0;

  return (
    <div>
      <PageHeader
        title="Escalations"
        description="Issues the AI flagged for human attention, grouped by priority."
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <ListSkeleton rows={5} />
      ) : total === 0 ? (
        <EmptyState
          icon={<IconEscalations className="h-6 w-6" />}
          title="No escalations"
          description="When the AI detects an urgent or unresolved issue (refund, payment failure, outage, legal, angry, or human-requested), it appears here."
        />
      ) : (
        <div className="space-y-6">
          {PRIORITY_ORDER.map((priority) => {
            const items = groups![priority];
            if (items.length === 0) return null;
            return (
              <section key={priority}>
                <div className="mb-3 flex items-center gap-2">
                  <PriorityBadge priority={priority} />
                  <span className="text-sm text-gray-400">
                    {items.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {items.map((item) => (
                    <EscalationCard
                      key={item.id}
                      item={item}
                      accent={GROUP_ACCENT[priority]}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EscalationCard({
  item,
  accent,
}: {
  item: EscalationItem;
  accent: string;
}) {
  return (
    <div
      className={`rounded-xl border border-gray-200 border-l-4 ${accent} bg-white p-4 shadow-sm`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">{item.reason}</p>
        {item.ticket && <StatusBadge status={item.ticket.status} />}
      </div>
      {item.ticket && (
        <>
          <p className="mt-2 line-clamp-2 text-sm text-gray-600">
            “{item.ticket.query}”
          </p>
          <p className="mt-2 text-xs text-gray-400">
            {item.ticket.customerName} · {item.ticket.customerEmail}
          </p>
        </>
      )}
      <p className="mt-1 text-xs text-gray-400">{formatDate(item.createdAt)}</p>
    </div>
  );
}
