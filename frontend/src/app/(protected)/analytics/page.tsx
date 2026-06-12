"use client";

import { useEffect, useState } from "react";
import {
  IconConversations,
  IconEscalations,
  IconKnowledge,
  IconSparkles,
} from "@/components/icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatGridSkeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { formatDate, formatDuration } from "@/lib/format";
import type { Analytics } from "@/lib/types";

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<Analytics>("/analytics")
      .then((r) => active && setData(r.data))
      .catch((err) => active && setError(getApiErrorMessage(err)));
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div>
        <PageHeader title="Analytics" description="Chat and knowledge-base metrics." />
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <PageHeader title="Analytics" description="Chat and knowledge-base metrics." />
        <StatGridSkeleton count={4} />
      </div>
    );
  }

  const { chat, kb } = data;
  const maxRefs = Math.max(1, ...kb.mostReferencedDocs.map((d) => d.references));

  return (
    <div>
      <PageHeader title="Analytics" description="Chat and knowledge-base metrics." />

      {/* Chat metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Conversations"
          value={chat.totalConversations}
          icon={<IconConversations className="h-5 w-5" />}
          hint="Total handled"
        />
        <StatCard
          label="Avg response time"
          value={formatDuration(chat.avgResponseTimeMs)}
          icon={<IconSparkles className="h-5 w-5" />}
          hint="Per AI reply"
        />
        <StatCard
          label="AI resolution"
          value={`${Math.round(chat.resolutionRate * 100)}%`}
          icon={<IconKnowledge className="h-5 w-5" />}
          hint="No escalation"
        />
        <StatCard
          label="Escalation rate"
          value={`${Math.round(chat.escalationRate * 100)}%`}
          icon={<IconEscalations className="h-5 w-5" />}
          hint="Sent to humans"
        />
      </div>

      {/* Resolution vs escalation bar */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
        <p className="mb-2 text-sm font-medium text-gray-700">
          Resolution vs escalation
        </p>
        <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="bg-green-500"
            style={{ width: `${chat.resolutionRate * 100}%` }}
            title={`Resolved ${Math.round(chat.resolutionRate * 100)}%`}
          />
          <div
            className="bg-amber-500"
            style={{ width: `${chat.escalationRate * 100}%` }}
            title={`Escalated ${Math.round(chat.escalationRate * 100)}%`}
          />
        </div>
        <div className="mt-2 flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500" /> Resolved (
            {Math.round(chat.resolutionRate * 100)}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Escalated (
            {Math.round(chat.escalationRate * 100)}%)
          </span>
        </div>
      </div>

      {/* KB metrics */}
      <h3 className="mb-3 mt-8 text-sm font-semibold text-gray-900">
        Knowledge base
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Most referenced docs — bar chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              Most referenced documents
            </p>
            <span className="text-xs text-gray-400">references</span>
          </div>
          {kb.mostReferencedDocs.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              No document references yet.
            </p>
          ) : (
            <div className="space-y-3">
              {kb.mostReferencedDocs.map((d) => (
                <div key={d.documentId}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="truncate pr-2 text-gray-700">
                      {d.filename}
                    </span>
                    <span className="shrink-0 font-medium text-gray-900">
                      {d.references}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${(d.references / maxRefs) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unanswered questions */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              Unanswered questions
            </p>
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
              {kb.failedQueries} KB misses
            </span>
          </div>
          {kb.unansweredQuestions.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              Every question found a relevant document. 🎉
            </p>
          ) : (
            <ul className="space-y-2">
              {kb.unansweredQuestions.map((u, i) => (
                <li
                  key={i}
                  className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700"
                >
                  <p className="truncate">“{u.question}”</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {formatDate(u.at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {chat.totalConversations === 0 && (
        <div className="mt-6">
          <EmptyState
            title="No data yet"
            description="Analytics populate as your chat widget handles customer conversations."
          />
        </div>
      )}
    </div>
  );
}
