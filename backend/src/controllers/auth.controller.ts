import { Request, Response } from "express";
import * as authService from "../services/auth.service";

export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body);
  res.json(result);
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const tokens = await authService.refresh(req.body.refreshToken);
  res.json(tokens);
}

export async function me(req: Request, res: Response): Promise<void> {
  // requireAuth guarantees req.auth is set.
  const user = await authService.getMe(req.auth!.userId);
  res.json(user);
}

export async function forgotPassword(
  req: Request,
  res: Response,
): Promise<void> {
  await authService.forgotPassword(req.body);
  // Generic response — never reveals whether the email exists.
  res.json({ message: "If that email exists, a reset link has been sent." });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  await authService.resetPassword(req.body);
  res.json({ message: "Password has been reset. Please log in." });
}
