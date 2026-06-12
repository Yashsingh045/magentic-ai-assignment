import { TicketStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error";
import type {
  CreateTicketInput,
  ListTicketsQuery,
  UpdateTicketInput,
} from "../schemas/ticket.schema";

/**
 * Allowed status transitions. Forward progression
 * OPEN → IN_PROGRESS → RESOLVED → CLOSED, plus sensible reopens. Any other move
 * is rejected.
 */
const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "CLOSED"],
  IN_PROGRESS: ["RESOLVED", "OPEN", "CLOSED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: ["OPEN"],
};

/**
 * Create a ticket. Used by the admin POST /tickets endpoint and (later) called
 * directly by the chat engine when a query can't be resolved. Always org-scoped.
 */
export async function createTicket(
  organizationId: string,
  input: CreateTicketInput,
) {
  // If a conversation is linked, it must belong to this org (no cross-tenant link).
  if (input.conversationId) {
    const conv = await prisma.conversation.findFirst({
      where: { id: input.conversationId, organizationId },
      select: { id: true },
    });
    if (!conv) throw new AppError(400, "Invalid conversationId");
  }

  return prisma.ticket.create({
    data: {
      organizationId,
      conversationId: input.conversationId,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      query: input.query,
      priority: input.priority,
    },
  });
}

export async function listTickets(
  organizationId: string,
  filters: ListTicketsQuery,
) {
  return prisma.ticket.findMany({
    where: {
      organizationId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Org-scoped fetch; 404 if it isn't this org's ticket. */
async function getOwnedTicket(organizationId: string, id: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id, organizationId },
  });
  if (!ticket) throw new AppError(404, "Ticket not found");
  return ticket;
}

export async function updateTicket(
  organizationId: string,
  id: string,
  input: UpdateTicketInput,
) {
  const ticket = await getOwnedTicket(organizationId, id);

  if (input.status && input.status !== ticket.status) {
    if (!TRANSITIONS[ticket.status].includes(input.status)) {
      throw new AppError(
        400,
        `Cannot move ticket from ${ticket.status} to ${input.status}`,
      );
    }
  }

  return prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
    },
  });
}
