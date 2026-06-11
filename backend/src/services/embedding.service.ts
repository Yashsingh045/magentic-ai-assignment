import { EMBEDDING_MODEL, openai } from "../lib/openai";

/** Max inputs per embeddings request. OpenAI allows up to 2048; we stay modest
 *  to keep each request well under the per-request token cap and easy to retry. */
const EMBED_BATCH_SIZE = 96;
const MAX_RETRIES = 4;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

/** Embed a single text into a 1536-dim vector (used by chat retrieval). */
export async function embedText(text: string): Promise<number[]> {
  const res = await withRetry(() =>
    openai.embeddings.create({ model: EMBEDDING_MODEL, input: text }),
  );
  return res.data[0].embedding;
}

/**
 * Embed many texts, batched and rate-limited. Inputs are split into batches of
 * EMBED_BATCH_SIZE; each batch is one OpenAI request with retry/backoff.
 * Results are returned in the original input order. Safe for large documents:
 * one batch is in flight at a time, so we never burst the API.
 */
export async function embedMany(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const res = await withRetry(() =>
      openai.embeddings.create({ model: EMBEDDING_MODEL, input: batch }),
    );
    // OpenAI returns embeddings in input order within the batch.
    for (const item of res.data) out.push(item.embedding);
  }
  return out;
}
