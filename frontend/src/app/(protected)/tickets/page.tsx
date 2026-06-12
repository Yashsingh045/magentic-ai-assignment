"use client";

import { useCallback, useEffect, useState } from "react";
import { IconClose, IconTickets } from "@/components/icons";
import { PriorityBadge, StatusBadge } from "@/components/tickets/badges";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import type { Priority, Ticket, TicketStatus } from "@/lib/types";

const STATUS_OPTIONS: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];
const PRIORITY_OPTIONS: Priority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];

// Mirror of the backend's allowed transitions → action buttons.
const NEXT_ACTIONS: Record<
  TicketStatus,
  { label: string; to: TicketStatus; variant?: "primary" | "secondary" }[]
> = {
  OPEN: [
    { label: "Start", to: "IN_PROGRESS" },
    { label: "Close", to: "CLOSED", variant: "secondary" },
  ],
  IN_PROGRESS: [
    { label: "Resolve", to: "RESOLVED" },
    { label: "Reopen", to: "OPEN", variant: "secondary" },
    { label: "Close", to: "CLOSED", variant: "secondary" },
  ],
  RESOLVED: [
    { label: "Close", to: "CLOSED" },
    { label: "Reopen", to: "IN_PROGRESS", variant: "secondary" },
  ],
  CLOSED: [{ label: "Reopen", to: "OPEN", variant: "secondary" }],
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "">("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchTickets = useCallback(async () => {
    setTickets(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      const { data } = await api.get<Ticket[]>(
        `/tickets${params.toString() ? `?${params}` : ""}`,
      );
      setTickets(data);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setTickets([]);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  async function changeStatus(ticket: Ticket, status: TicketStatus) {
    setUpdating(true);
    setError(null);
    try {
      const { data } = await api.patch<Ticket>(`/tickets/${ticket.id}`, {
        status,
      });
      setTickets(
        (prev) => prev?.map((t) => (t.id === data.id ? data : t)) ?? null,
      );
      setSelected(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  }

  const loading = tickets === null;

  return (
    <div>
      <PageHeader
        title="Tickets"
        description="Support tickets created by the AI or your team."
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          label="Status"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as TicketStatus | "")}
          options={STATUS_OPTIONS}
        />
        <Select
          label="Priority"
          value={priorityFilter}
          onChange={(v) => setPriorityFilter(v as Priority | "")}
          options={PRIORITY_OPTIONS}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <ListSkeleton rows={5} />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={<IconTickets className="h-6 w-6" />}
          title="No tickets"
          description={
            statusFilter || priorityFilter
              ? "No tickets match these filters."
              : "Tickets created by the AI or your team will appear here."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Query</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {t.customerName}
                    </p>
                    <p className="text-xs text-gray-400">{t.customerEmail}</p>
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <p className="truncate text-gray-700">{t.query}</p>
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-gray-500 md:table-cell">
                    {formatDate(t.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <TicketDrawer
          ticket={selected}
          updating={updating}
          onClose={() => setSelected(null)}
          onChangeStatus={changeStatus}
        />
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o.replace("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function TicketDrawer({
  ticket,
  updating,
  onClose,
  onChangeStatus,
}: {
  ticket: Ticket;
  updating: boolean;
  onClose: () => void;
  onChangeStatus: (ticket: Ticket, status: TicketStatus) => void;
}) {
  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-gray-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="animate-widget-in absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Ticket details
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <IconClose />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>

          <Field label="Customer">
            <p className="font-medium text-gray-900">{ticket.customerName}</p>
            <p className="text-sm text-gray-500">{ticket.customerEmail}</p>
          </Field>

          <Field label="Query">
            <p className="whitespace-pre-wrap text-sm text-gray-800">
              {ticket.query}
            </p>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Created">
              <p className="text-sm text-gray-700">
                {formatDate(ticket.createdAt)}
              </p>
            </Field>
            {ticket.conversationId && (
              <Field label="Conversation">
                <p className="truncate text-sm text-gray-700">
                  {ticket.conversationId}
                </p>
              </Field>
            )}
          </div>
        </div>

        {/* Status controls */}
        <div className="border-t border-gray-200 p-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Update status
          </p>
          <div className="flex flex-wrap gap-2">
            {NEXT_ACTIONS[ticket.status].map((action) => (
              <Button
                key={action.to}
                size="sm"
                variant={action.variant ?? "primary"}
                loading={updating}
                onClick={() => onChangeStatus(ticket, action.to)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      {children}
    </div>
  );
}
