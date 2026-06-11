import "express";

/**
 * Request augmentation.
 * - `user`  → set by `authenticate` (JWT admin/agent routes). The identity AND
 *             the tenant scope (`user.organizationId`).
 * - `organizationId` → set by `tenantFromApiKey` for the public widget chat,
 *             which has no JWT user. Use `getTenantId(req)` to read the scope
 *             uniformly regardless of which auth scheme ran.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        organizationId: string;
        role: "ADMIN" | "AGENT";
      };
      organizationId?: string;
    }
  }
}

export {};
