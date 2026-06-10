/**
 * RAG chat core (powers POST /chat).
 * Flow: embed query → pgvector top-K over the org's chunks → build prompt from
 * BotConfig + retrieved context → call OpenAI → persist messages → escalation
 * check → return rich content + suggested questions.
 *
 * Scaffold: retrieval helper is sketched; the full orchestration lands with the
 * chat feature. Everything is org-scoped via organizationId.
 */
import { prisma } from "../lib/prisma";
import { embedText, toVectorLiteral } from "./embedding.service";

export interface RetrievedChunk {
  id: string;
  documentId: string;
  content: string;
  distance: number;
}

/**
 * Top-K cosine search over a single org's DocumentChunks using pgvector's
 * `<=>` operator. Org filter in the WHERE clause enforces tenant isolation.
 */
export async function searchChunks(
  organizationId: string,
  query: string,
  k = 5,
): Promise<RetrievedChunk[]> {
  const embedding = toVectorLiteral(await embedText(query));

  return prisma.$queryRawUnsafe<RetrievedChunk[]>(
    `SELECT "id", "documentId", "content", ("embedding" <=> $1::vector) AS "distance"
     FROM "DocumentChunk"
     WHERE "organizationId" = $2
     ORDER BY "embedding" <=> $1::vector
     LIMIT $3`,
    embedding,
    organizationId,
    k,
  );
}
