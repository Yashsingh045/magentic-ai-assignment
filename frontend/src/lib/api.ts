import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "./tokens";

const baseURL = process.env.NEXT_PUBLIC_API_URL;

if (!baseURL && typeof window !== "undefined") {
  // Fail loud in the browser if the env var wasn't inlined at build time.
  console.error("NEXT_PUBLIC_API_URL is not set — API calls will fail.");
}

/** Shared axios instance. All app/server calls go through this. */
export const api = axios.create({
  baseURL: `${baseURL ?? ""}/api`,
  headers: { "Content-Type": "application/json" },
});

// ---- Request interceptor: attach the access token ----
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- Response interceptor: transparent refresh on 401 ----
//
// A single refresh is allowed in flight at a time. Concurrent 401s queue and
// replay once the new access token arrives, so a burst of requests triggers
// exactly one /auth/refresh call.
let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

function flushQueue(token: string | null) {
  pendingQueue.forEach((resolve) => resolve(token));
  pendingQueue = [];
}

/** Called when refresh fails: drop tokens and bounce to login (browser only). */
function forceLogout() {
  clearTokens();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined;

    // Only handle 401s we haven't already retried, and never try to refresh
    // the refresh call itself.
    const isAuthEndpoint = original?.url?.includes("/auth/");
    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      isAuthEndpoint
    ) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      forceLogout();
      return Promise.reject(error);
    }

    // If a refresh is already running, wait for it and replay.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push((token) => {
          if (!token) return reject(error);
          original._retry = true;
          original.headers = original.headers ?? {};
          (original.headers as Record<string, string>).Authorization =
            `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      // Bare axios (not `api`) to avoid recursive interceptors.
      const { data } = await axios.post(`${baseURL ?? ""}/api/auth/refresh`, {
        refreshToken,
      });
      setTokens(data.accessToken, data.refreshToken);
      flushQueue(data.accessToken);

      original.headers = original.headers ?? {};
      (original.headers as Record<string, string>).Authorization =
        `Bearer ${data.accessToken}`;
      return api(original);
    } catch (refreshError) {
      flushQueue(null);
      forceLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
