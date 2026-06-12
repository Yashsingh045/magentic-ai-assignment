"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconConversations,
  IconEscalations,
  IconClose,
  IconTickets,
} from "@/components/icons";
import { PriorityBadge, StatusBadge } from "@/components/tickets/badges";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Markdown, RichContent } from "@/components/widget/RichContent";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import type {
  ConversationDetail,
  ConversationListResponse,
} from "@/lib/types";

export default function ConversationsPage() {
  const [data, setData] = useState<ConversationListResponse | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchList = useCallback(async (search: string, pageNum: number) => {
    setData(null);
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        pageSize: "20",
      });
      if (search.trim()) params.set("q", search.trim());
      const { data } = await api.get<ConversationListResponse>(
        `/conversations?${params}`,
      );
      setData(data);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, []);

  // Debounced search → reset to page 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchList(q, 1);
    }, 300);
    return () => clearTimeout(t);
  }, [q, fetchList]);

  function goToPage(p: number) {
    setPage(p);
    fetchList(q, p);
  }

  const loading = data === null && !error;

  return (
    <div>
      <PageHeader
        title="Conversations"
        description="Browse and search customer chat history."
      />

      <div className="mb-4 max-w-md">
        <Input
          placeholder="Search by customer or message…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <ListSkeleton rows={6} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<IconConversations className="h-6 w-6" />}
          title="No conversations"
          description={
            q ? "No conversations match your search." : "Customer chats will appear here."
          }
        />
      ) : (
        <>
          <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {data.items.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="flex w-full items-center gap-4 p-4 text-left hover:bg-gray-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                  {(c.customerName ?? "?").slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">
                    {c.customerName ?? "Anonymous visitor"}
                  </p>
                  <p className="truncate text-sm text-gray-500">
                    {c.lastMessage
                      ? `${c.lastMessage.role === "USER" ? "" : "AI: "}${c.lastMessage.content}`
                      : "No messages"}
                  </p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-xs text-gray-400">
                    {formatDate(c.lastMessageAt)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {c.messageCount} message{c.messageCount === 1 ? "" : "s"}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <span>
              {data.total} conversation{data.total === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Previous
              </Button>
              <span>
                Page {data.page} of {data.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {selectedId && (
        <ConversationDrawer
          id={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

type TimelineEntry =
  | { kind: "message"; at: string; data: ConversationDetail["messages"][number] }
  | {
      kind: "escalation";
      at: string;
      data: ConversationDetail["escalations"][number];
    }
  | { kind: "ticket"; at: string; data: ConversationDetail["tickets"][number] };

function buildTimeline(detail: ConversationDetail): TimelineEntry[] {
  return [
    ...detail.messages.map(
      (m): TimelineEntry => ({ kind: "message", at: m.createdAt, data: m }),
    ),
    ...detail.escalations.map(
      (e): TimelineEntry => ({ kind: "escalation", at: e.createdAt, data: e }),
    ),
    ...detail.tickets.map(
      (t): TimelineEntry => ({ kind: "ticket", at: t.createdAt, data: t }),
    ),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

function ConversationDrawer({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setDetail(null);
    api
      .get<ConversationDetail>(`/conversations/${id}`)
      .then((r) => active && setDetail(r.data))
      .catch((err) => active && setError(getApiErrorMessage(err)));
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-gray-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="animate-widget-in absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-gray-900">
              {detail?.customerName ?? "Conversation"}
            </h2>
            {detail && (
              <p className="text-xs text-gray-500">
                {detail.customerEmail ?? "no email"} · {detail.channel}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <IconClose />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-5">
          {error && (
            <p className="text-center text-sm text-red-600">{error}</p>
          )}
          {!detail && !error && <ListSkeleton rows={4} />}
          {detail &&
            buildTimeline(detail).map((entry) => (
              <TimelineRow key={`${entry.kind}-${entry.data.id}`} entry={entry} />
            ))}
        </div>
      </div>
    </div>
  );
}

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  if (entry.kind === "message") {
    const m = entry.data;
    const isUser = m.role === "USER";
    return (
      <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[85%]">
          <p
            className={`mb-1 text-xs text-gray-400 ${isUser ? "text-right" : ""}`}
          >
            {isUser ? "Customer" : "AI"} · {formatDate(m.createdAt)}
            {m.responseTimeMs != null && !isUser && ` · ${m.responseTimeMs}ms`}
          </p>
          <div
            className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${
              isUser
                ? "rounded-br-sm bg-indigo-600 text-white"
                : "rounded-bl-sm border border-gray-200 bg-white text-gray-800"
            }`}
          >
            {isUser ? (
              m.content
            ) : (
              <>
                <Markdown>{m.content}</Markdown>
                <RichContent blocks={m.richContent?.blocks} />
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (entry.kind === "escalation") {
    const e = entry.data;
    return (
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
          <IconEscalations className="h-4 w-4" />
          <span>Escalated — {e.reason}</span>
          <PriorityBadge priority={e.priority} />
        </div>
      </div>
    );
  }

  // ticket
  const t = entry.data;
  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs text-indigo-700">
        <IconTickets className="h-4 w-4" />
        <span>Ticket created</span>
        <PriorityBadge priority={t.priority} />
        <StatusBadge status={t.status} />
      </div>
    </div>
  );
}
