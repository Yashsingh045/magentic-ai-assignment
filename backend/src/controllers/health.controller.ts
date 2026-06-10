import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

/** Liveness + DB readiness probe. */
export async function health(_req: Request, res: Response): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "ok", time: new Date().toISOString() });
}
