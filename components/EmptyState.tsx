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
/* Starters are the first thing a new user clicks, so every one of them has to
 * finish quickly and succeed. That rules out most of what was here before:
 * a monolayer needs ~15 A of vacuum and the FFT grid that implies costs more
 * than a bulk cell four times its size; Born effective charges and phonon DOS
 * are DFPT sweeps; a bulk modulus is several runs plus an equation-of-state
 * fit; +U and spin-orbit each add their own way to fail.
 *
 * What is left is 1-4 atom bulk cells at high symmetry. Measured on real
 * hardware at 8 ranks, an scf of diamond Si is 0.9s and a full vc-relax 1.8s —
 * for these systems the agent's own reasoning dominates the wall clock, which
 * is the right place for a demo to spend its time.
 *
 * The prompts also no longer dictate cutoffs and k-meshes. Choosing those is
 * the agent's job and depends on the pseudopotential library in force, so a
 * hardcoded "ecutwfc 30 Ry" was both redundant and occasionally wrong.
 */
const ALL_STARTERS: Starter[] = [
  {
    label: "Silicon",
    sub: "band structure",
    prompt:
      "Calculate the band structure of bulk silicon and report the band gap.",
  },
  {
    label: "Silicon",
    sub: "lattice constant",
    prompt:
      "Relax bulk silicon and report the equilibrium lattice constant.",
  },
  {
    label: "Sodium",
    sub: "bcc metal",
    prompt:
      "Relax bulk sodium and report the equilibrium lattice constant.",
  },
  {
    label: "Aluminium",
    sub: "fcc metal",
    prompt:
      "Relax bulk aluminium and report the equilibrium lattice constant.",
  },
  {
    label: "MgO",
    sub: "density of states",
    prompt:
      "Compute the total density of states of bulk MgO and report the band gap.",
  },
  {
    label: "Diamond",
    sub: "wide gap",
    prompt:
      "Calculate the band structure of diamond and report the band gap.",
  },
  {
    label: "Silicon",
    sub: "phonons at gamma",
    prompt:
      "Compute the phonon frequencies of bulk silicon at the gamma point.",
  },
  {
    label: "Copper",
    sub: "fcc metal",
    prompt:
      "Relax bulk copper and report the equilibrium lattice constant.",
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
