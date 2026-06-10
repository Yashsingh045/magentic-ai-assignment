import { EMBEDDING_MODEL, openai } from "../lib/openai";

/** Embed a single text into a 1536-dim vector. */
export async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return res.data[0].embedding;
}

/** Embed many texts in one request (OpenAI supports batched inputs). */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  // Responses come back in input order.
  return res.data.map((d) => d.embedding);
}

/** Serialize a vector into the pgvector text literal: "[0.1,0.2,...]". */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
