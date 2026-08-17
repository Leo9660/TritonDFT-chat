"use client";

import { useMemo, useRef, useState } from "react";

export interface LineSeries {
  label: string;
  points: [number, number][];
}

interface Props {
  series: LineSeries[];
  xLabel?: string;
  yLabel?: string;
  /** Draws a dashed vertical reference line, e.g. the Fermi level. */
  markerX?: number | null;
  markerLabel?: string;
  /** Clamp the x window to markerX ± this, when a marker is present. */
  windowAroundMarker?: number;
}

/* Brand-neutral categorical palette: distinguishable in both themes and
 * colour-blind safe enough for the handful of series a PDOS plot needs. */
const COLORS = ["#4577ff", "#f59e0b", "#10b981", "#a78bfa", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

/**
 * Generic multi-series line chart.
 *
 * Deliberately property-agnostic: it takes labelled XY series and knows nothing
 * about DOS, PDOS or anything else. The backend derives labels from the QE
 * output's own comment header and filenames, so adding a new property later
 * needs no new component.
 */
export function LinePlot({
  series,
  xLabel = "",
  yLabel = "",
  markerX = null,
  markerLabel = "",
  windowAroundMarker,
}: Props) {
  const W = 580;
  const H = 300;
  const pad = { l: 60, r: 14, t: 14, b: 40 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const visible = series.filter((s) => !hidden.has(s.label));

  const bounds = useMemo(() => {
    const pts = visible.flatMap((s) => s.points);
    if (!pts.length) return null;
    let xLo = Math.min(...pts.map((p) => p[0]));
    let xHi = Math.max(...pts.map((p) => p[0]));
    if (markerX != null && windowAroundMarker) {
      xLo = Math.max(xLo, markerX - windowAroundMarker);
      xHi = Math.min(xHi, markerX + windowAroundMarker);
    }
    const inWin = pts.filter((p) => p[0] >= xLo && p[0] <= xHi);
    const yHi = Math.max(...(inWin.length ? inWin : pts).map((p) => p[1]));
    return { xLo, xHi, yLo: 0, yHi: yHi > 0 ? yHi * 1.05 : 1 };
  }, [visible, markerX, windowAroundMarker]);

  if (!bounds || !visible.length) return null;

  const xr = bounds.xHi - bounds.xLo || 1;
  const yr = bounds.yHi - bounds.yLo || 1;
  const px = (v: number) => pad.l + ((v - bounds.xLo) / xr) * plotW;
  const py = (v: number) => pad.t + (1 - (v - bounds.yLo) / yr) * plotH;

  const path = (pts: [number, number][]) =>
    pts
      .filter((p) => p[0] >= bounds.xLo && p[0] <= bounds.xHi)
      .map((p, i) => `${i ? "L" : "M"}${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`)
      .join("");

  const xTicks = 5;
  const yTicks = 4;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const sx = ((e.clientX - r.left) / r.width) * W;
    if (sx < pad.l || sx > W - pad.r) return setHover(null);
    setHover({ x: sx, y: bounds.xLo + ((sx - pad.l) / plotW) * xr });
  };

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", maxWidth: W }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* grid + axes */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const v = bounds.yLo + (i / yTicks) * yr;
          return (
            <g key={`y${i}`}>
              <line
                x1={pad.l} x2={W - pad.r} y1={py(v)} y2={py(v)}
                stroke="currentColor" strokeOpacity={0.09}
              />
              <text
                x={pad.l - 7} y={py(v) + 3} textAnchor="end"
                fontSize={9} fill="currentColor" fillOpacity={0.5}
              >
                {v.toFixed(v < 10 ? 1 : 0)}
              </text>
            </g>
          );
        })}
        {Array.from({ length: xTicks + 1 }, (_, i) => {
          const v = bounds.xLo + (i / xTicks) * xr;
          return (
            <text
              key={`x${i}`} x={px(v)} y={H - pad.b + 14} textAnchor="middle"
              fontSize={9} fill="currentColor" fillOpacity={0.5}
            >
              {v.toFixed(1)}
            </text>
          );
        })}

        {markerX != null && markerX >= bounds.xLo && markerX <= bounds.xHi && (
          <g>
            <line
              x1={px(markerX)} x2={px(markerX)} y1={pad.t} y2={H - pad.b}
              stroke="#ef4444" strokeOpacity={0.65} strokeDasharray="4 3"
            />
            <text
              x={px(markerX) + 4} y={pad.t + 10}
              fontSize={9} fill="#ef4444" fillOpacity={0.9}
            >
              {markerLabel}
            </text>
          </g>
        )}

        {visible.map((s, i) => (
          <path
            key={s.label}
            d={path(s.points)}
            fill="none"
            stroke={COLORS[series.findIndex((x) => x.label === s.label) % COLORS.length]}
            strokeWidth={1.4}
          />
        ))}

        {hover && (
          <line
            x1={hover.x} x2={hover.x} y1={pad.t} y2={H - pad.b}
            stroke="currentColor" strokeOpacity={0.25}
          />
        )}

        <text
          x={pad.l + plotW / 2} y={H - 4} textAnchor="middle"
          fontSize={10} fill="currentColor" fillOpacity={0.6}
        >
          {xLabel}
        </text>
        <text
          x={12} y={pad.t + plotH / 2} textAnchor="middle" fontSize={10}
          fill="currentColor" fillOpacity={0.6}
          transform={`rotate(-90 12 ${pad.t + plotH / 2})`}
        >
          {yLabel}
        </text>
      </svg>

      {series.length > 1 && (
        <div className="flex flex-wrap gap-2 mt-1.5">
          {series.map((s, i) => {
            const off = hidden.has(s.label);
            return (
              <button
                key={s.label}
                onClick={() =>
                  setHidden((prev) => {
                    const n = new Set(prev);
                    n.has(s.label) ? n.delete(s.label) : n.add(s.label);
                    return n;
                  })
                }
                className="inline-flex items-center gap-1.5 text-[11px] px-1.5 py-0.5 rounded transition"
                style={{ opacity: off ? 0.35 : 1, color: "var(--fg-mute)" }}
                title={off ? "Show" : "Hide"}
              >
                <span
                  style={{
                    width: 9, height: 2.5, borderRadius: 2,
                    background: COLORS[i % COLORS.length], display: "inline-block",
                  }}
                />
                {s.label}
              </button>
            );
          })}
        </div>
      )}
      {hover && (
        <div className="text-[10px] mt-0.5" style={{ color: "var(--fg-dim)" }}>
          {xLabel}: {hover.y.toFixed(3)}
        </div>
      )}
    </div>
  );
}
