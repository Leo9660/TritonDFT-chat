"use client";

import { BandData } from "@/lib/api";

/**
 * SVG band-structure plot. When the Fermi energy is known, energies are
 * zero-referenced to it (E − E_F) and the view zooms to ±6 eV around it —
 * which is what makes it read like a real band diagram instead of a tangle.
 */
export function BandPlot({ data }: { data: BandData }) {
  const W = 560;
  const H = 360;
  const pad = { l: 60, r: 18, t: 16, b: 38 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  const hasFermi = data.e_fermi != null && Number.isFinite(data.e_fermi);
  const shift = hasFermi ? (data.e_fermi as number) : 0;

  // Display window, in Fermi-referenced (E − E_F) units.
  const yLo = hasFermi ? -6 : data.e_min - shift;
  const yHi = hasFermi ? 6 : data.e_max - shift;

  const kRange = data.k_max - data.k_min || 1;
  const eRange = yHi - yLo || 1;
  const x = (k: number) => pad.l + ((k - data.k_min) / kRange) * plotW;
  // y() takes a raw energy; subtract `shift` to get the referenced value.
  const y = (e: number) => pad.t + (1 - (e - shift - yLo) / eRange) * plotH;

  const N_TICKS = 6;
  const ticks = Array.from({ length: N_TICKS + 1 }, (_, i) => yLo + (eRange * i) / N_TICKS);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={W} height={H} style={{ display: "block", maxWidth: "100%" }}>
        <defs>
          <clipPath id="band-clip">
            <rect x={pad.l} y={pad.t} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect
          x={pad.l}
          y={pad.t}
          width={plotW}
          height={plotH}
          fill="rgba(255,255,255,0.02)"
          stroke="var(--border)"
        />

        {/* y grid + tick labels */}
        {ticks.map((ev, i) => (
          <g key={i}>
            <line
              x1={pad.l}
              x2={pad.l + plotW}
              y1={y(ev + shift)}
              y2={y(ev + shift)}
              stroke="var(--border)"
              strokeDasharray="2 3"
              opacity={0.5}
            />
            <text
              x={pad.l - 8}
              y={y(ev + shift) + 3}
              textAnchor="end"
              fontSize={10}
              fill="var(--fg-mute)"
              fontFamily="var(--font-mono)"
            >
              {ev.toFixed(1)}
            </text>
          </g>
        ))}

        {/* bands + Fermi line, clipped to the plot window */}
        <g clipPath="url(#band-clip)">
          {data.bands.map((band, i) => (
            <polyline
              key={i}
              fill="none"
              stroke="var(--blue-500, #4577ff)"
              strokeWidth={1.3}
              opacity={0.85}
              points={band.map(([k, e]) => `${x(k)},${y(e)}`).join(" ")}
            />
          ))}
          {hasFermi && (
            <line
              x1={pad.l}
              x2={pad.l + plotW}
              y1={y(shift)}
              y2={y(shift)}
              stroke="var(--amber-500, #f59e0b)"
              strokeWidth={1.2}
              strokeDasharray="5 3"
            />
          )}
        </g>
        {hasFermi && (
          <text
            x={pad.l + plotW - 4}
            y={y(shift) - 5}
            textAnchor="end"
            fontSize={10}
            fill="var(--amber-500, #f59e0b)"
            fontFamily="var(--font-mono)"
          >
            E_F
          </text>
        )}

        {/* axis labels */}
        <text
          x={pad.l + plotW / 2}
          y={H - 8}
          textAnchor="middle"
          fontSize={11}
          fill="var(--fg-mute)"
        >
          k-path
        </text>
        <text
          x={14}
          y={pad.t + plotH / 2}
          textAnchor="middle"
          fontSize={11}
          fill="var(--fg-mute)"
          transform={`rotate(-90 14 ${pad.t + plotH / 2})`}
        >
          {hasFermi ? "E − E_F (eV)" : "Energy (eV)"}
        </text>
      </svg>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--fg-dim)" }}>
        {data.n_bands} bands ·{" "}
        {hasFermi
          ? "zeroed at the Fermi level (dashed amber), ±6 eV window"
          : "energies as written by QE bands.x (Fermi level unknown)"}
      </p>
    </div>
  );
}
