"use client";

import { useEffect, useState } from "react";
import {
  IconConversations,
  IconEscalations,
  IconKnowledge,
  IconTickets,
} from "@/components/icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ListSkeleton, StatGridSkeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";

interface DashboardStats {
  conversations: number;
  tickets: number;
  documents: number;
  resolutionRate: number; // 0..1
}

const EMPTY: DashboardStats = {
  conversations: 0,
  tickets: 0,
  documents: 0,
  resolutionRate: 0,
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .get<DashboardStats>("/dashboard/stats")
      .then((r) => active && setStats(r.data))
      // Endpoint ships in the Dashboard feature; degrade to zeros until then.
      .catch(() => active && setStats(EMPTY))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="An overview of your support workspace."
      />

      {loading ? (
        <StatGridSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Conversations"
            value={stats?.conversations ?? 0}
            icon={<IconConversations className="h-5 w-5" />}
            hint="Total handled"
          />
          <StatCard
            label="Open Tickets"
            value={stats?.tickets ?? 0}
            icon={<IconTickets className="h-5 w-5" />}
            hint="Needs attention"
          />
          <StatCard
            label="Documents"
            value={stats?.documents ?? 0}
            icon={<IconKnowledge className="h-5 w-5" />}
            hint="In knowledge base"
          />
          <StatCard
            label="AI Resolution"
            value={`${Math.round((stats?.resolutionRate ?? 0) * 100)}%`}
            icon={<IconEscalations className="h-5 w-5" />}
            hint="Resolved without escalation"
          />
        </div>
      )}

      <h3 className="mb-3 mt-8 text-sm font-semibold text-gray-900">
        Recent activity
      </h3>
      {loading ? (
        <ListSkeleton rows={4} />
      ) : (
        <EmptyState
          title="No recent activity yet"
          description="Conversations and tickets will appear here once your chat widget starts receiving messages."
        />
      )}
    </div>
  );
}
