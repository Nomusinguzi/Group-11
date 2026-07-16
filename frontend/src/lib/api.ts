// Central API client. All frontend requests go through here.
// Base URL comes from VITE_API_URL and defaults to your local Express backend.

const RAW_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";
export const API_BASE = RAW_BASE.replace(/\/+$/, "");

const TOKEN_KEY = "sym_care_token";
const USER_KEY = "sym_care_user";

export type AuthUser = {
  id: number;
  phone: string;
  full_name: string;
  role: "patient" | "vht" | "clinic_staff" | "admin";
};

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set(token: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  },
  getUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as AuthUser; } catch { return null; }
  },
  setUser(user: AuthUser) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
};

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type Options = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
};

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const { method = "GET", body, auth = true, signal } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const t = tokenStore.get();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    throw new ApiError(
      "Can't reach the SYM-CARE backend. Make sure the Node/Express server is running.",
      0,
      err,
    );
  }

  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await res.json().catch(() => null) : null;

  if (res.status === 401 && auth) {
    tokenStore.clear();
    onUnauthorized?.();
  }
  if (!res.ok) {
    const msg = (data && typeof data === "object" && "error" in data ? String((data as { error: unknown }).error) : null)
      ?? `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }
  return (data ?? ({} as T)) as T;
}
