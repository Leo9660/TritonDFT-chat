"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import {
  Accuracy, PseudoChoice, Relativistic, Xc,
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
 * The settings a DFT user actually needs to see before running: currently the
 * pseudopotential library, along the three axes the PseudoDojo tree has.
 *
 * These are enforced, not suggested — the backend patches pseudo_dir and
 * input_dft to whatever is selected — so the trigger always shows the live value
 * rather than hiding it behind a menu, and combinations that do not exist on
 * disk (there is no fully-relativistic LDA) are blocked here rather than failing
 * at run time.
 */
export function ImportantSettings({ pseudo, onPseudoChange, disabled }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function pick(next: Partial<PseudoChoice>) {
    const merged = { ...pseudo, ...next };
    // Correct the other axis rather than leaving an unrunnable selection.
    if (!pseudoAvailable(merged.xc, merged.relativistic)) {
      merged.relativistic = next.relativistic ? "SR" : merged.relativistic;
      if (!pseudoAvailable(merged.xc, merged.relativistic)) merged.xc = "PBE";
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
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm transition"
        style={{
          color: open ? "var(--fg)" : "var(--fg-mute)",
          background: open ? "var(--bg-2)" : "transparent",
          border: "1px solid " + (open ? "var(--border-strong)" : "transparent"),
        }}
        title={t("importantSettings") as string}
      >
        <SlidersHorizontal size={14} />
        <span className="hidden lg:inline" style={{ fontSize: 12 }}>
          {t("importantSettings")}
        </span>
        {/* Always visible: the value is enforced, so it should never be hidden. */}
        <span
          className="hidden md:inline"
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--blue-500)" }}
        >
          {pseudo.xc}·{pseudo.relativistic}·{pseudo.accuracy === "stringent" ? "str" : "std"}
        </span>
        <ChevronDown size={12} style={{ opacity: 0.6 }} />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1.5 rounded-xl p-3.5"
          style={{
            width: 320,
            background: "var(--bg-1)",
            border: "1px solid var(--border-strong)",
            boxShadow: "0 16px 44px rgba(0,0,0,0.55)",
          }}
        >
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
              {REL.map((r) => (
                <option key={r} value={r} disabled={!pseudoAvailable(pseudo.xc, r)}>{r}</option>
              ))}
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

          <div className="mt-2.5 pt-2.5" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="text-[10px]" style={{ color: "var(--fg-mute)", fontFamily: "var(--font-mono)" }}>
              {pseudo.xc} · {pseudo.relativistic} · {pseudo.accuracy}
              {isDefault ? ` (${t("pseudoDefault")})` : ""}
            </div>
            <div className="text-[10px] mt-1" style={{ color: "var(--fg-dim)" }}>
              {pseudo.relativistic === "FR" ? t("pseudoNoteFr") : t("pseudoNoteSr")}
              {" "}
              {pseudo.xc === "LDA" ? t("pseudoNoteLda") : t("pseudoNoteGga")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
