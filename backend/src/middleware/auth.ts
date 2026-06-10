import { NextFunction, Request, Response } from "express";
import { AppError } from "./error";
import { verifyAccessToken } from "../utils/jwt";

/**
 * Require a valid JWT access token. Populates req.auth on success.
 * Used by every route except /auth/* and the public POST /chat.
 */
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "Missing or malformed Authorization header");
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.userId,
      organizationId: payload.organizationId,
      role: payload.role,
    };
    next();
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }
}
