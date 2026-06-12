import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error";
import type { ListConversationsQuery } from "../schemas/conversation.schema";

/**
 * Paginated, searchable conversation list. Search (`q`) matches the customer
 * name/email OR any message content in the conversation (case-insensitive).
 * Always org-scoped; ordered by most recent activity.
 */
export async function listConversations(
  organizationId: string,
  { q, page, pageSize }: ListConversationsQuery,
) {
  const where: Prisma.ConversationWhereInput = { organizationId };
  if (q) {
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { messages: { some: { content: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.conversation.count({ where }),
    prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { messages: true } },
        // Most recent message for a list preview.
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, role: true },
        },
      },
    }),
  ]);

  return {
    items: rows.map((c) => ({
      id: c.id,
      customerName: c.customerName,
      customerEmail: c.customerEmail,
      channel: c.channel,
      createdAt: c.createdAt,
      lastMessageAt: c.lastMessageAt,
      messageCount: c._count.messages,
      lastMessage: c.messages[0]
        ? { content: c.messages[0].content, role: c.messages[0].role }
        : null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Full conversation detail: messages + escalation events + tickets created for
 * this conversation. The frontend interleaves these into one timeline by
 * createdAt. 404 if it isn't this org's conversation.
 */
export async function getConversation(organizationId: string, id: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id, organizationId },
  });
  if (!conversation) throw new AppError(404, "Conversation not found");

  const [messages, escalations, tickets] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.escalationEvent.findMany({
      where: { conversationId: id, organizationId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        reason: true,
        priority: true,
        ticketId: true,
        createdAt: true,
      },
    }),
    prisma.ticket.findMany({
      where: { conversationId: id, organizationId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        priority: true,
        status: true,
        query: true,
        createdAt: true,
      },
    }),
  ]);

  return { ...conversation, messages, escalations, tickets };
}
