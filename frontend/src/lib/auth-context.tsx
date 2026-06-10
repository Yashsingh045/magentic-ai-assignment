"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";
import { clearTokens, getAccessToken, setTokens } from "./tokens";
import type { AuthResponse, User } from "./types";

interface RegisterInput {
  organizationName: string;
  name: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  user: User | null;
  /** True while the initial /auth/me hydration is in flight. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: if we have a token, hydrate the user from /auth/me.
  useEffect(() => {
    let active = true;

    async function hydrate() {
      if (!getAccessToken()) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get<User>("/auth/me");
        if (active) setUser(data);
      } catch {
        // Interceptor handles refresh/redirect; just clear local state here.
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    hydrate();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const { data } = await api.post<AuthResponse>("/auth/register", input);
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    if (typeof window !== "undefined") window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
