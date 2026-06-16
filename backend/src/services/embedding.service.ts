import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  openai,
} from "../lib/openai";

/** Max inputs per embeddings request. OpenAI allows up to 2048; we stay modest
 *  to keep each request well under the per-request token cap and easy to retry. */
const EMBED_BATCH_SIZE = 96;
const MAX_RETRIES = 4;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Deterministic local embedding — used as a FALLBACK when OpenAI is unavailable
 * (no key / no quota) so indexing and retrieval still function (degraded, not
 * semantic). The same function is used for stored chunks and queries, so
 * similarity is at least self-consistent. Re-index once OpenAI works to replace
 * these with real embeddings.
 */
function localEmbed(text: string): number[] {
  const v = new Array(EMBEDDING_DIMENSIONS).fill(0);
  for (let i = 0; i < text.length; i++) {
    v[(text.charCodeAt(i) * 7 + i) % EMBEDDING_DIMENSIONS] += 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

/** Coerce any provider's vector to exactly the DB column width (truncate/pad).
 *  Truncating is valid for MRL embeddings; zero-padding preserves cosine. */
function coerceDim(vec: number[]): number[] {
  if (vec.length === EMBEDDING_DIMENSIONS) return vec;
  if (vec.length > EMBEDDING_DIMENSIONS)
    return vec.slice(0, EMBEDDING_DIMENSIONS);
  return [...vec, ...new Array(EMBEDDING_DIMENSIONS - vec.length).fill(0)];
}

/**
 * Retry transient failures (rate limits, 5xx) with exponential backoff + jitter.
 * IMPORTANT: an `insufficient_quota` 429 is a billing problem, not a transient
 * rate limit — retrying it just wastes time, so we fail fast on it.
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err: unknown) {
      const e = err as { status?: number; code?: string };
      const isRateLimit = e.status === 429 && e.code !== "insufficient_quota";
      const isServer = typeof e.status === "number" && e.status >= 500;
      if ((!isRateLimit && !isServer) || attempt >= MAX_RETRIES) throw err;

      const backoff = Math.min(1000 * 2 ** attempt, 8000) + Math.random() * 250;
      await sleep(backoff);
      attempt++;
    }
  }
}

/** Embed a single text into a 1536-dim vector. Falls back to a local vector if
 *  OpenAI is unavailable, so chat retrieval never hard-fails. */
export async function embedText(text: string): Promise<number[]> {
  try {
    const res = await withRetry(() =>
      openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    );
    return coerceDim(res.data[0].embedding);
  } catch (err) {
    console.warn(
      "embedText: OpenAI unavailable, using local fallback embedding.",
      (err as { code?: string })?.code ?? "",
    );
    return localEmbed(text);
  }
}

/**
 * Embed many texts, batched and rate-limited. Falls back to local embeddings if
 * OpenAI is unavailable, so document indexing / re-index still complete (degraded).
 */
export async function embedMany(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  try {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
      const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
      const res = await withRetry(() =>
        openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: batch,
          dimensions: EMBEDDING_DIMENSIONS,
        }),
      );
      for (const item of res.data) out.push(coerceDim(item.embedding));
    }
    return out;
  } catch (err) {
    console.warn(
      "embedMany: OpenAI unavailable, using local fallback embeddings.",
      (err as { code?: string })?.code ?? "",
    );
    return texts.map(localEmbed);
  }
}
