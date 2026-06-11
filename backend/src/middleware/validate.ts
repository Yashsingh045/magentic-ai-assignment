import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

/**
 * Validate and coerce req.body against a Zod schema. On success the parsed
 * (and transformed, e.g. lowercased email) value replaces req.body. On failure
 * the thrown ZodError is caught by the central errorHandler → 400.
 */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.body = schema.parse(req.body);
    next();
  };
}
