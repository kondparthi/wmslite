/**
 * Real authentication against the WMS Lite backend — no more "type anything
 * and it lets you in". Token + user are cached in localStorage so a page
 * refresh doesn't force a re-login; the API client (see api.ts) attaches
 * the token to every request automatically.
 */
import { api, ApiError } from "@/lib/api";

const TOKEN_KEY = "wms_lite_token";
const USER_KEY = "wms_lite_user";

export interface AuthUser {
  id: number;
  tenant_id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export async function login(tenantId: string, usernameOrEmail: string, password: string): Promise<AuthUser> {
  const res = await api.create<LoginResponse>("/auth/login", {
    tenant_id: tenantId,
    username: usernameOrEmail,
    password,
  });
  localStorage.setItem(TOKEN_KEY, res.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  return res.user;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export { ApiError };
