// Auth helpers: JWT storage + fetch wrapper.

import { loadBackendUrl } from "./storage";

const TOKEN_KEY = "tritondft.jwt.v1";

export interface User {
  email: string;
  credits: number;
  is_admin: boolean;
  is_unlimited?: boolean;
}

export function loadToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

function backendBase(): string {
  return loadBackendUrl().replace(/\/$/, "");
}

/** Authenticated fetch. Throws on 401/403/etc — caller decides what to do. */
export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = loadToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${backendBase()}${path}`, { ...init, headers });
}

export async function requestMagicLink(email: string): Promise<{ ok: boolean; message: string }> {
  const resp = await fetch(`${backendBase()}/auth/request-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${txt}`);
  }
  return resp.json();
}

export async function verifyMagicToken(
  token: string,
): Promise<{ ok: boolean; token: string; email: string; credits: number; is_admin: boolean }> {
  const resp = await fetch(
    `${backendBase()}/auth/verify?token=${encodeURIComponent(token)}`,
    { method: "POST" },
  );
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${txt}`);
  }
  return resp.json();
}

export async function fetchMe(): Promise<User | null> {
  const token = loadToken();
  if (!token) return null;
  const resp = await authFetch("/auth/me");
  if (resp.status === 401) {
    clearToken();
    return null;
  }
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export async function logout(): Promise<void> {
  try {
    await authFetch("/auth/logout", { method: "POST" });
  } catch {
    // ignore network errors
  }
  clearToken();
}
