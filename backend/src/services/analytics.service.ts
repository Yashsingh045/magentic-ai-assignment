import { prisma } from "../lib/prisma";

export interface AnalyticsResponse {
  chat: {
    totalConversations: number;
    /** Mean ASSISTANT Message.responseTimeMs (ms). 0 if none recorded. */
    avgResponseTimeMs: number;
    /** Share of conversations handled without escalation, 0..1. */
    resolutionRate: number;
    /** Share of conversations that produced an escalation, 0..1. */
    escalationRate: number;
  };
  kb: {
    mostReferencedDocs: {
      documentId: string;
      filename: string;
      references: number;
    }[];
    /** Count of AI turns that retrieved no KB context (a KB miss). */
    failedQueries: number;
    /** Recent customer questions that got no KB context — content gaps. */
    unansweredQuestions: { question: string; at: Date }[];
  };
}

/**
 * Org-scoped analytics. Computed from data instrumented during chat:
 *  - Conversation rows                         → total conversations
 *  - Message.responseTimeMs (ASSISTANT)        → avg response time
 *  - EscalationEvent (distinct conversationId) → escalation / resolution rate
 *  - Message.referencedDocIds (ASSISTANT)      → most-referenced docs;
 *    an empty array = no context retrieved = a "failed"/unanswered query
 */
export async function getAnalytics(
  organizationId: string,
): Promise<AnalyticsResponse> {
  const [totalConversations, avgAgg, escalatedGroups, messages] =
    await Promise.all([
      prisma.conversation.count({ where: { organizationId } }),
      prisma.message.aggregate({
        where: {
          conversation: { organizationId },
          role: "ASSISTANT",
          responseTimeMs: { not: null },
        },
        _avg: { responseTimeMs: true },
      }),
      prisma.escalationEvent.groupBy({
        by: ["conversationId"],
        where: { organizationId },
      }),
      // One ordered pass over messages powers the KB metrics below.
      prisma.message.findMany({
        where: { conversation: { organizationId } },
        orderBy: [{ conversationId: "asc" }, { createdAt: "asc" }],
        select: {
          conversationId: true,
          role: true,
          content: true,
          referencedDocIds: true,
          createdAt: true,
        },
      }),
    ]);

  const escalatedConversations = escalatedGroups.length;
  const escalationRate =
    totalConversations > 0 ? escalatedConversations / totalConversations : 0;
  const resolutionRate = totalConversations > 0 ? 1 - escalationRate : 0;

  // ---- KB metrics from referencedDocIds ----
  const refCounts = new Map<string, number>();
  const unanswered: { question: string; at: Date }[] = [];
  let failedQueries = 0;
  let lastUser: string | null = null;
  let currentConv: string | null = null;

  for (const m of messages) {
    if (m.conversationId !== currentConv) {
      currentConv = m.conversationId;
      lastUser = null;
    }
    if (m.role === "USER") {
      lastUser = m.content;
      continue;
    }
    // ASSISTANT
    const refs = Array.isArray(m.referencedDocIds)
      ? (m.referencedDocIds as string[])
      : [];
    if (refs.length === 0) {
      failedQueries++;
      if (lastUser) unanswered.push({ question: lastUser, at: m.createdAt });
    } else {
      for (const id of refs) refCounts.set(id, (refCounts.get(id) ?? 0) + 1);
    }
  }

  const topRefs = [...refCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const docs = await prisma.document.findMany({
    where: { organizationId, id: { in: topRefs.map(([id]) => id) } },
    select: { id: true, filename: true },
  });
  const nameById = new Map(docs.map((d) => [d.id, d.filename]));
  const mostReferencedDocs = topRefs.map(([id, references]) => ({
    documentId: id,
    filename: nameById.get(id) ?? "(deleted document)",
    references,
  }));

  unanswered.sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    chat: {
      totalConversations,
      avgResponseTimeMs: Math.round(avgAgg._avg.responseTimeMs ?? 0),
      resolutionRate,
      escalationRate,
    },
    kb: {
      mostReferencedDocs,
      failedQueries,
      unansweredQuestions: unanswered.slice(0, 10),
    },
  };
}
