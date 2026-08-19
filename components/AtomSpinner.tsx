"use client";

/**
 * Loading indicator: a Bohr-style atom, drawn inline so it inherits the current
 * colour and needs no asset.
 *
 * The shell rotates as a whole while an electron travels each orbit at its own
 * period — three equal speeds would read as one rigid object turning, which
 * looks mechanical rather than orbital.
 */
export function AtomSpinner({ size = 14, className = "" }: { size?: number; className?: string }) {
  const r = 9;         // orbit semi-major axis, in the 0 0 24 24 viewBox
  const ry = 3.6;      // semi-minor — a flatter ellipse reads as a tilted circle
  return (
    <span
      className={className}
      style={{ display: "inline-flex", width: size, height: size, color: "inherit" }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
        <g className="atom-shell">
          {[0, 60, 120].map((deg, i) => (
            <g key={deg} transform={`rotate(${deg} 12 12)`}>
              <ellipse
                cx="12" cy="12" rx={r} ry={ry}
                stroke="currentColor" strokeOpacity={0.42} strokeWidth="1.1"
              />
              <circle r="1.35" fill="currentColor">
                <animateMotion
                  dur={`${1.6 + i * 0.35}s`}
                  repeatCount="indefinite"
                  path={`M ${12 + r},12 A ${r},${ry} 0 1,1 ${12 - r},12 A ${r},${ry} 0 1,1 ${12 + r},12`}
                />
              </circle>
            </g>
          ))}
        </g>
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    </span>
  );
}
