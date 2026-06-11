"use client";

import { useEffect, useState } from "react";
import {
  IconCheckCircle,
  IconConversations,
  IconEscalations,
  IconSparkles,
  IconTickets,
} from "@/components/icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ListSkeleton, StatGridSkeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";

interface DashboardStats {
  conversations: number;
  openTickets: number;
  resolvedTickets: number;
  escalations: number;
  resolutionRate: number; // 0..1
}

const EMPTY: DashboardStats = {
  conversations: 0,
  openTickets: 0,
  resolvedTickets: 0,
  escalations: 0,
  resolutionRate: 0,
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<DashboardStats>("/dashboard/stats")
      .then((r) => active && setStats(r.data))
      .catch((err) => active && setError(getApiErrorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Graceful zero-state: render the cards with zeros even if the call fails,
  // so a fresh org (or a transient error) still shows a coherent dashboard.
  const s = stats ?? EMPTY;
  const hasActivity = s.conversations > 0 || s.openTickets > 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="An overview of your support workspace."
      />

      {error && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700">
          Couldn&apos;t load live stats ({error}). Showing zeros.
        </div>
      )}

      {loading ? (
        <StatGridSkeleton count={5} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            label="Conversations"
            value={s.conversations}
            icon={<IconConversations className="h-5 w-5" />}
            hint="Total handled"
          />
          <StatCard
            label="Open Tickets"
            value={s.openTickets}
            icon={<IconTickets className="h-5 w-5" />}
            hint="Open or in progress"
          />
          <StatCard
            label="Resolved Tickets"
            value={s.resolvedTickets}
            icon={<IconCheckCircle className="h-5 w-5" />}
            hint="Resolved or closed"
          />
          <StatCard
            label="Escalations"
            value={s.escalations}
            icon={<IconEscalations className="h-5 w-5" />}
            hint="Flagged for humans"
          />
          <StatCard
            label="AI Resolution"
            value={`${Math.round(s.resolutionRate * 100)}%`}
            icon={<IconSparkles className="h-5 w-5" />}
            hint="Handled without escalation"
          />
        </div>
      )}

      <h3 className="mb-3 mt-8 text-sm font-semibold text-gray-900">
        Recent activity
      </h3>
      {loading ? (
        <ListSkeleton rows={4} />
      ) : hasActivity ? (
        <EmptyState
          title="Activity feed coming soon"
          description="A live timeline of conversations and tickets will appear here."
        />
      ) : (
        <EmptyState
          title="No activity yet"
          description="Conversations and tickets will appear here once your chat widget starts receiving messages."
        />
      )}
    </div>
  );
}
