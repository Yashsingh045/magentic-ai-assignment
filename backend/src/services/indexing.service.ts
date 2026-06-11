/**
 * Knowledge-base indexing pipeline.
 * parse → chunk (~800 tokens / 100 overlap) → embed (batched) → store
 * (embeddings in pgvector via raw SQL) → set Document INDEXED/FAILED.
 *
 * Designed for a long-running Express server (not serverless): a large document
 * is processed directly in one call, but OpenAI requests are batched and
 * rate-limited (see embedMany). Vector writes go through lib/pgvector.
 * Everything is org-scoped via organizationId.
 *
 * Naming note: kept as `indexing.service.ts` to match the codebase's
 * `*.service.ts` convention (document.service imports it). It is the "indexing"
 * service referenced in CLAUDE.md.
 */
import { prisma } from "../lib/prisma";
import { insertChunks, updateChunkEmbeddings } from "../lib/pgvector";
import { chunkText, extractText } from "../utils/fileParsers";
import { embedMany } from "./embedding.service";

export interface IndexDocumentInput {
  organizationId: string;
  documentId: string;
  buffer: Buffer;
  mimeType: string;
}

/**
 * Index a single uploaded document.
 *
 * Idempotent: any existing chunks for this document are deleted before insert,
 * so re-running (retry, re-upload, partial failure) never duplicates chunks.
 * On success the Document is marked INDEXED; on any failure FAILED (and the
 * error is rethrown for the caller to log).
 */
export async function indexDocument(input: IndexDocumentInput): Promise<void> {
  const { organizationId, documentId, buffer, mimeType } = input;

  try {
    // Idempotency: clear prior chunks for this document first.
    await prisma.documentChunk.deleteMany({ where: { documentId } });

    const text = await extractText(buffer, mimeType);
    const chunks = chunkText(text); // ~800 tokens, 100 overlap

    if (chunks.length === 0) {
      // Nothing to embed (empty/whitespace file) — still a valid indexed state.
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "INDEXED" },
      });
      return;
    }

    const embeddings = await embedMany(chunks);
    await insertChunks(
      chunks.map((content, i) => ({
        organizationId,
        documentId,
        content,
        embedding: embeddings[i],
        chunkIndex: i,
      })),
    );

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "INDEXED" },
    });
  } catch (err) {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "FAILED" },
    });
    throw err;
  }
}

/**
 * Rebuild embeddings for an entire org by re-embedding every existing chunk's
 * stored content and updating the vectors in place (the original files aren't
 * persisted). Idempotent by construction — updates rows by id rather than
 * inserting — so it can be re-run safely. Owning documents are marked INDEXED.
 * Documents that never produced chunks (e.g. previously FAILED) are skipped.
 */
export async function reindexOrganization(
  organizationId: string,
): Promise<{ chunks: number; documents: number }> {
  const chunks = await prisma.documentChunk.findMany({
    where: { organizationId },
    select: { id: true, content: true, documentId: true },
  });
  if (chunks.length === 0) return { chunks: 0, documents: 0 };

  const embeddings = await embedMany(chunks.map((c) => c.content));
  await updateChunkEmbeddings(
    chunks.map((c, i) => ({ id: c.id, embedding: embeddings[i] })),
  );

  const documentIds = [...new Set(chunks.map((c) => c.documentId))];
  const updated = await prisma.document.updateMany({
    where: { organizationId, id: { in: documentIds } },
    data: { status: "INDEXED" },
  });

  return { chunks: chunks.length, documents: updated.count };
}
