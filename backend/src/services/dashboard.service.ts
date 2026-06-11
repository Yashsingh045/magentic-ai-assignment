import { TicketStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface DashboardStats {
  conversations: number;
  openTickets: number;
  resolvedTickets: number;
  escalations: number;
  /** Share of conversations the AI handled without escalating, 0..1. */
  resolutionRate: number;
}

const OPEN_STATUSES: TicketStatus[] = [
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
];
const RESOLVED_STATUSES: TicketStatus[] = [
  TicketStatus.RESOLVED,
  TicketStatus.CLOSED,
];

/**
 * Org-scoped dashboard metrics. Every query filters on organizationId, so one
 * tenant can never see another's counts.
 *
 * AI resolution rate = (conversations that never escalated) / (total
 * conversations). A conversation counts as "escalated" if it produced at least
 * one EscalationEvent; we count distinct escalated conversations via groupBy so
 * multiple events on one conversation don't double-count.
 */
export async function getDashboardStats(
  organizationId: string,
): Promise<DashboardStats> {
  const [conversations, openTickets, resolvedTickets, escalations, escalatedGroups] =
    await Promise.all([
      prisma.conversation.count({ where: { organizationId } }),
      prisma.ticket.count({
        where: { organizationId, status: { in: OPEN_STATUSES } },
      }),
      prisma.ticket.count({
        where: { organizationId, status: { in: RESOLVED_STATUSES } },
      }),
      prisma.escalationEvent.count({ where: { organizationId } }),
      prisma.escalationEvent.groupBy({
        by: ["conversationId"],
        where: { organizationId },
      }),
    ]);

  const escalatedConversations = escalatedGroups.length;
  const resolutionRate =
    conversations > 0
      ? Math.max(0, (conversations - escalatedConversations) / conversations)
      : 0;

  return {
    conversations,
    openTickets,
    resolvedTickets,
    escalations,
    resolutionRate,
  };
}
