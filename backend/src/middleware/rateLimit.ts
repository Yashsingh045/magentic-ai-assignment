import rateLimit from "express-rate-limit";

/** General limiter for authenticated admin API traffic. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

/** Stricter limiter for auth endpoints to slow credential stuffing. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later." },
});

/**
 * Limiter for the public widget chat endpoint. Keyed by API key when present
 * so one tenant's traffic can't exhaust another's budget.
 */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    (req.headers["x-api-key"] as string | undefined) ?? req.ip ?? "unknown",
  message: { error: "Chat rate limit exceeded, please slow down." },
});
