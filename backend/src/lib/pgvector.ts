import { randomUUID } from "crypto";
import { prisma } from "./prisma";

/**
 * pgvector access layer.
 *
 * Prisma cannot bind the `vector` column type (it's modeled as
 * Unsupported("vector(1536)")), so every read/write of an embedding goes
 * through raw, parameterized SQL here. This is the ONLY place that knows the
 * vector wire format — keep it the single source of truth.
 *
 * Tenant isolation: every query takes an organizationId and filters on it.
 */

/** Serialize a JS number[] into the pgvector literal: "[0.1,0.2,...]". */
export function toSqlVector(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

export interface ChunkInsert {
  organizationId: string;
  documentId: string;
  content: string;
  embedding: number[];
  chunkIndex: number;
}

/**
 * Bulk-insert DocumentChunks with their embeddings in a single statement.
 * Ids are generated app-side (text/UUID) to match Prisma's string id columns;
 * each embedding param is cast `$n::vector`. Returns the row count.
 */
export async function insertChunks(chunks: ChunkInsert[]): Promise<number> {
  if (chunks.length === 0) return 0;

  const tuples: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  for (const c of chunks) {
    tuples.push(
      `($${p++}, $${p++}, $${p++}, $${p++}, $${p++}::vector, $${p++})`,
    );
    params.push(
      randomUUID(),
      c.organizationId,
      c.documentId,
      c.content,
      toSqlVector(c.embedding),
      c.chunkIndex,
    );
  }

  const sql =
    `INSERT INTO "DocumentChunk" ` +
    `("id","organizationId","documentId","content","embedding","chunkIndex") ` +
    `VALUES ${tuples.join(", ")}`;

  return prisma.$executeRawUnsafe(sql, ...params);
}

export interface SimilarChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  /** Cosine distance (0 = identical). Lower is more relevant. */
  distance: number;
}

/**
 * Top-K cosine similarity search over ONE org's chunks using the `<=>`
 * operator (matched by the HNSW vector_cosine_ops index). The organizationId
 * predicate is what enforces tenant isolation — never remove it.
 */
export async function searchSimilarChunks(
  organizationId: string,
  queryEmbedding: number[],
  k = 5,
): Promise<SimilarChunk[]> {
  const vec = toSqlVector(queryEmbedding);
  return prisma.$queryRawUnsafe<SimilarChunk[]>(
    `SELECT "id", "documentId", "content", "chunkIndex",
            ("embedding" <=> $1::vector) AS "distance"
       FROM "DocumentChunk"
      WHERE "organizationId" = $2
        AND "embedding" IS NOT NULL
      ORDER BY "embedding" <=> $1::vector
      LIMIT $3`,
    vec,
    organizationId,
    k,
  );
}
