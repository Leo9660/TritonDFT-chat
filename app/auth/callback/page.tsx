"use client";

import { useEffect, useState } from "react";
import { verifyMagicToken, saveToken } from "@/lib/auth";
import { fromThrown, tr } from "@/lib/errors";

type State =
  | { kind: "loading" }
  | { kind: "ok"; email: string }
  | { kind: "error"; msg: string };

export default function AuthCallbackPage() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    // Scrub the token from the visible URL + history immediately so it can't
    // leak via Referer headers or be recovered from browser history.
    if (window.location.search) {
      window.history.replaceState(null, "", "/auth/callback/");
    }
    if (!token) {
      setState({ kind: "error", msg: tr({ code: "magic_link_invalid", message: "" }) });
      return;
    }
    (async () => {
      try {
        const r = await verifyMagicToken(token);
        saveToken(r.token);
        setState({ kind: "ok", email: r.email });
        setTimeout(() => {
          window.location.replace("/");
        }, 800);
      } catch (e: unknown) {
        setState({ kind: "error", msg: tr(fromThrown(e)) });
      }
    })();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--bg)",
        color: "var(--fg)",
        fontFamily: "var(--font-sans)",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          padding: 32,
          borderRadius: 14,
          background: "var(--bg-1)",
          border: "1px solid var(--border)",
          textAlign: "center",
        }}
      >
        {state.kind === "loading" && (
          <>
            <h2 style={{ marginTop: 0, fontFamily: "var(--font-serif)", fontWeight: 500 }}>
              Signing you in…
            </h2>
            <p style={{ color: "var(--fg-mute)", margin: "16px 0 0" }}>
              Verifying your magic link.
            </p>
          </>
        )}
        {state.kind === "ok" && (
          <>
            <h2 style={{ marginTop: 0, fontFamily: "var(--font-serif)", fontWeight: 500 }}>
              Welcome back
            </h2>
            <p style={{ color: "var(--fg-mute)", margin: "16px 0 0" }}>
              Signed in as <strong style={{ color: "var(--fg)" }}>{state.email}</strong>. Redirecting…
            </p>
          </>
        )}
        {state.kind === "error" && (
          <>
            <h2 style={{ marginTop: 0, fontFamily: "var(--font-serif)", fontWeight: 500, color: "#ef4444" }}>
              Sign-in failed
            </h2>
            <p style={{ color: "var(--fg-mute)", margin: "16px 0 0", wordBreak: "break-word" }}>
              {state.msg}
            </p>
            <p style={{ marginTop: 20 }}>
              <a href="/" style={{ color: "var(--blue-500, #4577ff)" }}>← Back to home</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
