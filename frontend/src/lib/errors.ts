import { AxiosError } from "axios";

/**
 * Extract a human-readable message from an API error. The backend returns
 * `{ error: string }` for AppErrors and `{ error, details }` (Zod field errors)
 * for validation failures — surface the most specific message available.
 */
export function getApiErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (err && typeof err === "object" && "isAxiosError" in err) {
    const ax = err as AxiosError<{
      error?: string;
      details?: Record<string, string[]>;
    }>;
    const data = ax.response?.data;

    if (data?.details) {
      const firstField = Object.values(data.details)[0];
      if (Array.isArray(firstField) && firstField[0]) return firstField[0];
    }
    if (data?.error) return data.error;
    if (!ax.response) return "Cannot reach the server. Is the API running?";
  }
  return fallback;
}
