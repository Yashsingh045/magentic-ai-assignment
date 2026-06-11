import { env } from "../config/env";

/**
 * Swappable email provider. The app depends only on this interface, so a real
 * provider (SES, Postmark, Resend, …) can replace ConsoleEmailProvider without
 * touching call sites — just reassign `emailProvider`.
 */
export interface EmailProvider {
  sendPasswordReset(to: string, resetUrl: string): Promise<void>;
}

/** Default stub: logs the reset link instead of sending mail. */
class ConsoleEmailProvider implements EmailProvider {
  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    if (env.NODE_ENV !== "test") {
      console.log(`📧 [stub] Password reset for ${to}\n   → ${resetUrl}`);
    }
  }
}

export const emailProvider: EmailProvider = new ConsoleEmailProvider();
