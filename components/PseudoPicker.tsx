"use client";

import { useTranslation } from "react-i18next";
import {
  Accuracy, PseudoChoice, Relativistic, Xc,
  DEFAULT_PSEUDO, pseudoAvailable,
} from "@/lib/types";

interface Props {
  value: PseudoChoice;
  onChange: (next: PseudoChoice) => void;
  disabled?: boolean;
}

const XC: Xc[] = ["LDA", "PBE", "PBEsol"];
const REL: Relativistic[] = ["SR", "FR"];
const ACC: Accuracy[] = ["standard", "stringent"];

/**
 * Three dropdowns over the axes the PseudoDojo tree actually has.
 *
 * These are NOT hints for the model: the backend patches pseudo_dir and
 * input_dft to whatever is selected here, so the choice is guaranteed rather
 * than parsed out of the prompt. That is why an unavailable combination has to
 * be blocked in the UI — FR+LDA does not exist on disk and the backend rejects
 * it, so offering it would be a promise we cannot keep.
 */
export function PseudoPicker({ value, onChange, disabled }: Props) {
  const { t } = useTranslation();

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

  function pick(next: Partial<PseudoChoice>) {
    const merged = { ...value, ...next };
    // Switching to a combination that does not exist silently corrects the other
    // axis rather than leaving an unrunnable selection on screen.
    if (!pseudoAvailable(merged.xc, merged.relativistic)) {
      merged.relativistic = next.relativistic ? "SR" : merged.relativistic;
      if (!pseudoAvailable(merged.xc, merged.relativistic)) merged.xc = "PBE";
    }
    onChange(merged);
  }

  const isDefault =
    value.xc === DEFAULT_PSEUDO.xc &&
    value.relativistic === DEFAULT_PSEUDO.relativistic &&
    value.accuracy === DEFAULT_PSEUDO.accuracy;

  return (
    <div>
      <div className="text-xs font-semibold" style={{ color: "var(--fg)" }}>
        {t("optPseudoLabel")}
      </div>
      <p className="text-[10px] leading-snug mt-0.5 mb-1.5" style={{ color: "var(--fg-dim)" }}>
        {t("optPseudoDesc")}
      </p>

      <div className="grid grid-cols-3 gap-1.5">
        <select style={sel} disabled={disabled} value={value.xc}
                onChange={(e) => pick({ xc: e.target.value as Xc })} title={t("pseudoXc") as string}>
          {XC.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>

        <select style={sel} disabled={disabled} value={value.relativistic}
                onChange={(e) => pick({ relativistic: e.target.value as Relativistic })}
                title={t("pseudoRel") as string}>
          {REL.map((r) => (
            <option key={r} value={r} disabled={!pseudoAvailable(value.xc, r)}>
              {r}
            </option>
          ))}
        </select>

        <select style={sel} disabled={disabled} value={value.accuracy}
                onChange={(e) => pick({ accuracy: e.target.value as Accuracy })}
                title={t("pseudoAcc") as string}>
          {ACC.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="text-[10px] mt-1" style={{ color: "var(--fg-dim)", fontFamily: "var(--font-mono)" }}>
        {value.xc} · {value.relativistic} · {value.accuracy}
        {isDefault ? ` (${t("pseudoDefault")})` : ""}
        {value.relativistic === "FR" ? ` · ${t("pseudoSocCapable")}` : ""}
      </div>
    </div>
  );
}
