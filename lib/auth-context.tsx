"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { User, fetchMe, clearToken, saveToken } from "./auth";

interface AuthState {
  user: User | null;
  loading: boolean;        // true on initial mount while we check /auth/me
  signedIn: boolean;
  refresh: () => Promise<void>;
  setUserAfterVerify: (token: string, u: User) => void;
  signOut: () => void;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const u = await fetchMe();
      setUser(u);
    } catch (e) {
      console.warn("[auth] refresh failed:", e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setUserAfterVerify = useCallback((token: string, u: User) => {
    saveToken(token);
    setUser(u);
    setLoading(false);
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider
      value={{
        user,
        loading,
        signedIn: !!user,
        refresh,
        setUserAfterVerify,
        signOut,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
