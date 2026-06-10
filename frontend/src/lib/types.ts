/** Shared API types mirrored from the backend contract. */

export type Role = "ADMIN" | "AGENT";

export interface User {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Shape returned by /auth/register and /auth/login. */
export interface AuthResponse extends AuthTokens {
  user: User;
}
