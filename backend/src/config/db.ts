import { prisma } from "../lib/prisma";

const MAX_ATTEMPTS = 6;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Connect to the DB at boot, retrying with backoff.
 *
 * Neon's free tier auto-suspends the database after inactivity; the first
 * connection then fails with P1001 while it wakes (a few seconds). Retrying lets
 * the server boot through a cold start instead of crashing on startup.
 */
export async function connectDb(): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await prisma.$connect();
      // Ensure the pgvector extension exists (idempotent). Migrations also do
      // this, but this guards local/dev databases created out-of-band.
      await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
      if (attempt > 1) {
        console.log(`✅ Database connected (attempt ${attempt}).`);
      }
      return;
    } catch (err) {
      lastErr = err;
      if (attempt >= MAX_ATTEMPTS) break;
      const code = (err as { errorCode?: string }).errorCode;
      const delay = Math.min(1000 * attempt, 5000);
      console.warn(
        `⏳ Database unreachable${code ? ` (${code})` : ""}; retrying in ${delay}ms ` +
          `(attempt ${attempt}/${MAX_ATTEMPTS})…`,
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
