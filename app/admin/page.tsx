"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeftIcon, BanIcon, CheckCircle2Icon, CpuIcon, InfinityIcon, KeyRoundIcon, PencilIcon, RefreshCwIcon, RotateCcwIcon, ShieldIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { fromThrown, parseResponseError, tr } from "@/lib/errors";

interface AdminUser {
  id: string;
  email: string;
  credits: number;
  is_admin: boolean;
  is_banned: boolean;
  is_unlimited: boolean;
  can_use_cpu: boolean;
  created_at: string;
  last_login_at: string | null;
}

interface KeyStatus {
  source: "environment" | "override";
  fingerprint: string;
  updated_at: string | null;
  updated_by: string | null;
}

/** Rotate the OpenAI key without kubectl.
 *
 * The key normally lives in the k8s secret, which needs cluster access and a
 * rollout to change — not a workable path when it runs out of credit during a
 * workshop. The value is never displayed: the API returns only a last-4
 * fingerprint, which is enough to tell two keys apart and not enough to use
 * one. "Revert" drops the override and falls back to the secret.
 */
function OpenAiKeyCard() {
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await authFetch("/admin/settings/openai-key");
      if (r.ok) setStatus(await r.json());
    } catch { /* the card just stays blank */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    const key = draft.trim();
    if (!key) return;
    setBusy(true);
    try {
      const r = await authFetch("/admin/settings/openai-key", {
        method: "PUT",
        body: JSON.stringify({ key }),
      });
      if (!r.ok) { alert(tr(await parseResponseError(r))); return; }
      setStatus(await r.json());
      setDraft("");
    } catch (e: unknown) {
      alert(tr(fromThrown(e)));
    } finally {
      setBusy(false);
    }
  }

  async function revert() {
    if (!confirm("Drop the override and go back to the key in the k8s secret?")) return;
    setBusy(true);
    try {
      const r = await authFetch("/admin/settings/openai-key", { method: "DELETE" });
      if (r.ok) setStatus(await r.json());
    } finally {
      setBusy(false);
    }
  }

  const field = {
    background: "var(--bg-0)",
    color: "var(--fg)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 13,
    padding: "8px 12px",
    outline: "none",
  } as const;

  return (
    <div style={{
      background: "var(--bg-1)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "14px 16px", marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <KeyRoundIcon size={14} style={{ color: "var(--blue-500)" }} />
        <strong style={{ fontSize: 13 }}>OpenAI API key</strong>
        <span style={{ flex: 1 }} />
        {status && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-dim)" }}>
            {status.source === "override" ? "override" : "k8s secret"} · {status.fingerprint}
          </span>
        )}
      </div>
      <p style={{ color: "var(--fg-mute)", fontSize: 12, margin: "0 0 10px" }}>
        {status?.source === "override"
          ? `Set by ${status.updated_by ?? "an admin"}${status.updated_at ? ` on ${new Date(status.updated_at).toLocaleString()}` : ""}. Workers pick it up on their next job.`
          : "Currently using the key from the k8s secret. Setting one here overrides it without a redeploy."}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="password"
          autoComplete="off"
          placeholder="sk-…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={{ ...field, flex: 1, minWidth: 220, fontFamily: "var(--font-mono)" }}
        />
        <button
          onClick={save}
          disabled={busy || !draft.trim()}
          style={{
            ...field, cursor: "pointer", fontWeight: 600,
            background: "var(--grad-primary)", color: "#fff", border: "none",
            opacity: busy || !draft.trim() ? 0.45 : 1,
          }}
        >
          Set key
        </button>
        {status?.source === "override" && (
          <button
            onClick={revert}
            disabled={busy}
            title="Revert to the k8s secret"
            style={{ ...field, cursor: "pointer", color: "var(--fg-mute)", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <RotateCcwIcon size={13} /> Revert
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editCredits, setEditCredits] = useState<string>("");

  const reload = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await authFetch("/admin/users");
      if (!r.ok) {
        setErr(tr(await parseResponseError(r)));
        return;
      }
      const data = await r.json();
      setUsers(data);
    } catch (e: unknown) {
      setErr(tr(fromThrown(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.signedIn) {
      window.location.replace("/");
      return;
    }
    if (!auth.user?.is_admin) {
      setErr(tr({ code: "admin_required", message: "" }));
      setLoading(false);
      return;
    }
    reload();
  }, [auth.loading, auth.signedIn, auth.user, reload]);

  async function patchUser(email: string, body: Partial<AdminUser>) {
    try {
      const r = await authFetch(`/admin/users/${encodeURIComponent(email)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        alert(tr(await parseResponseError(r)));
        return;
      }
      const updated: AdminUser = await r.json();
      setUsers((us) => us.map((u) => (u.email === email ? { ...u, ...updated } : u)));
    } catch (e: unknown) {
      alert(tr(fromThrown(e)));
    }
  }

  function saveEditedCredits(u: AdminUser) {
    const n = parseInt(editCredits, 10);
    if (Number.isNaN(n) || n < 0) {
      alert(t("errors.invalid_credits", "Credits must be a non-negative integer"));
      return;
    }
    setEditingEmail(null);
    patchUser(u.email, { credits: n });
  }

  const filtered = users.filter((u) =>
    !search.trim() ? true : u.email.toLowerCase().includes(search.trim().toLowerCase()),
  );

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--fg-mute)" }}>
        Loading…
      </div>
    );
  }

  if (err) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h2 style={{ color: "#ef4444", fontFamily: "var(--font-serif)" }}>Cannot load admin panel</h2>
          <p style={{ color: "var(--fg-mute)" }}>{err}</p>
          <a href="/" style={{ color: "var(--blue-500, #4577ff)" }}>← Back to chat</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--fg)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <a
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--fg-mute)",
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            <ArrowLeftIcon size={14} /> Back to chat
          </a>
          <div style={{ flex: 1 }} />
          <button
            onClick={reload}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              background: "transparent",
              color: "var(--fg-mute)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <RefreshCwIcon size={13} /> Refresh
          </button>
        </div>

        <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: 32, margin: "0 0 8px" }}>
          Admin
        </h1>
        <p style={{ color: "var(--fg-mute)", margin: "0 0 24px" }}>
          {users.length} user{users.length === 1 ? "" : "s"} · You are signed in as <strong>{auth.user?.email}</strong>
        </p>

        <OpenAiKeyCard />

        <input
          type="search"
          placeholder="Search by email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 320,
            padding: "8px 12px",
            background: "var(--bg-1)",
            color: "var(--fg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 16,
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg-1)" }}>
                <th style={th}>Email</th>
                <th style={th}>Credits</th>
                <th style={th}>Flags</th>
                <th style={th}>Last login</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={td}>
                    <div style={{ fontWeight: 500 }}>{u.email}</div>
                    <div style={{ color: "var(--fg-dim)", fontSize: 11 }}>
                      Joined {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={td}>
                    {editingEmail === u.email ? (
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <input
                          type="number"
                          value={editCredits}
                          onChange={(e) => setEditCredits(e.target.value)}
                          autoFocus
                          style={{
                            width: 100,
                            padding: "4px 8px",
                            background: "var(--bg)",
                            color: "var(--fg)",
                            border: "1px solid var(--border-strong)",
                            borderRadius: 6,
                            fontSize: 13,
                          }}
                        />
                        <button
                          onClick={() => saveEditedCredits(u)}
                          style={{
                            padding: "4px 10px",
                            background: "var(--grad-primary)",
                            color: "white",
                            border: "none",
                            borderRadius: 6,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingEmail(null)}
                          style={{
                            padding: "4px 10px",
                            background: "transparent",
                            color: "var(--fg-mute)",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)" }}>
                        {u.is_unlimited ? <InfinityIcon size={14} style={{ color: "var(--amber-500, #f59e0b)" }} /> : u.credits.toLocaleString()}
                        <button
                          onClick={() => {
                            setEditingEmail(u.email);
                            setEditCredits(String(u.credits));
                          }}
                          title="Edit credits"
                          style={{
                            background: "transparent",
                            color: "var(--fg-dim)",
                            border: "none",
                            cursor: "pointer",
                            padding: 2,
                          }}
                        >
                          <PencilIcon size={12} />
                        </button>
                      </span>
                    )}
                  </td>
                  <td style={td}>
                    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
                      {u.is_admin && <Badge color="amber" label="admin" />}
                      {u.is_unlimited && <Badge color="green" label="unlimited" />}
                      {u.can_use_cpu && !u.is_unlimited && <Badge color="blue" label="cpu" />}
                      {u.is_banned && <Badge color="red" label="banned" />}
                    </span>
                  </td>
                  <td style={{ ...td, color: "var(--fg-mute)" }}>
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "—"}
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <ActionBtn
                        title={u.is_banned ? "Unban" : "Ban"}
                        onClick={() => patchUser(u.email, { is_banned: !u.is_banned })}
                        icon={u.is_banned ? <CheckCircle2Icon size={13} /> : <BanIcon size={13} />}
                        color={u.is_banned ? "#22c55e" : "#ef4444"}
                      />
                      {/* CPU access is implied by admin and by unlimited, so for
                          those users the flag says nothing about what they can
                          actually do — show it as already in effect rather than
                          as "not granted", which read as a lie. */}
                      <ActionBtn
                        title={
                          u.is_admin || u.is_unlimited ? "CPU access (already implied)"
                          : u.can_use_cpu ? "Revoke CPU" : "Grant CPU"
                        }
                        onClick={() => patchUser(u.email, { can_use_cpu: !u.can_use_cpu })}
                        icon={<CpuIcon size={13} />}
                        color={
                          u.is_admin || u.is_unlimited || u.can_use_cpu
                            ? "var(--fg-dim)" : "#22c55e"
                        }
                      />
                      <ActionBtn
                        title={u.is_unlimited ? "Remove from whitelist" : "Whitelist"}
                        onClick={() => patchUser(u.email, { is_unlimited: !u.is_unlimited })}
                        icon={<InfinityIcon size={13} />}
                        color={u.is_unlimited ? "var(--fg-dim)" : "var(--amber-500, #f59e0b)"}
                      />
                      <ActionBtn
                        title={u.is_admin ? "Demote" : "Promote to admin"}
                        onClick={() => {
                          if (!confirm(`${u.is_admin ? "Demote" : "Promote"} ${u.email}?`)) return;
                          patchUser(u.email, { is_admin: !u.is_admin });
                        }}
                        icon={<ShieldIcon size={13} />}
                        color={u.is_admin ? "var(--fg-dim)" : "var(--blue-500, #4577ff)"}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ ...td, textAlign: "center", color: "var(--fg-mute)", padding: 32 }}>
                    No users match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 14px",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: ".06em",
  color: "var(--fg-mute)",
};

const td: React.CSSProperties = {
  padding: "10px 14px",
  verticalAlign: "middle",
};

function Badge({ color, label }: { color: "amber" | "green" | "red" | "blue"; label: string }) {
  const palette: Record<string, { bg: string; fg: string }> = {
    amber: { bg: "rgba(245, 158, 11, 0.15)", fg: "#f59e0b" },
    green: { bg: "rgba(34, 197, 94, 0.15)", fg: "#22c55e" },
    red: { bg: "rgba(239, 68, 68, 0.15)", fg: "#ef4444" },
    blue: { bg: "rgba(69, 119, 255, 0.15)", fg: "#4577ff" },
  };
  const p = palette[color];
  return (
    <span
      style={{
        padding: "1px 6px",
        borderRadius: 4,
        background: p.bg,
        color: p.fg,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );
}

function ActionBtn({
  title,
  onClick,
  icon,
  color,
}: {
  title: string;
  onClick: () => void;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        padding: "5px 7px",
        background: "transparent",
        color,
        border: "1px solid var(--border)",
        borderRadius: 6,
        cursor: "pointer",
      }}
    >
      {icon}
    </button>
  );
}
