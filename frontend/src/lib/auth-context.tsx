import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, tokenStore, setUnauthorizedHandler, type AuthUser } from "./api";

type AuthState = {
  user: AuthUser | null;
  ready: boolean;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (input: {
    phone: string; password: string; full_name: string;
    date_of_birth?: string; sex?: "male" | "female" | "other"; district?: string;
  }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Hydrate from localStorage after mount (SSR-safe)
    const t = tokenStore.get();
    const u = tokenStore.getUser();
    if (t && u) setUser(u);
    setReady(true);
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    const res = await api<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST", body: { phone, password }, auth: false,
    });
    tokenStore.set(res.token);
    tokenStore.setUser(res.user);
    setUser(res.user);
  }, []);

  const register = useCallback(async (input: {
    phone: string; password: string; full_name: string;
    date_of_birth?: string; sex?: "male" | "female" | "other"; district?: string;
  }) => {
    const res = await api<{ token: string; user: AuthUser }>("/auth/register", {
      method: "POST", body: input, auth: false,
    });
    tokenStore.set(res.token);
    tokenStore.setUser(res.user);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(() => ({
    user, ready, isAuthenticated: !!user, login, register, logout,
  }), [user, ready, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
