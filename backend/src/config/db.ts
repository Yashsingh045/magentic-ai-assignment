import { prisma } from "../lib/prisma";

/** Verify DB connectivity at boot so we fail fast on misconfiguration. */
export async function connectDb(): Promise<void> {
  await prisma.$connect();
  // Ensure the pgvector extension exists (idempotent). Migrations also do this,
  // but this guards local/dev databases that were created out-of-band.
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
