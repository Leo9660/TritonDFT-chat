"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchJobFiles, fetchJobFileText } from "@/lib/api";
import { useTranslation } from "react-i18next";
import {
  ChevronRightIcon, AlertTriangleIcon, CheckIcon,
  SlidersHorizontalIcon, DatabaseIcon, ListChecksIcon,
} from "lucide-react";
import { PseudoChoice } from "@/lib/types";
import { AtomSpinner } from "./AtomSpinner";

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
  jobId?: string;
}

interface StepCard {
  index: string;          // "3/6"
  title: string;
  exec?: string;          // pw.x · nscf, from the plan
  tool?: string;
  log: string[];          // raw lines belonging to this step
  failed: boolean;
  fixups: number;         // rejected-and-regenerated attempts that then succeeded
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
/* The input validator rejecting a generated file is the system working, not the
 * run failing: the step is regenerated and re-run. Its rejection banner and the
 * ERROR <CODE> line under it must not colour the step red. */
const VALIDATION_RE = /^\[validation\]|^ERROR [A-Z0-9_]+\s*\[|^Restored the .* state/i;

/* Lines that exist for debugging and say nothing a user can act on. */
const DROP_RE = /^\[?(parser|runner)\]?\s*(cmd:|Output \d+: trimmed)|Parameters ready|Script generated|API call snippet|Querying material information|Generating plan for query|Parsed \d+ steps/i;

function parse(content: string) {
  const material: string[] = [];
  const plan: PlanRow[] = [];
  const steps: StepCard[] = [];
  let cur: StepCard | null = null;
  // The backend appends a "> ⏹ Stopped." / "> ⚠️ …" trailer on a terminal run.
  // Without capturing it, a run stopped before the plan arrived parsed to
  // nothing at all and had no way to say why it was empty.
  let notice = "";

  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    const m = line.match(/^\[([\w-]+)\]\s*(.*)$/);
    const tag = m ? m[1].toLowerCase() : "";
    const body = m ? m[2] : line;

    if (DROP_RE.test(body) || DROP_RE.test(line)) continue;

    const n = line.match(/^>\s*([⏹⚠️].*)$/);
    if (n) { notice = n[1].trim(); continue; }

    if (tag === "mp") { material.push(body); continue; }

    if (tag === "plan") {
      const p = body.match(PLAN_RE);
      if (p) {
        // A revised plan is emitted as a fresh block into the same stream, so
        // appending gave the union of every revision — the assistant-mode edit
        // showed 10 steps for a 5-step plan. Each block starts at 1/N, so that
        // is the boundary: seeing step 1 again means a new plan replaces the
        // one before it.
        if (p[1].startsWith("1/") && plan.length > 0) plan.length = 0;
        plan.push({ index: p[1], binary: p[3], problem: p[4].replace(/\s*\[unknown tool\]$/, "") });
      }
      continue;
    }

    const s = body.match(STEP_RE);
    if (s) {
      cur = { index: `${s[1]}/${s[2]}`, title: s[3].trim(), log: [], failed: false, fixups: 0 };
      steps.push(cur);
      continue;
    }

    if (cur) {
      if (VALIDATION_RE.test(body)) {
        if (/^\[validation\]/i.test(body)) cur.fixups += 1;
        cur.log.push(body);
        continue;
      }
      const r = body.match(RUNNING_RE);
      if (r) {
        if (!cur.exec) cur.exec = r[1];
        // A fresh invocation means the step got another attempt, so whatever
        // went wrong before it was recovered from — don't leave the card red.
        cur.failed = false;
      } else if (ERROR_RE.test(body)) {
        cur.failed = true;
      }
      cur.log.push(body);
    }
  }

  // The plan knows each step's binary; prefer it over scraping the runner line.
  steps.forEach((st) => {
    const row = plan.find((p) => p.index === st.index);
    if (row) st.exec = row.binary;
  });

  return { material, plan, steps, notice };
}

/** "pw.x (vc-relax)" -> "vc-relax"; "bands.x" -> "bands.x".
 *  The mode is what distinguishes one pw.x step from another, so it is the
 *  short name; a post-processor has no mode and its binary already reads as one. */
function shortStep(binary: string): string {
  const m = binary.match(/\(([^)]+)\)/);
  return (m ? m[1] : binary).trim();
}

function Card({
  icon, title, subtitle, right, children, tone = "plain", defaultOpen = false, collapsible = true,
}: {
  icon: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode; tone?: "plain" | "accent" | "error"; defaultOpen?: boolean;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // A non-collapsible card has no way to open itself — its header click is a
  // no-op — so gating children on `open` meant they never rendered at all.
  // That silently hid the entire plan list.
  const showChildren = collapsible ? open : true;
  const border =
    tone === "error" ? "rgba(220, 80, 70, 0.35)"
    : tone === "accent" ? "var(--border-strong)"
    : "var(--border)";
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}`, background: "var(--bg-1)" }}>
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        className="w-full flex items-start gap-2 px-3 py-2 text-left"
        style={{ cursor: collapsible ? "pointer" : "default" }}
      >
        {collapsible ? (
          <ChevronRightIcon size={12} className="shrink-0" style={{ marginTop: 3, transform: open ? "rotate(90deg)" : "none", transition: "transform .15s", opacity: 0.55 }} />
        ) : <span className="shrink-0" style={{ width: 12 }} />}
        <span className="shrink-0" style={{ marginTop: 1 }}>{icon}</span>
        {/* Title and its status stack, so a running step's line gets a row of
            its own instead of competing with the binary badge on the right. */}
        <span className="min-w-0" style={{ flex: 1 }}>
          <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--fg)" }}>{title}</span>
          {subtitle}
        </span>
        <span style={{ marginTop: 1, minWidth: 0 }}>{right}</span>
      </button>
      {showChildren && children && <div className="px-3 pb-3">{children}</div>}
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

/* Stand-ins shown between the step's own line. */
const ASIDES = [
  "Consulting Kohn and Sham\u2026",
  "Revisiting Hohenberg and Kohn\u2019s theorem\u2026",
  "Negotiating with the exchange-correlation functional\u2026",
  "Trusting the variational principle\u2026",
  "Keeping an eye on the total energy\u2026",
  "Making peace with the Born\u2013Oppenheimer approximation\u2026",
  "Letting quantum mechanics do the paperwork\u2026",
  "Making sure the wavefunctions behave themselves\u2026",
];

/** The line under a running step. It alternates between what the step is
 *  actually doing and a randomly drawn aside, so the physics stays the thing
 *  being said and the asides do not march in a predictable order.
 *
 *  The first frame is always the step's own line and never random: a random
 *  first render would differ between the server and client markup. */
function BusyLine({ exec }: { exec?: string }) {
  const real = useMemo(() => {
    const hit = BUSY.find(([re]) => re.test(exec || ""));
    return hit ? hit[1] : "Working\u2026";
  }, [exec]);

  const [{ tick, aside }, setState] = useState({ tick: 0, aside: ASIDES[0] });

  useEffect(() => {
    // Long enough to read the sentence twice without it feeling restless;
    // short enough that a multi-minute SCF still visibly changes.
    const id = setInterval(() => {
      setState((s) => {
        // Draw the next aside as we leave the step line, and never draw the one
        // just shown — a repeat reads as the animation having frozen.
        if (s.tick % 2 !== 0) return { ...s, tick: s.tick + 1 };
        const pool = ASIDES.filter((a) => a !== s.aside);
        return { tick: s.tick + 1, aside: pool[Math.floor(Math.random() * pool.length)] };
      });
    }, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      key={tick}
      className="busy-line"
      style={{ display: "block", marginTop: 2, fontSize: 11.5, color: "var(--fg-dim)" }}
    >
      {tick % 2 === 0 ? real : aside}
    </span>
  );
}


/** A step's expandable body: the input Quantum ESPRESSO wrote, and the log it
 *  produced. The input is the artifact a user actually checks to decide whether
 *  to trust a number, so it belongs here next to the output rather than only in
 *  the downloadable bundle.
 *
 *  Fetched lazily on first view of the tab: during a live run the files land on
 *  disk step by step, and requesting them for every step up front would be a
 *  burst of requests for panels nobody opened.
 */
function StepBody({ jobId, index, log }: { jobId?: string; index: string; log: string[] }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"log" | "input">("log");
  const [input, setInput] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "missing">("idle");

  useEffect(() => {
    if (tab !== "input" || input != null || state !== "idle" || !jobId) return;
    setState("loading");
    (async () => {
      // Files are named <zero-padded step>_<task>.in — 03_nscf.in for step 3.
      const n = index.split("/")[0].padStart(2, "0");
      try {
        const files = await fetchJobFiles(jobId);
        const f = files.find((x) => x.name.startsWith(n + "_") && x.name.endsWith(".in"));
        if (!f) { setState("missing"); return; }
        setInput(await fetchJobFileText(jobId, f.name));
        setState("idle");
      } catch {
        setState("missing");
      }
    })();
  }, [tab, input, state, jobId, index]);

  const pre = {
    ...mono, lineHeight: 1.5, color: "var(--fg-mute)", whiteSpace: "pre-wrap" as const,
    background: "var(--bg-0)", border: "1px solid var(--border)",
    borderRadius: 8, padding: "8px 10px", maxHeight: 320, overflowY: "auto" as const,
  };

  const Tab = ({ id, label }: { id: "log" | "input"; label: string }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      style={{
        ...mono, padding: "2px 8px", borderRadius: 6, cursor: "pointer",
        border: "1px solid " + (tab === id ? "var(--border-strong)" : "transparent"),
        background: tab === id ? "var(--bg-2)" : "transparent",
        color: tab === id ? "var(--fg)" : "var(--fg-dim)",
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="flex items-center gap-1 mt-1 mb-1.5">
        <Tab id="log" label={t("tabOutput")} />
        {jobId && <Tab id="input" label={t("tabInput")} />}
      </div>
      {tab === "log" ? (
        <pre className="overflow-x-auto" style={pre}>{log.join("\n") || t("noOutputYet")}</pre>
      ) : (
        <pre className="overflow-x-auto" style={pre}>
          {input ?? (state === "missing" ? t("inputNotWritten") : t("loadingInput"))}
        </pre>
      )}
    </>
  );
}

export function AgentStream({ content, isStreaming, pseudo, model, jobId }: Props) {
  const { t } = useTranslation();
  const { material, plan, steps, notice } = useMemo(() => parse(content), [content]);

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
      {/* 3. The plan: the whole workflow on one line, expandable for the
             per-step descriptions. The descriptions are full sentences and
             stacking five of them pushed everything else off screen, while the
             thing a reader wants at a glance is the shape of the workflow. */}
      {plan.length > 0 && (
        <Card
          icon={<ListChecksIcon size={13} style={{ color: "var(--blue-500)" }} />}
          title={t("planTitle")}
          right={<span style={{ ...mono, color: "var(--fg-dim)" }}>{plan.length} {t("stepsWord")}</span>}
          subtitle={
            /* Its own row. Sharing the header line with the title and the step
               count left the chain fighting for width and colliding with them. */
            <span
              style={{
                ...mono, display: "block", marginTop: 3, color: "var(--fg-mute)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}
            >
              {plan.map((p, i) => (
                <span key={p.index}>
                  {i > 0 && <span style={{ color: "var(--fg-dim)", margin: "0 5px" }}>→</span>}
                  <span style={{ color: "var(--fg-dim)" }}>{i + 1} </span>
                  {shortStep(p.binary)}
                </span>
              ))}
            </span>
          }
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
        const running = !!isStreaming && isLast;
        // A step that hit an error but is STILL RUNNING must not read as
        // failed. The agent recovers from most of them — a rejected input is
        // regenerated, a bad parameter is retried — and showing a red card the
        // moment the word ERROR appears makes a healthy run look broken to
        // anyone watching. Only a step that has stopped AND errored shows it.
        const failed = st.failed && !running;
        return (
          <Card
            key={st.index + i}
            tone={failed ? "error" : "plain"}
            icon={
              running ? <span style={{ color: "var(--green-500)" }}><AtomSpinner size={14} /></span>
              : failed ? <AlertTriangleIcon size={13} style={{ color: "#c0453c" }} />
              : <CheckIcon size={13} style={{ color: "var(--blue-500)" }} />
            }
            title={
              <span>
                <span style={{ ...mono, color: "var(--blue-500)", marginRight: 6 }}>{st.index}</span>
                {st.title}
              </span>
            }
            subtitle={running ? <BusyLine exec={st.exec} /> : undefined}
            right={
              <span className="flex items-center gap-2">
                {st.fixups > 0 && !st.failed && (
                  <span
                    title={t("selfCorrectedHint") as string}
                    style={{ ...mono, fontSize: 10, padding: "1px 5px", borderRadius: 5,
                             color: "var(--fg-dim)", border: "1px solid var(--border)" }}
                  >
                    {t("selfCorrected")} ×{st.fixups}
                  </span>
                )}
                {st.exec && <span style={{ ...mono, color: "var(--fg-mute)" }}>{st.exec}</span>}
              </span>
            }
          >
            <StepBody jobId={jobId} index={st.index} log={st.log} />
          </Card>
        );
      })}

      {/* Before the material lookup resolves there is nothing structured to
        * show, and dumping the raw log here was worse than showing nothing — it
        * is the API snippet and the query echo. Name the phase instead.
        *
        * Gated on isStreaming: a run stopped this early parses to nothing, and
        * an ungated spinner kept turning forever on a job that had already
        * ended. */}
      {steps.length === 0 && plan.length === 0 && isStreaming && (
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ border: "1px solid var(--border)", background: "var(--bg-1)" }}
        >
          <span style={{ color: "var(--blue-500)" }}><AtomSpinner size={14} /></span>
          <span style={{ fontSize: 12, color: "var(--fg-mute)" }}>
            {material.length > 0 ? t("phasePlanning") : t("phaseLookup")}
          </span>
        </div>
      )}

      {/* Why the run ended, when it ended before producing anything. */}
      {!isStreaming && notice && (
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ border: "1px solid var(--border)", background: "var(--bg-1)" }}
        >
          <span style={{ fontSize: 12, color: "var(--fg-mute)" }}>{notice}</span>
        </div>
      )}
    </div>
  );
}
