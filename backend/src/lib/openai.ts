import OpenAI from "openai";
import { env } from "../config/env";

/** Shared OpenAI client. Models are pinned per the locked spec. */
export const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
export const CHAT_MODEL = "gpt-4o-mini";
