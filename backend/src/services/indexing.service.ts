/**
 * Knowledge-base indexing pipeline.
 * upload → parse → chunk → embed → store (with embeddings in pgvector).
 *
 * Scaffold: signatures are defined; implementations land with the
 * knowledge-base feature. Every operation is org-scoped via organizationId.
 */
import { prisma } from "../lib/prisma";
import { chunkText, extractText } from "../utils/fileParsers";
import { embedBatch, toVectorLiteral } from "./embedding.service";

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

    // Raw insert because Prisma can't yet bind the Unsupported("vector") type.
    for (let i = 0; i < chunks.length; i++) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "DocumentChunk" ("id","organizationId","documentId","content","embedding","chunkIndex")
         VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, $5)`,
        organizationId,
        documentId,
        chunks[i],
        toVectorLiteral(embeddings[i]),
        i,
      );
    }

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
