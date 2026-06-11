import OpenAI from "openai";
import { env } from "../config/env";

/**
 * Shared OpenAI client. Models are pinned per the locked spec.
 * maxRetries: 0 — retry/backoff is handled explicitly in embedding.service so
 * we can skip non-transient errors (e.g. insufficient_quota) and avoid the SDK
 * silently double-retrying on top of ours.
 */
export const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, maxRetries: 0 });

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
export const CHAT_MODEL = "gpt-4o-mini";
