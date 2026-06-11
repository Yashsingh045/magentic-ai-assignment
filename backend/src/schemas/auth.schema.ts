import { z } from "zod";

/** Email normalized to lowercase so uniqueness is case-insensitive. */
const email = z.string().email().toLowerCase();
const strongPassword = z.string().min(8).max(128);

export const registerSchema = z.object({
  organizationName: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  email,
  password: strongPassword,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: strongPassword,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
