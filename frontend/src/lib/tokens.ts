/**
 * Token storage. Kept in localStorage so the SPA-style admin portal survives
 * reloads. These helpers are the single source of truth for token reads/writes
 * and are guarded for SSR (no `window` on the server).
 */
const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";

const isBrowser = typeof window !== "undefined";

export function getAccessToken(): string | null {
  return isBrowser ? window.localStorage.getItem(ACCESS_KEY) : null;
}

export function getRefreshToken(): string | null {
  return isBrowser ? window.localStorage.getItem(REFRESH_KEY) : null;
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (!isBrowser) return;
  window.localStorage.setItem(ACCESS_KEY, accessToken);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  if (!isBrowser) return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}
