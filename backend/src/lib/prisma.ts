import { PrismaClient } from "@prisma/client";

/**
 * Single shared PrismaClient. In dev, ts-node-dev re-executes the module on
 * every change; caching on globalThis prevents exhausting DB connections by
 * spawning a new client per reload.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
