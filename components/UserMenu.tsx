"use client";

import { useEffect, useRef, useState } from "react";
import { LogOutIcon, ShieldCheckIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!user) return null;

  const initial = user.email.charAt(0).toUpperCase();
  const creditsLabel = user.is_unlimited ? "∞" : user.credits.toLocaleString();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={user.email}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 10px 4px 4px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--border)",
          color: "var(--fg)",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            borderRadius: 999,
            background: "var(--grad-primary)",
            color: "white",
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          {initial}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-mute)" }}>
          {creditsLabel} credits
        </span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            minWidth: 240,
            padding: 6,
            borderRadius: 10,
            background: "var(--bg-1)",
            border: "1px solid var(--border-strong)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
            zIndex: 60,
          }}
        >
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>{user.email}</div>
            <div style={{ fontSize: 11, color: "var(--fg-mute)", marginTop: 2 }}>
              {creditsLabel} credits remaining
              {user.is_admin && (
                <span
                  style={{
                    marginLeft: 8,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "var(--amber-500, #f59e0b)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    textTransform: "uppercase",
                  }}
                >
                  Admin
                </span>
              )}
            </div>
          </div>
          {user.is_admin && (
            <a
              href="/admin/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                color: "var(--fg)",
                fontSize: 13,
                borderRadius: 6,
                textDecoration: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <ShieldCheckIcon size={14} />
              Admin panel
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              width: "100%",
              background: "transparent",
              color: "var(--fg)",
              border: "none",
              fontSize: 13,
              borderRadius: 6,
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <LogOutIcon size={14} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
