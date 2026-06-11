import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";
import { validateBody } from "../middleware/validate";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from "../schemas/auth.schema";

const router = Router();

// Public endpoints — stricter auth rate limiter + Zod validation.
router.post(
  "/register",
  authLimiter,
  validateBody(registerSchema),
  authController.register,
);
router.post(
  "/login",
  authLimiter,
  validateBody(loginSchema),
  authController.login,
);
router.post(
  "/refresh",
  authLimiter,
  validateBody(refreshSchema),
  authController.refresh,
);
router.post(
  "/forgot-password",
  authLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post(
  "/reset-password",
  authLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword,
);

// Authenticated.
router.get("/me", authenticate, authController.me);

export default router;
