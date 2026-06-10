import { NextFunction, Request, Response } from "express";
import { AppError } from "./error";

type Role = "ADMIN" | "AGENT";

/**
 * Restrict a route to specific roles. Must run after requireAuth.
 * e.g. router.delete("/:id", requireAuth, requireRole("ADMIN"), handler)
 */
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      throw new AppError(401, "Authentication required");
    }
    if (!allowed.includes(req.auth.role)) {
      throw new AppError(403, "Insufficient permissions");
    }
    next();
  };
}
