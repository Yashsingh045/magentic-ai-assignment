/**
 * RAG chat core (powers POST /chat).
 * Flow: embed query → pgvector top-K over the org's chunks → build prompt from
 * BotConfig + retrieved context → call OpenAI → persist messages → escalation
 * check → return rich content + suggested questions.
 *
 * Scaffold: retrieval is wired via lib/pgvector; the full orchestration lands
 * with the chat feature. Everything is org-scoped via organizationId.
 */
import { searchSimilarChunks, type SimilarChunk } from "../lib/pgvector";
import { embedText } from "./embedding.service";

/** Top-K cosine retrieval for one org's knowledge base. */
export async function retrieveContext(
  organizationId: string,
  query: string,
  k = 5,
): Promise<SimilarChunk[]> {
  const embedding = await embedText(query);
  return searchSimilarChunks(organizationId, embedding, k);
}
