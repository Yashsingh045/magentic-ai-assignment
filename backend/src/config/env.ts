import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

/**
 * Validate process.env once at startup. If anything required is missing or
 * malformed we fail fast with a readable error instead of crashing deep in a
 * request handler later.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, "JWT_REFRESH_SECRET must be at least 16 chars"),

  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  // Optional: point the OpenAI-compatible client at another provider (e.g.
  // Gemini's OpenAI-compatible endpoint). Defaults to Gemini in lib/openai.
  OPENAI_BASE_URL: z.string().url().optional(),
  CHAT_MODEL: z.string().optional(),
  EMBEDDING_MODEL: z.string().optional(),

  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
