"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronRightIcon, AlertTriangleIcon, CheckIcon, Loader2Icon,
  SlidersHorizontalIcon, DatabaseIcon, ListChecksIcon,
} from "lucide-react";
import { PseudoChoice } from "@/lib/types";

/**
 * Renders an agent run as a small number of cards instead of a log.
 *
 * The backend prints a lot that is only useful for debugging — parser trimming
 * counts, parameter-blob acknowledgements, raw mpirun invocations. None of that
 * tells a user anything they can act on, so the parser here is an allowlist: it
 * looks for the four things worth showing (settings, the material, the plan, and
 * one card per step) and drops the rest. Anything unrecognised stays available
 * inside the step it belongs to, so nothing is truly lost.
 */

interface Props {
  content: string;
  isStreaming?: boolean;
  pseudo?: PseudoChoice;
  model?: string;
}

interface StepCard {
  index: string;          // "3/6"
  title: string;
  exec?: string;          // pw.x · nscf, from the plan
  tool?: string;
  log: string[];          // raw lines belonging to this step
  failed: boolean;
}

interface PlanRow {
  index: string;
  binary: string;
  problem: string;
}

const PLAN_RE = /^(\d+\/\d+)\s*·\s*(\S+)\s*\(([^)]*)\)\s*[—-]\s*(.*)$/;
const STEP_RE = /^Executing step\s+(\d+)\/(\d+)\s*:\s*(.*)$/i;
const RUNNING_RE = /^Running\s+(\S+\.x)/i;
const ERROR_RE = /\berror\b|\bfailed\b|Traceback|CRASH/i;

/* Lines that exist for debugging and say nothing a user can act on. */
const DROP_RE = /^\[?(parser|runner)\]?\s*(cmd:|Output \d+: trimmed)|Parameters ready|Script generated|API call snippet|Querying material information|Generating plan for query|Parsed \d+ steps/i;

function parse(content: string) {
  const material: string[] = [];
  const plan: PlanRow[] = [];
  const steps: StepCard[] = [];
  let cur: StepCard | null = null;

  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    const m = line.match(/^\[([\w-]+)\]\s*(.*)$/);
    const tag = m ? m[1].toLowerCase() : "";
    const body = m ? m[2] : line;

    if (DROP_RE.test(body) || DROP_RE.test(line)) continue;

    if (tag === "mp") { material.push(body); continue; }

    if (tag === "plan") {
      const p = body.match(PLAN_RE);
      if (p) plan.push({ index: p[1], binary: p[3], problem: p[4].replace(/\s*\[unknown tool\]$/, "") });
      continue;
    }

    const s = body.match(STEP_RE);
    if (s) {
      cur = { index: `${s[1]}/${s[2]}`, title: s[3].trim(), log: [], failed: false };
      steps.push(cur);
      continue;
    }

    if (cur) {
      const r = body.match(RUNNING_RE);
      if (r && !cur.exec) cur.exec = r[1];
      if (ERROR_RE.test(body)) cur.failed = true;
      cur.log.push(body);
    }
  }

  // The plan knows each step's binary; prefer it over scraping the runner line.
  steps.forEach((st) => {
    const row = plan.find((p) => p.index === st.index);
    if (row) st.exec = row.binary;
  });

  return { material, plan, steps };
}

function Card({
  icon, title, right, children, tone = "plain", defaultOpen = false, collapsible = true,
}: {
  icon: React.ReactNode; title: React.ReactNode; right?: React.ReactNode;
  children?: React.ReactNode; tone?: "plain" | "accent" | "error"; defaultOpen?: boolean;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const border =
    tone === "error" ? "rgba(220, 80, 70, 0.35)"
    : tone === "accent" ? "var(--border-strong)"
    : "var(--border)";
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}`, background: "var(--bg-1)" }}>
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
        style={{ cursor: collapsible ? "pointer" : "default" }}
      >
        {collapsible ? (
          <ChevronRightIcon size={12} style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s", opacity: 0.55 }} />
        ) : <span style={{ width: 12 }} />}
        {icon}
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg)" }}>{title}</span>
        <span style={{ flex: 1 }} />
        {right}
      </button>
      {open && children && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

const mono = { fontFamily: "var(--font-mono)", fontSize: 11 } as const;

/* What the step is actually doing, in words. Shown while it runs instead of a
 * bare "computing…", so the wait also explains the physics. Keyed off the QE
 * binary and mode, which the plan already gives us. */
const BUSY: [RegExp, string][] = [
  [/vc-relax/i,   "Letting the cell settle into its equilibrium shape…"],
  [/pw\.x.*relax/i, "Letting the atoms find their positions…"],
  // nscf must be tested before scf — "nscf" contains "scf".
  [/nscf/i,       "Counting occupied states…"],
  [/\bscf/i,      "Waiting for the electrons to agree with themselves…"],
  [/pw\.x.*bands/i, "Travelling the high-symmetry path across the Brillouin zone…"],
  [/bands\.x/i,   "Turning eigenvalues into a band structure…"],
  [/dos\.x/i,     "Tallying the density of states…"],
  [/projwfc/i,    "Sorting states by orbital character…"],
  [/ph\.x/i,      "Nudging the atoms to hear how the lattice answers…"],
  [/q2r/i,        "Fourier-transforming into real-space force constants…"],
  [/matdyn/i,     "Interpolating phonons along the q-path…"],
  [/dynmat/i,     "Reading off the Γ-point modes…"],
  [/ev\.x/i,      "Fitting the equation of state…"],
];

/* Occasional stand-ins, so a long run is not the same sentence forever. */
const ASIDES = [
  "Consulting Kohn and Sham…",
  "Negotiating with the exchange-correlation functional…",
  "Asking Bloch to confirm the periodicity…",
];

/** Deterministic in the step index: it must not reshuffle on every re-render,
 *  and a random pick would also differ between server and client markup. */
function busyLine(exec: string | undefined, stepIndex: number): string {
  if (stepIndex > 0 && stepIndex % 4 === 3) return ASIDES[(stepIndex / 4) | 0 % ASIDES.length];
  const hit = BUSY.find(([re]) => re.test(exec || ""));
  return hit ? hit[1] : "Working…";
}

export function AgentStream({ content, isStreaming, pseudo, model }: Props) {
  const { t } = useTranslation();
  const { material, plan, steps } = useMemo(() => parse(content), [content]);

  return (
    <div className="flex flex-col gap-2">
      {/* 1. What this run was configured with — first, before anything happens. */}
      {(pseudo || model) && (
        <Card
          collapsible={false}
          icon={<SlidersHorizontalIcon size={13} style={{ color: "var(--blue-500)" }} />}
          title={t("runSettings")}
          right={
            <span style={{ ...mono, color: "var(--fg-mute)" }}>
              {model}
              {pseudo ? ` · ${pseudo.xc} · ${pseudo.relativistic} · ${pseudo.accuracy}` : ""}
            </span>
          }
        />
      )}

      {/* 2. The material, as one card once the lookup has resolved. */}
      {material.length > 0 && (
        <Card
          collapsible={material.length > 1}
          icon={<DatabaseIcon size={13} style={{ color: "var(--blue-500)" }} />}
          title={t("material")}
          right={<span style={{ ...mono, color: "var(--fg-mute)" }}>{material[0]}</span>}
        >
          <div className="mt-1" style={{ ...mono, color: "var(--fg-mute)", lineHeight: 1.6 }}>
            {material.slice(1).map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </Card>
      )}
      {/* 3. The plan. */}
      {plan.length > 0 && (
        <Card
          collapsible={false}
          icon={<ListChecksIcon size={13} style={{ color: "var(--blue-500)" }} />}
          title={t("planTitle")}
          right={<span style={{ ...mono, color: "var(--fg-dim)" }}>{plan.length} {t("stepsWord")}</span>}
        >
          <ol className="flex flex-col gap-1 mt-1">
            {plan.map((p) => (
              <li key={p.index} className="flex items-baseline gap-2" style={{ fontSize: 12 }}>
                <span style={{ ...mono, color: "var(--blue-500)" }}>{p.index}</span>
                <span style={{ ...mono, color: "var(--fg-mute)", whiteSpace: "nowrap" }}>{p.binary}</span>
                <span style={{ color: "var(--fg-mute)" }}>{p.problem}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* 4. One card per step; the log lives inside it. */}
      {steps.map((st, i) => {
        const isLast = i === steps.length - 1;
        const running = !!isStreaming && isLast && !st.failed;
        return (
          <Card
            key={st.index + i}
            tone={st.failed ? "error" : "plain"}
            icon={
              st.failed ? <AlertTriangleIcon size={13} style={{ color: "#c0453c" }} />
              : running ? <Loader2Icon size={13} className="spin-slow" style={{ color: "var(--green-500)" }} />
              : <CheckIcon size={13} style={{ color: "var(--blue-500)" }} />
            }
            title={
              <span>
                <span style={{ ...mono, color: "var(--blue-500)", marginRight: 6 }}>{st.index}</span>
                {st.title}
              </span>
            }
            right={
              <span className="flex items-center gap-2">
                {st.exec && <span style={{ ...mono, color: "var(--fg-mute)" }}>{st.exec}</span>}
                {running && (
                  <span style={{ fontSize: 11, color: "var(--fg-dim)" }}>{busyLine(st.exec, i)}</span>
                )}
              </span>
            }
          >
            <pre
              className="mt-1 overflow-x-auto"
              style={{
                ...mono, lineHeight: 1.5, color: "var(--fg-mute)", whiteSpace: "pre-wrap",
                background: "var(--bg-0)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "8px 10px", maxHeight: 320, overflowY: "auto",
              }}
            >
              {st.log.join("\n") || t("noOutputYet")}
            </pre>
          </Card>
        );
      })}

      {steps.length === 0 && plan.length === 0 && (
        /* Before the material lookup resolves there is nothing structured to
         * show, and dumping the raw log here was worse than showing nothing —
         * it is the API snippet and the query echo, which say nothing useful.
         * Name the phase instead. */
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ border: "1px solid var(--border)", background: "var(--bg-1)" }}
        >
          <Loader2Icon size={13} className="spin-slow" style={{ color: "var(--blue-500)" }} />
          <span style={{ fontSize: 12, color: "var(--fg-mute)" }}>
            {material.length > 0 ? t("phasePlanning") : t("phaseLookup")}
          </span>
        </div>
      )}
    </div>
  );
}
