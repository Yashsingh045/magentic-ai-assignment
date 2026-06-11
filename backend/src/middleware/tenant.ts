import { NextFunction, Request, Response } from "express";
import { AppError } from "./error";
import { prisma } from "../lib/prisma";

/**
 * The tenant pattern.
 *
 * `getTenantId(req)` is the ONE canonical way controllers/services read the
 * current tenant scope. It returns `req.user.organizationId` (JWT routes) or,
 * for the public widget chat, `req.organizationId` (set by tenantFromApiKey).
 * If neither is present it throws 500 — meaning a route was wired without an
 * auth/tenant middleware in front of it, which we want to fail loudly, never
 * silently run an unscoped query.
 *
 * Every tenant-owned query MUST include `organizationId: getTenantId(req)` in
 * its WHERE clause.
 */
export function getTenantId(req: Request): string {
  const orgId = req.user?.organizationId ?? req.organizationId;
  if (!orgId) {
    throw new AppError(
      500,
      "Tenant scope missing: authenticate/tenant middleware did not run",
    );
  }
  return orgId;
}

/**
 * Widget-based tenant scoping for the public POST /chat endpoint, which is
 * authed by an Organization's publicApiKey instead of a JWT. Resolves the org
 * and sets req.organizationId so getTenantId(req) works the same downstream.
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
