"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X as XIcon,
  Play,
  Sparkles,
  Ban,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PendingPlan, PlanStep } from "@/lib/types";

/** Kept in sync with ALLOWED_FNS / FN_MAP in src/tool/tool_map.py. The backend
 * re-validates every tool name, so a drift here degrades the dropdown — it
 * can't produce an invalid run. */
const TOOLS: { value: string; binary: string }[] = [
  { value: "pw_vc_relax", binary: "pw.x · vc-relax" },
  { value: "pw_relax", binary: "pw.x · relax" },
  { value: "pw_scf", binary: "pw.x · scf" },
  { value: "pw_nscf", binary: "pw.x · nscf" },
  { value: "pw_bands", binary: "pw.x · bands" },
  { value: "bands_post", binary: "bands.x" },
  { value: "dos_post", binary: "dos.x" },
  { value: "projwfc_post", binary: "projwfc.x" },
  { value: "pp_post", binary: "pp.x" },
  { value: "pw_phonon_gamma", binary: "ph.x · gamma" },
  { value: "q2r_post", binary: "q2r.x" },
  { value: "matdyn_post", binary: "matdyn.x" },
  { value: "dynmat_post", binary: "dynmat.x" },
  { value: "elastic_post", binary: "ev.x" },
];

const binaryOf = (tool: string) => TOOLS.find((t) => t.value === tool)?.binary ?? "";

interface Props {
  open: boolean;
  pending: PendingPlan | null;
  onApprove: (steps?: { problem: string; tool: string; input: string }[]) => void;
  onSuggest: (suggestion: string) => void;
  onCancel: () => void;
}

type EditableStep = Pick<PlanStep, "problem" | "tool" | "input">;

const toEditable = (s: PlanStep): EditableStep => ({
  problem: s.problem,
  tool: s.tool,
  input: s.input,
});

export function PlanReviewModal({ open, pending, onApprove, onSuggest, onCancel }: Props) {
  const { t } = useTranslation();
  const [steps, setSteps] = useState<EditableStep[]>([]);
  const [suggestion, setSuggestion] = useState("");

  const original = useMemo(() => (pending?.steps ?? []).map(toEditable), [pending]);

  // Reset local edits whenever a new plan revision is surfaced.
  useEffect(() => {
    setSteps(original.map((s) => ({ ...s })));
    setSuggestion("");
  }, [original]);

  const dirty = useMemo(() => {
    if (original.length !== steps.length) return true;
    return original.some(
      (s, i) =>
        s.problem !== steps[i]?.problem ||
        s.tool !== steps[i]?.tool ||
        s.input !== steps[i]?.input,
    );
  }, [original, steps]);

  if (!open || !pending) return null;

  const patch = (i: number, field: keyof EditableStep, value: string) =>
    setSteps((prev) => prev.map((s, j) => (j === i ? { ...s, [field]: value } : s)));

  const remove = (i: number) => setSteps((prev) => prev.filter((_, j) => j !== i));

  const move = (i: number, dir: -1 | 1) =>
    setSteps((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const add = () =>
    setSteps((prev) => [...prev, { problem: "", tool: "pw_scf", input: "" }]);

  /* bands.x without a preceding pw.x bands run silently post-processes the wrong
   * k-set — the exact mistake this release fixes. Warn rather than block: the
   * user may know something we don't. */
  const bandsWarning = steps.some(
    (s, i) => s.tool === "bands_post" && !steps.slice(0, i).some((p) => p.tool === "pw_bands"),
  );

  const fieldStyle = {
    background: "var(--bg-0)",
    border: "1px solid var(--border-strong)",
    color: "var(--fg)",
  } as const;

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
          maxHeight: "min(86vh, 780px)",
        }}
      >
        <header className="flex items-start justify-between px-5 pt-5 pb-3">
          <div>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500 }}>
              {t("reviewPlan")}
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--fg-mute)" }}>
              <span style={{ color: "var(--blue-500)" }}>
                {t("stepCount", { count: steps.length, defaultValue: `${steps.length} steps` })}
              </span>
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

        <div className="overflow-y-auto px-5 flex-1">
          {steps.map((s, i) => (
            <div
              key={i}
              className="mb-3 rounded-lg p-3"
              style={{ background: "var(--bg-0)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[11px] px-1.5 py-0.5 rounded"
                  style={{
                    fontFamily: "var(--font-mono)",
                    background: "rgba(69,119,255,0.12)",
                    color: "var(--blue-500)",
                  }}
                >
                  {i + 1}
                </span>
                <select
                  value={s.tool}
                  onChange={(e) => patch(i, "tool", e.target.value)}
                  className="text-xs px-2 py-1 rounded-md outline-none"
                  style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }}
                >
                  {TOOLS.every((tt) => tt.value !== s.tool) && (
                    <option value={s.tool}>{s.tool}</option>
                  )}
                  {TOOLS.map((tt) => (
                    <option key={tt.value} value={tt.value}>
                      {tt.value}
                    </option>
                  ))}
                </select>
                <span className="text-[11px]" style={{ color: "var(--fg-dim)", fontFamily: "var(--font-mono)" }}>
                  {binaryOf(s.tool)}
                </span>
                <span className="flex-1" />
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  title={t("moveUp") as string}
                  className="p-1 rounded transition"
                  style={{ color: "var(--fg-dim)", opacity: i === 0 ? 0.3 : 1 }}
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === steps.length - 1}
                  title={t("moveDown") as string}
                  className="p-1 rounded transition"
                  style={{ color: "var(--fg-dim)", opacity: i === steps.length - 1 ? 0.3 : 1 }}
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  onClick={() => remove(i)}
                  title={t("removeStep") as string}
                  className="p-1 rounded transition"
                  style={{ color: "var(--fg-dim)" }}
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Only the executable (the dropdown above) and the subproblem's
                  own description are editable. `input` ("Required input") stays
                  in state so it round-trips to the backend untouched — showing
                  it as a second, identical-looking text box just made every step
                  read as two interchangeable fields. */}
              <input
                value={s.problem}
                onChange={(e) => patch(i, "problem", e.target.value)}
                placeholder={t("planProblemPlaceholder") as string}
                className="w-full px-2.5 py-1.5 rounded-md outline-none text-sm"
                style={fieldStyle}
              />
            </div>
          ))}

          <button
            onClick={add}
            className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg text-xs transition"
            style={{ border: "1px dashed var(--border-strong)", color: "var(--fg-mute)" }}
          >
            <Plus size={13} /> {t("addStep")}
          </button>

          {bandsWarning && (
            <div
              className="flex items-start gap-2 mb-3 p-2.5 rounded-lg text-xs"
              style={{
                background: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(251,191,36,0.3)",
                color: "#fbbf24",
              }}
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{t("bandsPostWarning")}</span>
            </div>
          )}

          <div className="mb-2">
            <label
              className="block text-[11px] mb-1.5 tracking-wider uppercase"
              style={{ color: "var(--fg-dim)" }}
            >
              {t("suggestPlanRevision")}
            </label>
            <textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder={t("suggestPlanPlaceholder") as string}
              rows={2}
              className="w-full p-3 rounded-lg outline-none resize-y text-sm"
              style={fieldStyle}
            />
          </div>
        </div>

        <footer
          className="flex items-center justify-between gap-2 px-5 py-4 border-t"
          style={{ borderColor: "var(--border)" }}
        >
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
              onClick={() => onApprove(dirty ? steps : undefined)}
              disabled={steps.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white font-medium text-sm transition"
              style={{
                background: "var(--grad-primary)",
                boxShadow: "0 0 0 1px var(--tint-4) inset",
                opacity: steps.length === 0 ? 0.45 : 1,
              }}
            >
              <Play size={14} /> {dirty ? t("runEditedPlan") : t("runPlan")}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
