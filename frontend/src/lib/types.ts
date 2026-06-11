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

export type Personality = "PROFESSIONAL" | "FRIENDLY" | "TECHNICAL";

export interface EscalationRules {
  refundRequested: boolean;
  legalComplaint: boolean;
  customerAngry: boolean;
  humanRequested: boolean;
  customKeywords: string[];
}

export interface BotConfig {
  id: string;
  organizationId: string;
  botName: string;
  welcomeMessage: string;
  personality: Personality;
  escalationRules: EscalationRules;
}

export type DocumentStatus = "PROCESSING" | "INDEXED" | "FAILED";

/** A knowledge-base document as returned by GET /documents. */
export interface KbDocument {
  id: string;
  filename: string;
  fileType: string;
  status: DocumentStatus;
  sizeBytes: number;
  uploadedAt: string;
  chunkCount: number;
}
