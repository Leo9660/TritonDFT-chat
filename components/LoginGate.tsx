"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { requestMagicLink } from "@/lib/auth";
import { fromThrown, tr } from "@/lib/errors";

type Phase = "form" | "sent" | "error";

export function LoginGate() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [errMsg, setErrMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setErrMsg(t("errors.invalid_email"));
      setPhase("error");
      return;
    }
    setSubmitting(true);
    setErrMsg("");
    try {
      await requestMagicLink(clean);
      setPhase("sent");
    } catch (e: unknown) {
      setErrMsg(tr(fromThrown(e)));
      setPhase("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "rgba(7, 8, 13, 0.72)",
        backdropFilter: "blur(12px)",
        zIndex: 100,
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "32px 28px",
          borderRadius: 16,
          background: "var(--bg-1)",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "var(--grad-primary)",
              boxShadow: "0 0 14px var(--blue-500)",
              marginBottom: 12,
            }}
          />
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontWeight: 500,
              fontSize: 24,
              fontStyle: "italic",
            }}
          >
            Sign in to TritonDFT
          </h2>
          <p style={{ color: "var(--fg-mute)", margin: "10px 0 0", fontSize: 14 }}>
            We&apos;ll email you a one-time sign-in link. New users get 1,000 free credits.
          </p>
        </div>

        {phase === "sent" ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
            <p style={{ margin: 0, color: "var(--fg)" }}>
              Check <strong>{email}</strong> for your sign-in link.
            </p>
            <p style={{ marginTop: 12, color: "var(--fg-mute)", fontSize: 12 }}>
              It expires in 15 minutes. Don&apos;t see it? Check spam.
            </p>
            <button
              type="button"
              onClick={() => setPhase("form")}
              style={{
                marginTop: 18,
                padding: "8px 16px",
                background: "transparent",
                color: "var(--fg-mute)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: 12,
                color: "var(--fg-mute)",
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--bg)",
                color: "var(--fg)",
                border: "1px solid var(--border-strong)",
                borderRadius: 10,
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {phase === "error" && errMsg && (
              <p style={{ color: "#ef4444", fontSize: 12, marginTop: 8, marginBottom: 0 }}>
                {errMsg}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "12px 16px",
                background: "var(--grad-primary)",
                color: "white",
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: submitting ? "wait" : "pointer",
                opacity: submitting ? 0.6 : 1,
                boxShadow: "0 6px 14px rgba(69, 119, 255, 0.3)",
              }}
            >
              {submitting ? "Sending…" : "Send sign-in link →"}
            </button>
          </form>
        )}

        <p
          style={{
            marginTop: 18,
            paddingTop: 14,
            borderTop: "1px solid var(--border)",
            color: "var(--fg-dim)",
            fontSize: 11,
            textAlign: "center",
          }}
        >
          By signing in you agree to fair usage. Heavy use is metered in credits.
        </p>
      </div>
    </div>
  );
}
