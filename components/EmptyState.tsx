"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  onPrompt: (text: string) => void;
}

interface Starter {
  label: string;
  sub: string;
  prompt: string;
}

// 12 starter prompts spanning semiconductors / metals / 2D / ionic / magnetic / heavy.
// Each visit shows 4 randomly.
const ALL_STARTERS: Starter[] = [
  {
    label: "Silicon",
    sub: "vc-relax · LDA",
    prompt:
      "Si diamond cubic, vc-relax with LDA, ecutwfc 30 Ry, k-grid 8×8×8. Report lattice constant and bulk modulus.",
  },
  {
    label: "Graphene",
    sub: "scf · PBE · 2D",
    prompt:
      "Graphene 2D, scf with PBE, ecutwfc 60 Ry, k-grid 16×16×1, vacuum 15 Å. Report Dirac point and Fermi velocity.",
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
  {
    label: "Diamond",
    sub: "C · bulk modulus",
    prompt:
      "Diamond cubic carbon, vc-relax with PBE, ecutwfc 80 Ry, k-grid 8×8×8. Report lattice constant and bulk modulus.",
  },
  {
    label: "Copper",
    sub: "fcc metal · workfunction",
    prompt:
      "Cu fcc, scf with PBE, ecutwfc 40 Ry, k-grid 12×12×12. Report cohesive energy and equilibrium lattice constant.",
  },
  {
    label: "NaCl",
    sub: "rock salt · ionic",
    prompt:
      "NaCl rock-salt, vc-relax with PBE, ecutwfc 50 Ry, k-grid 6×6×6. Report lattice constant and Born effective charges.",
  },
  {
    label: "GaAs",
    sub: "zinc-blende · direct gap",
    prompt:
      "GaAs zinc-blende, scf with PBE, ecutwfc 50 Ry, k-grid 8×8×8. Then nscf for band structure along Γ-X-L-Γ.",
  },
  {
    label: "MoS₂",
    sub: "2D TMD · monolayer",
    prompt:
      "MoS2 monolayer 2H, scf with PBE, ecutwfc 60 Ry, k-grid 12×12×1, vacuum 15 Å. Report band gap (direct vs indirect).",
  },
  {
    label: "Aluminum",
    sub: "fcc · phonons",
    prompt:
      "Al fcc, scf with PBE, ecutwfc 40 Ry, k-grid 10×10×10. Then phonon DOS via DFPT on a 4×4×4 q-grid.",
  },
  {
    label: "hBN",
    sub: "2D · wide gap",
    prompt:
      "Hexagonal BN monolayer, scf with PBE, ecutwfc 60 Ry, k-grid 12×12×1, vacuum 15 Å. Report band gap.",
  },
  {
    label: "Germanium",
    sub: "diamond · spin-orbit",
    prompt:
      "Ge diamond cubic, scf with PBE + spin-orbit, ecutwfc 40 Ry, k-grid 8×8×8. Report band gap (direct vs indirect).",
  },
];

function pickRandom<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export function EmptyState({ onPrompt }: Props) {
  const { t } = useTranslation();
  const [picks, setPicks] = useState<Starter[]>([]);

  useEffect(() => {
    setPicks(pickRandom(ALL_STARTERS, 4));
  }, []);

  function reshuffle() {
    setPicks(pickRandom(ALL_STARTERS, 4));
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto">
      <div className="max-w-2xl w-full text-center">
        <div
          className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full text-xs tracking-widest uppercase"
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
        <p
          className="mb-6"
          style={{ color: "var(--fg-mute)", fontSize: "clamp(15px, 1.4vw, 17px)" }}
        >
          {t("emptySubtitle")}
        </p>

        <div className="flex items-center justify-center gap-2 mb-4 text-xs" style={{ color: "var(--fg-dim)" }}>
          <span>{t("starterHint")}</span>
          <button
            onClick={reshuffle}
            className="underline-offset-2 transition"
            style={{ color: "var(--fg-mute)", textDecoration: "underline", textDecorationStyle: "dotted" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--blue-500)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-mute)")}
          >
            {t("shuffle")}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-left">
          {picks.map((s) => (
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
              <div className="text-xs leading-relaxed line-clamp-3" style={{ color: "var(--fg-mute)" }}>
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
