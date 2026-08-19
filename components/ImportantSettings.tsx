"use client";

import { useTranslation } from "react-i18next";
import { SlidersHorizontal } from "lucide-react";
import {
  Accuracy, PseudoChoice, PseudoMode, Relativistic, Xc,
  DEFAULT_PSEUDO, pseudoAvailable,
} from "@/lib/types";

interface Props {
  pseudo: PseudoChoice;
  onPseudoChange: (next: PseudoChoice) => void;
  disabled?: boolean;
}

const XC: Xc[] = ["LDA", "PBE", "PBEsol"];
const REL: Relativistic[] = ["SR", "FR"];
const ACC: Accuracy[] = ["standard", "stringent"];

/**
 * Settings that change the science, pinned open in the right column.
 *
 * Deliberately not a menu or a collapsible: these are ENFORCED — the backend
 * patches pseudo_dir and input_dft to whatever is selected — so what a run will
 * actually use must be readable without a click. The activity log below it is
 * the closable half, because it is a transcript rather than a decision.
 *
 * Every option stays selectable; an impossible pair (PseudoDojo publishes no
 * fully-relativistic LDA) moves the OTHER axis instead of rolling back the click.
 */
export function ImportantSettings({ pseudo, onPseudoChange, disabled }: Props) {
  const { t } = useTranslation();
  function pick(next: Partial<PseudoChoice>) {
    const merged = { ...pseudo, ...next };
    if (pseudoAvailable(merged.xc, merged.relativistic)) {
      onPseudoChange(merged);
      return;
    }
    // Every option stays selectable. When a pick lands on a combination that
    // does not exist, the axis the user just touched WINS and the other one
    // moves to its first legal value. Rolling back the click instead would mean
    // "to choose LDA, first switch FR to SR" — the user would have to know the
    // constraint before they could satisfy it.
    if (next.xc !== undefined) {
      merged.relativistic =
        REL.find((r) => pseudoAvailable(merged.xc, r)) ?? merged.relativistic;
    } else if (next.relativistic !== undefined) {
      merged.xc = XC.find((x) => pseudoAvailable(x, merged.relativistic)) ?? merged.xc;
    }
    onPseudoChange(merged);
  }

  const isDefault =
    pseudo.xc === DEFAULT_PSEUDO.xc &&
    pseudo.relativistic === DEFAULT_PSEUDO.relativistic &&
    pseudo.accuracy === DEFAULT_PSEUDO.accuracy;

  const sel = {
    width: "100%",
    background: "var(--bg-0)",
    border: "1px solid var(--border)",
    color: "var(--fg)",
    borderRadius: 7,
    padding: "5px 7px",
    fontSize: 11,
    fontFamily: "var(--font-mono)",
    cursor: disabled ? "not-allowed" : "pointer",
  } as const;

  return (
    <section
      className="flex flex-col shrink-0"
      style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-1)" }}
    >
      <header className="flex items-center gap-2 px-3 py-2"
              style={{ borderBottom: "1px solid var(--border)" }}>
        <SlidersHorizontal size={14} style={{ color: "var(--blue-500)" }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg)" }}>
          {t("importantSettings")}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--blue-500)" }}>
          {pseudo.xc}·{pseudo.relativistic}·{pseudo.accuracy === "stringent" ? "str" : "std"}
        </span>
      </header>

      <div className="px-3 py-3">
        <div className="text-xs font-semibold mb-0.5" style={{ color: "var(--fg)" }}>
          {t("optPseudoLabel")}
        </div>
        <p className="text-[10px] leading-snug mb-2" style={{ color: "var(--fg-dim)" }}>
          {t("optPseudoDesc")}
        </p>

        <div className="grid grid-cols-3 gap-1.5">
          <select style={sel} disabled={disabled} value={pseudo.xc}
                  onChange={(e) => pick({ xc: e.target.value as Xc })} title={t("pseudoXc") as string}>
            {XC.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <select style={sel} disabled={disabled} value={pseudo.relativistic}
                  onChange={(e) => pick({ relativistic: e.target.value as Relativistic })}
                  title={t("pseudoRel") as string}>
            {REL.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select style={sel} disabled={disabled} value={pseudo.accuracy}
                  onChange={(e) => pick({ accuracy: e.target.value as Accuracy })}
                  title={t("pseudoAcc") as string}>
            {ACC.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mt-1 text-[9px]" style={{ color: "var(--fg-dim)" }}>
          <span>{t("pseudoAxisXc")}</span>
          <span>{t("pseudoAxisRel")}</span>
          <span>{t("pseudoAxisAcc")}</span>
        </div>

        {/* Who wins when the prompt also names a library. Without this the
            dropdown always won and "use PBEsol" in a query did nothing — but
            handing the choice to the agent unconditionally is wrong for someone
            who does not know what the choice means. */}
        <div className="flex items-center gap-1 mt-2.5">
          {(["manual", "auto"] as PseudoMode[]).map((m) => {
            const on = (pseudo.mode ?? "manual") === m;
            return (
              <button
                key={m}
                type="button"
                disabled={disabled}
                onClick={() => pick({ mode: m })}
                className="flex-1 px-2 py-1 rounded-md text-[10px] transition"
                style={{
                  border: `1px solid ${on ? "var(--border-strong)" : "var(--border)"}`,
                  background: on ? "var(--bg-2)" : "transparent",
                  color: on ? "var(--fg)" : "var(--fg-dim)",
                  fontWeight: on ? 600 : 400,
                  cursor: disabled ? "default" : "pointer",
                }}
              >
                {t(m === "manual" ? "pseudoModeManual" : "pseudoModeAuto")}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] leading-snug mt-1" style={{ color: "var(--fg-dim)" }}>
          {t((pseudo.mode ?? "manual") === "manual" ? "pseudoModeManualDesc" : "pseudoModeAutoDesc")}
        </p>

        <div className="mt-2.5 pt-2.5" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="text-[10px]" style={{ color: "var(--fg-mute)", fontFamily: "var(--font-mono)" }}>
            {pseudo.xc} · {pseudo.relativistic} · {pseudo.accuracy}
            {isDefault ? ` (${t("pseudoDefault")})` : ""}
          </div>
          <div className="text-[10px] mt-1 leading-snug" style={{ color: "var(--fg-dim)" }}>
            {pseudo.relativistic === "FR" ? t("pseudoNoteFr") : t("pseudoNoteSr")}
            {" "}
            {pseudo.xc === "LDA" ? t("pseudoNoteLda") : t("pseudoNoteGga")}
          </div>
        </div>
      </div>
    </section>
  );
}
