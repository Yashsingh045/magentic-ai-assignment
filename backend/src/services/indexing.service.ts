/**
 * Knowledge-base indexing pipeline.
 * upload → parse → chunk → embed → store (embeddings in pgvector).
 *
 * Vector writes go through lib/pgvector (insertChunks). Every operation is
 * org-scoped via organizationId.
 */
import { prisma } from "../lib/prisma";
import { insertChunks } from "../lib/pgvector";
import { chunkText, extractText } from "../utils/fileParsers";
import { embedBatch } from "./embedding.service";

export interface IndexDocumentInput {
  organizationId: string;
  documentId: string;
  buffer: Buffer;
  mimeType: string;
}

/**
 * Parse a stored Document's file, chunk it, embed the chunks, and persist
 * DocumentChunk rows with their vectors. Updates Document.status accordingly.
 */
export async function indexDocument(input: IndexDocumentInput): Promise<void> {
  const { organizationId, documentId, buffer, mimeType } = input;

  try {
    const text = await extractText(buffer, mimeType);
    const chunks = chunkText(text);
    const embeddings = await embedBatch(chunks);

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
