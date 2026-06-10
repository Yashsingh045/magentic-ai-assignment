import { NextFunction, Request, Response } from "express";
import { AppError } from "./error";
import { prisma } from "../lib/prisma";

/**
 * JWT-based tenant scoping. Copies the org from req.auth into
 * req.organizationId so controllers/services have one consistent place to read
 * the tenant scope. Run after requireAuth.
 */
export function tenantFromAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.auth) {
    throw new AppError(401, "Authentication required");
  }
  req.organizationId = req.auth.organizationId;
  next();
}

/**
 * Widget-based tenant scoping for the public POST /chat endpoint.
 * Resolves the organization from its publicApiKey (header or body) instead of
 * a JWT. Sets req.organizationId on success.
 */
export async function tenantFromApiKey(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const apiKey =
    (req.headers["x-api-key"] as string | undefined) ??
    (req.body?.publicApiKey as string | undefined);

  if (!apiKey) {
    throw new AppError(401, "Missing public API key");
  }

  const org = await prisma.organization.findUnique({
    where: { publicApiKey: apiKey },
    select: { id: true },
  });

  if (!org) {
    throw new AppError(401, "Invalid public API key");
  }

  req.organizationId = org.id;
  next();
}
