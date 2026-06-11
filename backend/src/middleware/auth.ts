import { NextFunction, Request, Response } from "express";
import { AppError } from "./error";
import { verifyAccessToken } from "../utils/jwt";

/**
 * authenticate — verify the JWT access token and attach the caller's identity.
 *
 * On success: req.user = { id, organizationId, role }. The organizationId comes
 * from the signed token (set at login), so it cannot be tampered with by the
 * client and becomes the trusted tenant scope for the rest of the request.
 * On any failure: 401.
 *
 * Applies to every route except /auth/* and the public POST /chat.
 */
export function authenticate(
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
    req.user = {
      id: payload.userId,
      organizationId: payload.organizationId,
      role: payload.role,
    };
    next();
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }
}
