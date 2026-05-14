"use client";

import { useTranslation } from "react-i18next";

interface Props {
  onPrompt: (text: string) => void;
}

const STARTERS = [
  {
    label: "Silicon",
    sub: "vc-relax · LDA",
    prompt:
      "Si diamond cubic, vc-relax with LDA, ecutwfc 30 Ry, k-grid 8×8×8. Report lattice constant and bulk modulus.",
  },
  {
    label: "Graphene",
    sub: "scf · PBE",
    prompt:
      "Graphene 2D, scf with PBE, ecutwfc 60 Ry, k-grid 16×16×1. Report Dirac point and Fermi velocity.",
  },
  {
    label: "Iron",
    sub: "magnetic · PBE+U",
    prompt:
      "Fe bcc, magnetic scf with PBE+U (U=4.5 eV on 3d), ecutwfc 50 Ry. Report magnetic moment and lattice constant.",
  },
  {
    label: "TiO₂",
    sub: "rutile · band structure",
    prompt:
      "TiO2 rutile, band structure with PBE, ecutwfc 50 Ry. Compute band gap along Γ-X-M-R-Γ.",
  },
];

export function EmptyState({ onPrompt }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto">
      <div className="max-w-2xl w-full text-center">
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full text-xs tracking-widest uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--amber-500, #f59e0b)",
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
          }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live · GPT-4o · DFT Agent
        </div>

        <h1
          className="font-normal mb-3 text-grad"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(40px, 6vw, 64px)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          {t("emptyTitle")}
        </h1>
        <p className="mb-10" style={{ color: "var(--fg-mute)", fontSize: "clamp(15px, 1.4vw, 17px)" }}>
          {t("emptySubtitle")}
        </p>

        <div className="grid grid-cols-2 gap-3 text-left">
          {STARTERS.map((s) => (
            <button
              key={s.label}
              onClick={() => onPrompt(s.prompt)}
              className="group rounded-xl p-4 transition cursor-pointer"
              style={{
                background: "var(--bg-1)",
                border: "1px solid var(--border)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(69, 119, 255, 0.5)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "";
              }}
            >
              <div className="text-sm font-medium mb-1" style={{ color: "var(--blue-100)" }}>
                {s.label}
              </div>
              <div className="text-xs mb-2" style={{ color: "var(--fg-dim)", fontFamily: "var(--font-mono)" }}>
                {s.sub}
              </div>
              <div className="text-xs leading-relaxed" style={{ color: "var(--fg-mute)" }}>
                {s.prompt}
              </div>
            </button>
          ))}
        </div>

        <p className="mt-8 text-xs" style={{ color: "var(--fg-dim)" }}>
          {t("emptyHint")}
        </p>
      </div>
    </div>
  );
}
