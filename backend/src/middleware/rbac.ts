import { NextFunction, Request, Response } from "express";
import { AppError } from "./error";

type Role = "ADMIN" | "AGENT";

/**
 * requireRole(...roles) — RBAC guard. Must run AFTER `authenticate`.
 * 401 if unauthenticated, 403 if the caller's role isn't allowed.
 *
 * e.g. router.delete("/:id", authenticate, requireRole("ADMIN"), handler)
 */
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }
    if (!allowed.includes(req.user.role)) {
      throw new AppError(403, "Insufficient permissions");
    }
    next();
  };
}
