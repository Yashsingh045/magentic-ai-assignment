import OpenAI from "openai";
import { env } from "../config/env";

/**
 * OpenAI-compatible client. Defaults to Google Gemini's OpenAI-compatible
 * endpoint (free tier), but works with any compatible provider via
 * OPENAI_BASE_URL / CHAT_MODEL / EMBEDDING_MODEL.
 *
 * To use real OpenAI instead, set:
 *   OPENAI_BASE_URL=https://api.openai.com/v1
 *   CHAT_MODEL=gpt-4o-mini
 *   EMBEDDING_MODEL=text-embedding-3-small
 */
const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";

export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: env.OPENAI_BASE_URL ?? GEMINI_BASE_URL,
  maxRetries: 0,
});

/** Embedding model. Gemini's gemini-embedding-001 supports a `dimensions`
 *  param, so we request 1536 to match the pgvector(1536) column. */
export const EMBEDDING_MODEL = env.EMBEDDING_MODEL ?? "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 1536;
export const CHAT_MODEL = env.CHAT_MODEL ?? "gemini-2.5-flash-lite";
