"use client";

import { useEffect, useMemo, useState } from "react";
import { X as XIcon, Play, Sparkles, Ban } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PendingStep, PendingScript } from "@/lib/types";

interface Props {
  open: boolean;
  pending: PendingStep | null;
  /** Approve & run. Pass edited scripts only when the user changed them. */
  onApprove: (scripts?: PendingScript[]) => void;
  /** Ask the LLM to revise the script with a natural-language suggestion. */
  onSuggest: (suggestion: string) => void;
  /** Cancel the whole job. */
  onCancel: () => void;
}

export function ScriptApprovalModal({ open, pending, onApprove, onSuggest, onCancel }: Props) {
  const { t } = useTranslation();
  const [edited, setEdited] = useState<PendingScript[]>([]);
  const [suggestion, setSuggestion] = useState("");

  // Reset local edits whenever a new step is surfaced.
  useEffect(() => {
    setEdited(pending?.scripts?.map((s) => ({ ...s })) ?? []);
    setSuggestion("");
  }, [pending?.step_index, pending?.attempt, pending]);

  const dirty = useMemo(() => {
    const orig = pending?.scripts ?? [];
    if (orig.length !== edited.length) return true;
    return orig.some((s, i) => s.content !== edited[i]?.content);
  }, [pending, edited]);

  if (!open || !pending) return null;

  const total = pending.total_steps ? `/${pending.total_steps}` : "";
  const stepLabel = `${t("step")} ${pending.step_index}${total}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 anim-slide-in"
      style={{ background: "var(--scrim)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl flex flex-col"
        style={{
          background: "var(--bg-1)",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 20px 60px var(--scrim)",
          maxHeight: "min(86vh, 760px)",
        }}
      >
        {/* Header */}
        <header className="flex items-start justify-between px-5 pt-5 pb-3">
          <div>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500 }}>
              {t("reviewScript")}
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--fg-mute)" }}>
              <span style={{ color: "var(--blue-500)" }}>{stepLabel}</span>
              {pending.tool ? ` · ${pending.tool}` : ""}
              {pending.attempt > 1 ? ` · ${t("attempt")} ${pending.attempt}` : ""}
            </p>
          </div>
          <button
            onClick={onCancel}
            title={t("cancel") as string}
            className="p-1 rounded-md transition"
            style={{ color: "var(--fg-dim)" }}
          >
            <XIcon size={18} />
          </button>
        </header>

        {pending.problem && (
          <p className="px-5 pb-2 text-sm" style={{ color: "var(--fg-mute)" }}>
            {pending.problem}
          </p>
        )}

        {/* Editable script(s) */}
        <div className="overflow-y-auto px-5 flex-1">
          {edited.map((s, i) => (
            <div key={s.filename || i} className="mb-3">
              <label
                className="block text-[11px] mb-1.5 tracking-wider uppercase"
                style={{ color: "var(--fg-dim)", fontFamily: "var(--font-mono)" }}
              >
                {s.filename || `input_${i + 1}.in`}
              </label>
              <textarea
                value={s.content}
                onChange={(e) =>
                  setEdited((prev) =>
                    prev.map((p, j) => (j === i ? { ...p, content: e.target.value } : p)),
                  )
                }
                spellCheck={false}
                rows={Math.min(18, Math.max(6, s.content.split("\n").length + 1))}
                className="w-full p-3 rounded-lg outline-none resize-y text-xs"
                style={{
                  background: "var(--bg-0)",
                  border: "1px solid var(--border-strong)",
                  color: "var(--fg)",
                  fontFamily: "var(--font-mono)",
                  lineHeight: 1.5,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(69, 119, 255, 0.5)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
              />
            </div>
          ))}

          {/* Suggestion */}
          <div className="mb-2">
            <label className="block text-[11px] mb-1.5 tracking-wider uppercase" style={{ color: "var(--fg-dim)" }}>
              {t("suggestRevision")}
            </label>
            <textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder={t("suggestPlaceholder") as string}
              rows={2}
              className="w-full p-3 rounded-lg outline-none resize-y text-sm"
              style={{
                background: "var(--bg-0)",
                border: "1px solid var(--border-strong)",
                color: "var(--fg)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(69, 119, 255, 0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
            />
          </div>
        </div>

        {/* Footer actions */}
        <footer className="flex items-center justify-between gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition"
            style={{ color: "var(--fg-mute)" }}
          >
            <Ban size={14} /> {t("cancelJob")}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSuggest(suggestion.trim())}
              disabled={!suggestion.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition"
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--border-strong)",
                color: "var(--fg)",
                opacity: suggestion.trim() ? 1 : 0.45,
              }}
            >
              <Sparkles size={14} /> {t("askAiRevise")}
            </button>
            <button
              onClick={() => onApprove(dirty ? edited : undefined)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white font-medium text-sm transition"
              style={{ background: "var(--grad-primary)", boxShadow: "0 0 0 1px var(--tint-4) inset" }}
            >
              <Play size={14} /> {dirty ? t("runEdited") : t("runAsIs")}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
