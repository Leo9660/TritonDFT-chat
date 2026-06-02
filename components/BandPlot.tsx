"use client";

import { useRef, useState } from "react";
import { BandData } from "@/lib/api";

/**
 * Interactive SVG band-structure plot.
 *
 * When the Fermi energy is known, energies are zero-referenced to it (E − E_F)
 * and the view zooms to ±6 eV — which is what makes it read like a real band
 * diagram. Valence bands (below E_F) and conduction bands (above) are colored
 * differently, the gap between the valence-band max and conduction-band min is
 * shaded, and hovering shows a crosshair with the energy readout.
 */
export function BandPlot({ data }: { data: BandData }) {
  const W = 580;
  const H = 380;
  const pad = { l: 62, r: 18, t: 18, b: 40 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  // Only Fermi-align if E_F is actually within the band energy range — guards
  // against a stale/mismatched reference (then fall back to full range).
  const ef = data.e_fermi;
  const hasFermi =
    ef != null && Number.isFinite(ef) && ef >= data.e_min && ef <= data.e_max;
  const shift = hasFermi ? (ef as number) : 0;

  const yLo = hasFermi ? -6 : data.e_min - shift;
  const yHi = hasFermi ? 6 : data.e_max - shift;

  const kRange = data.k_max - data.k_min || 1;
  const eRange = yHi - yLo || 1;
  const x = (k: number) => pad.l + ((k - data.k_min) / kRange) * plotW;
  // y() takes a raw energy; subtract `shift` to get the referenced value.
  const y = (e: number) => pad.t + (1 - (e - shift - yLo) / eRange) * plotH;
  // inverse: cursor pixel → referenced energy
  const yToE = (py: number) => yLo + (1 - (py - pad.t) / plotH) * eRange;

  const N_TICKS = 6;
  const ticks = Array.from({ length: N_TICKS + 1 }, (_, i) => yLo + (eRange * i) / N_TICKS);

  // Compute VBM / CBM (referenced) to shade the gap, when Fermi-aligned.
  let vbm: number | null = null;
  let cbm: number | null = null;
  if (hasFermi) {
    for (const band of data.bands) {
      for (const [, e] of band) {
        const r = e - shift;
        if (r <= 0.0001) vbm = vbm == null ? r : Math.max(vbm, r);
        else cbm = cbm == null ? r : Math.min(cbm, r);
      }
    }
  }
  const gap = vbm != null && cbm != null && cbm > vbm ? cbm - vbm : null;

  const VALENCE = "#4577ff";
  const CONDUCT = "#22d3a5";

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    if (px < pad.l || px > pad.l + plotW || py < pad.t || py > pad.t + plotH) {
      setHover(null);
      return;
    }
    setHover({ x: px, y: py });
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        style={{ display: "block", maxWidth: "100%" }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <clipPath id="band-clip">
            <rect x={pad.l} y={pad.t} width={plotW} height={plotH} />
          </clipPath>
          <linearGradient id="gap-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CONDUCT} stopOpacity={0.1} />
            <stop offset="100%" stopColor={VALENCE} stopOpacity={0.1} />
          </linearGradient>
        </defs>

        <rect
          x={pad.l}
          y={pad.t}
          width={plotW}
          height={plotH}
          fill="rgba(255,255,255,0.02)"
          stroke="var(--border)"
        />

        {/* shaded band gap */}
        {gap != null && (
          <g clipPath="url(#band-clip)">
            <rect
              x={pad.l}
              y={y(cbm! + shift)}
              width={plotW}
              height={Math.max(0, y(vbm! + shift) - y(cbm! + shift))}
              fill="url(#gap-fill)"
            />
          </g>
        )}

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

        {/* bands (valence vs conduction) + Fermi line, clipped to the plot */}
        <g clipPath="url(#band-clip)">
          {data.bands.map((band, i) => {
            // Color a band by whether its midpoint sits below/above E_F.
            let stroke = VALENCE;
            if (hasFermi) {
              const mid = band[Math.floor(band.length / 2)]?.[1] ?? 0;
              stroke = mid - shift > 0 ? CONDUCT : VALENCE;
            }
            return (
              <polyline
                key={i}
                fill="none"
                stroke={stroke}
                strokeWidth={1.4}
                opacity={0.85}
                points={band.map(([k, e]) => `${x(k)},${y(e)}`).join(" ")}
              />
            );
          })}
          {hasFermi && (
            <line
              x1={pad.l}
              x2={pad.l + plotW}
              y1={y(shift)}
              y2={y(shift)}
              stroke="var(--amber-500, #f59e0b)"
              strokeWidth={1.3}
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

        {/* hover crosshair + readout */}
        {hover && (
          <g pointerEvents="none">
            <line
              x1={hover.x}
              x2={hover.x}
              y1={pad.t}
              y2={pad.t + plotH}
              stroke="var(--fg-mute)"
              strokeWidth={0.8}
              strokeDasharray="3 3"
              opacity={0.6}
            />
            <line
              x1={pad.l}
              x2={pad.l + plotW}
              y1={hover.y}
              y2={hover.y}
              stroke="var(--fg-mute)"
              strokeWidth={0.8}
              strokeDasharray="3 3"
              opacity={0.6}
            />
            <g
              transform={`translate(${Math.min(hover.x + 10, pad.l + plotW - 96)}, ${Math.max(
                hover.y - 30,
                pad.t + 2,
              )})`}
            >
              <rect width={92} height={24} rx={5} fill="var(--bg-1)" stroke="var(--border)" />
              <text x={7} y={15} fontSize={10.5} fill="var(--fg)" fontFamily="var(--font-mono)">
                {(yToE(hover.y) >= 0 ? "+" : "") + yToE(hover.y).toFixed(2)} eV
              </text>
            </g>
          </g>
        )}

        {/* axis labels */}
        <text x={pad.l + plotW / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--fg-mute)">
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

      {/* legend + summary */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          margin: "5px 0 0",
          fontSize: 11,
          color: "var(--fg-dim)",
        }}
      >
        <span>{data.n_bands} bands</span>
        {hasFermi && (
          <>
            <Legend color={VALENCE} label="valence" />
            <Legend color={CONDUCT} label="conduction" />
            <span style={{ color: "var(--amber-500,#f59e0b)" }}>┄ E_F</span>
          </>
        )}
        {gap != null && (
          <span style={{ color: "var(--fg-mute)", fontWeight: 600 }}>gap ≈ {gap.toFixed(2)} eV</span>
        )}
        <span style={{ marginLeft: "auto", opacity: 0.8 }}>hover to read energy</span>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span
        style={{ width: 14, height: 2.5, background: color, borderRadius: 2, display: "inline-block" }}
      />
      {label}
    </span>
  );
}
