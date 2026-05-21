"use client";

import { BandData } from "@/lib/api";

/** SVG band-structure plot — one polyline per band. */
export function BandPlot({ data }: { data: BandData }) {
  const W = 560;
  const H = 340;
  const pad = { l: 56, r: 16, t: 16, b: 36 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  const kRange = data.k_max - data.k_min || 1;
  const eRange = data.e_max - data.e_min || 1;
  const x = (k: number) => pad.l + ((k - data.k_min) / kRange) * plotW;
  const y = (e: number) => pad.t + (1 - (e - data.e_min) / eRange) * plotH;

  const yTicks = 5;
  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) =>
    data.e_min + (eRange * i) / yTicks,
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={W} height={H} style={{ display: "block", maxWidth: "100%" }}>
        {/* plot frame */}
        <rect
          x={pad.l}
          y={pad.t}
          width={plotW}
          height={plotH}
          fill="rgba(255,255,255,0.02)"
          stroke="var(--border)"
        />
        {/* y grid + ticks */}
        {tickVals.map((ev, i) => (
          <g key={i}>
            <line
              x1={pad.l}
              x2={pad.l + plotW}
              y1={y(ev)}
              y2={y(ev)}
              stroke="var(--border)"
              strokeDasharray="2 3"
              opacity={0.5}
            />
            <text
              x={pad.l - 8}
              y={y(ev) + 3}
              textAnchor="end"
              fontSize={10}
              fill="var(--fg-mute)"
              fontFamily="var(--font-mono)"
            >
              {ev.toFixed(1)}
            </text>
          </g>
        ))}
        {/* bands */}
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
          Energy (eV)
        </text>
      </svg>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--fg-dim)" }}>
        {data.n_bands} bands · energies as written by QE bands.x (not Fermi-shifted)
      </p>
    </div>
  );
}
