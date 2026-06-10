import "express";

/**
 * Request augmentation: auth middleware populates `auth`, tenant middleware
 * populates `organizationId`. Both are optional because public routes
 * (/auth/*, POST /chat) won't have a JWT-derived identity.
 */
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        organizationId: string;
        role: "ADMIN" | "AGENT";
      };
      /** The tenant scope for the current request (JWT org or widget org). */
      organizationId?: string;
    }
  }
}

export {};
