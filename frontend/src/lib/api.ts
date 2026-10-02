/**
 * Thin fetch wrapper for the WMS Lite backend (FastAPI).
 *
 * Base URL comes from VITE_API_BASE_URL (see .env), defaulting to the local
 * dev backend at http://localhost:8000/api. Point this at the deployed API
 * URL in production via .env.production or the hosting platform's env vars.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("wms_lite_token");
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* no JSON body */
    }
    if (res.status === 401 && !path.startsWith("/auth/login")) {
      // Session expired or token invalid — clear it and send the user back
      // to login rather than leaving them staring at broken screens.
      localStorage.removeItem("wms_lite_token");
      localStorage.removeItem("wms_lite_user");
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // For endpoints that don't fit the list/get/create/update/remove shape
  // (a single-object endpoint like /dashboard/summary, or an action route
  // like /inventory-transactions/adjust) — calls the path exactly as given,
  // with whatever method/body you pass, no trailing slash or id appended.
  raw: <T>(path: string, options?: RequestInit) => request<T>(path, options),
  list: <T>(resource: string, params?: Record<string, string | number>) => {
    const qs = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return request<T[]>(`${resource}/${qs}`);
  },
  get: <T>(resource: string, id: number | string) => request<T>(`${resource}/${id}`),
  create: <T>(resource: string, payload: unknown) =>
    request<T>(`${resource}/`, { method: "POST", body: JSON.stringify(payload) }),
  update: <T>(resource: string, id: number | string, payload: unknown) =>
    request<T>(`${resource}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  remove: (resource: string, id: number | string) =>
    request<void>(`${resource}/${id}`, { method: "DELETE" }),
};
