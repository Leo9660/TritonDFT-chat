"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangleIcon,
  ActivityIcon,
  XIcon,
  CheckIcon,
  Loader2Icon,
  AtomIcon,
  DatabaseIcon,
  CpuIcon,
  FlaskConicalIcon,
  TerminalIcon,
  SparklesIcon,
  ChevronRightIcon,
  PlayIcon,
  ListChecksIcon,
} from "lucide-react";
import { Conversation } from "@/lib/types";

interface Props {
  conversation: Conversation | null;
  isStreaming: boolean;
  onClose?: () => void;
}

const ERROR_TAGS = new Set(["error", "exception", "fatal"]);

/* The agent prints its [tag] markers WITHOUT reliable newlines between them, so
 * they show up concatenated mid-line (e.g. "Parsed 1 steps.[run] Executing…").
 * We scan for these markers anywhere in the text — restricted to known tags so
 * we don't split on JSON brackets or "[0]" inside output. */
const KNOWN_TAGS = new Set([
  "dftagent", "info_query", "mp", "plan", "run", "solve_sub_problem", "runner",
  "parser", "eval", "benchmark", "executor", "analyzer", "refiner", "system",
  "auto_parallel", "slurm", "error", "exception", "fatal", "warning",
]);
const TAG_RE = /\[([A-Za-z][A-Za-z_]+)\]/g;

/* ─── raw [tag] body line, parsed in order ─── */
interface RawStep {
  tag: string;
  body: string;
  isError: boolean;
  rawIndex: number;     // 1-based, global across the whole conversation
  firstSeenAt: number;  // wall-clock, filled in during render
}

/* ─── phase = one high-level "block" of the activity ─── */
type PhaseKind = "setup" | "plan" | "step";

interface Phase {
  runIndex: number;
  phaseIndex: number;  // unique across all phases — used as key + expansion id
  kind: PhaseKind;
  title: string;       // distilled short label shown in the row ("SCF", "NSCF bands")
  fullTitle: string;   // original LLM description, used as the hover tooltip
  subtitle?: string;
  steps: RawStep[];
  hasError: boolean;
  isRunStart: boolean;
}

/* Distill a long LLM-written sub-problem description into a short, one-word-ish
 * label so it never has to truncate or wrap in the narrow activity panel.
 * The full text stays available as a hover tooltip. */
function distillTitle(fullDesc: string, kind: PhaseKind): string {
  if (kind !== "step") return fullDesc;
  const d = fullDesc.toLowerCase();
  /* Order matters — most specific first. */
  if (/\bvc[\s-]?relax\b/.test(d)) return "VC-relax";
  if (/\bnscf\b.*\bband\s*(structure|gap|s)\b/.test(d) || /\bband\s*(structure|gap)\b.*\bnscf\b/.test(d)) return "NSCF bands";
  if (/\bband\s*gap\b/.test(d)) return "Band gap";
  if (/\bband\s*structure\b/.test(d)) return "Band structure";
  if (/\bbands?\b/.test(d) && /\bnscf\b/.test(d)) return "NSCF bands";
  if (/\bbands?\b/.test(d)) return "Bands";
  if (/\bnscf\b/.test(d)) return "NSCF";
  if (/\bscf\b/.test(d)) return "SCF";
  if (/\bdos\b/.test(d)) return "DOS";
  if (/\bphonon/.test(d)) return "Phonon";
  if (/\brelax/.test(d)) return "Relax";
  /* Fallback: drop verb prefixes ("Perform a ", "Conduct an "), keep first 3 words. */
  const stripped = fullDesc
    .replace(/^(perform|conduct|run|execute|do|carry out|compute|calculate)(\s+(a|an|the))?\s+/i, "")
    .trim();
  const words = stripped.split(/\s+/);
  return words.slice(0, 3).join(" ");
}

/* Parse all assistant messages into raw [tag] body lines, in order, with
 * a stable global rawIndex so per-step timestamps can be memoised. */
function parseRawSteps(conv: Conversation | null): { steps: RawStep[]; runOf: Map<number, number> } {
  const runOf = new Map<number, number>();
  if (!conv) return { steps: [], runOf };
  const out: RawStep[] = [];
  let rawIndex = 0;
  conv.messages.forEach((m) => {
    if (m.role !== "assistant") return;
  });
  const assistants = conv.messages.filter((m) => m.role === "assistant");
  assistants.forEach((msg, ai) => {
    const runIndex = ai + 1;
    const content = msg.content;
    // Find every known [tag] marker anywhere in the text, then take each step's
    // body as the slice from after its marker up to the next marker.
    const marks: { tag: string; at: number; after: number }[] = [];
    TAG_RE.lastIndex = 0;
    let mm: RegExpExecArray | null;
    while ((mm = TAG_RE.exec(content)) !== null) {
      if (KNOWN_TAGS.has(mm[1].toLowerCase())) {
        marks.push({ tag: mm[1], at: mm.index, after: TAG_RE.lastIndex });
      }
    }
    for (let i = 0; i < marks.length; i++) {
      const end = i + 1 < marks.length ? marks[i + 1].at : content.length;
      rawIndex += 1;
      runOf.set(rawIndex, runIndex);
      out.push({
        tag: marks[i].tag,
        body: content.slice(marks[i].after, end).trim(),
        isError: ERROR_TAGS.has(marks[i].tag.toLowerCase()),
        rawIndex,
        firstSeenAt: 0,
      });
    }
  });
  return { steps: out, runOf };
}

/* Group raw steps into high-level phases. Boundaries:
 *   - lines before any [plan]      → "Setup"
 *   - [plan] lines                 → "Plan"
 *   - [run] Executing step N/M: X  → new "Step N/M — X" phase, includes all
 *                                    following [solve_sub_problem]/[runner]/
 *                                    [parser] lines until the next [run]
 *                                    Executing
 * Errors anywhere bubble up to the phase. */
function groupIntoPhases(rawSteps: RawStep[], runOf: Map<number, number>): Phase[] {
  const phases: Phase[] = [];
  let phaseCounter = 0;
  const setupByRun: Map<number, Phase> = new Map();
  const planByRun: Map<number, Phase> = new Map();
  const currentByRun: Map<number, Phase> = new Map();
  const firstSeenInRun: Set<number> = new Set();

  const open = (
    runIndex: number,
    fields: Pick<Phase, "kind" | "title" | "fullTitle" | "subtitle" | "steps" | "hasError">,
  ): Phase => {
    phaseCounter += 1;
    const isRunStart = !firstSeenInRun.has(runIndex);
    firstSeenInRun.add(runIndex);
    const phase: Phase = {
      runIndex,
      phaseIndex: phaseCounter,
      isRunStart,
      ...fields,
    };
    phases.push(phase);
    return phase;
  };

  for (const step of rawSteps) {
    const runIndex = runOf.get(step.rawIndex) ?? 1;
    const lt = step.tag.toLowerCase();

    /* New "step" phase boundary: [run] Executing step N/M: desc */
    if (lt === "run") {
      const m = step.body.match(/Executing step\s+(\d+)\/(\d+)\s*:\s*(.*)/i);
      if (m) {
        const rawDesc = m[3].trim() || `Step ${m[1]}/${m[2]}`;
        const phase = open(runIndex, {
          kind: "step",
          title: distillTitle(rawDesc, "step"),
          fullTitle: rawDesc,
          subtitle: `${m[1]}/${m[2]}`,
          steps: [step],
          hasError: step.isError,
        });
        currentByRun.set(runIndex, phase);
        continue;
      }
    }

    /* Plan phase: aggregate all [plan] lines in the same run. */
    if (lt === "plan") {
      let phase = planByRun.get(runIndex);
      if (!phase) {
        phase = open(runIndex, {
          kind: "plan",
          title: "Plan",
          fullTitle: "Plan",
          subtitle: undefined,
          steps: [step],
          hasError: step.isError,
        });
        planByRun.set(runIndex, phase);
        currentByRun.set(runIndex, phase);
      } else {
        phase.steps.push(step);
        if (step.isError) phase.hasError = true;
      }
      /* Pull "N steps" out of "[plan] Parsed N steps." for subtitle. */
      const parsedMatch = step.body.match(/Parsed\s+(\d+)\s+steps?/i);
      if (parsedMatch) phase.subtitle = `${parsedMatch[1]} steps`;
      continue;
    }

    /* Default: append to currentByRun, or open a Setup phase. */
    const current = currentByRun.get(runIndex);
    if (current) {
      current.steps.push(step);
      if (step.isError) current.hasError = true;
    } else {
      let setup = setupByRun.get(runIndex);
      if (!setup) {
        setup = open(runIndex, {
          kind: "setup",
          title: "Setup",
          fullTitle: "Setup",
          subtitle: undefined,
          steps: [step],
          hasError: step.isError,
        });
        setupByRun.set(runIndex, setup);
        currentByRun.set(runIndex, setup);
      } else {
        setup.steps.push(step);
        if (step.isError) setup.hasError = true;
      }
    }
  }
  return phases;
}

function phaseIcon(p: Phase) {
  if (p.hasError) return AlertTriangleIcon;
  switch (p.kind) {
    case "plan": return SparklesIcon;
    case "step": return CpuIcon;
    case "setup": return DatabaseIcon;
  }
}

function tagColor(tag: string, isError: boolean): string {
  if (isError) return "#ef4444";
  const t = tag.toLowerCase();
  if (t === "warn" || t === "warning") return "#fbbf24";
  if (t === "planner" || t === "plan") return "#7c9eff";
  if (t === "executor") return "#fbbf24";
  if (t === "analyzer") return "#34d399";
  if (t === "refiner") return "#a78bfa";
  if (t === "dftagent") return "#c9d8ff";
  if (t === "info_query" || t === "info-query" || t === "mp") return "#67e8f9";
  if (t === "runner") return "#fbbf24";
  if (t === "parser") return "#34d399";
  if (t === "solve_sub_problem") return "#a78bfa";
  if (t === "run") return "#7c9eff";
  return "#9fa5b9";
}

function tagIcon(tag: string, isError: boolean) {
  if (isError) return AlertTriangleIcon;
  const t = tag.toLowerCase();
  if (t === "dftagent") return AtomIcon;
  if (t === "info_query" || t === "info-query" || t === "mp") return DatabaseIcon;
  if (t === "planner" || t === "plan") return SparklesIcon;
  if (t === "executor" || t === "solve_sub_problem" || t === "solve") return CpuIcon;
  if (t === "analyzer") return FlaskConicalIcon;
  if (t === "refiner") return SparklesIcon;
  if (t === "run") return PlayIcon;
  if (t === "runner") return TerminalIcon;
  if (t === "parser") return ListChecksIcon;
  return TerminalIcon;
}

function firstLine(s: string): string {
  if (!s) return "";
  const line = s.split("\n").find((l) => l.trim().length > 0) || s;
  return line.trim();
}

function fmtDuration(ms: number): string {
  if (ms < 0) ms = 0;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function AgentActivityPanel({ conversation, isStreaming, onClose }: Props) {
  const { t } = useTranslation();
  const { steps: rawSteps, runOf } = useMemo(() => parseRawSteps(conversation), [conversation]);

  const convId = conversation?.id;

  /* Per-rawStep timestamps (memoised by `${convId}::${rawIndex}`). */
  const seenRef = useRef<Map<string, number>>(new Map());
  const mountedAtRef = useRef<number>(Date.now());
  const lastConvIdRef = useRef<string | undefined>(undefined);
  if (lastConvIdRef.current !== convId) {
    lastConvIdRef.current = convId;
    seenRef.current = new Map();
    mountedAtRef.current = Date.now();
  }
  rawSteps.forEach((s) => {
    const k = `${convId}::${s.rawIndex}`;
    if (!seenRef.current.has(k)) seenRef.current.set(k, Date.now());
    s.firstSeenAt = seenRef.current.get(k) || 0;
  });

  /* Now that timestamps are stable, group into phases. */
  const phases = useMemo(() => groupIntoPhases(rawSteps, runOf), [rawSteps, runOf]);

  /* Historical detection identical to before — based on raw step spread. */
  const minSeen = rawSteps.length ? Math.min(...rawSteps.map((s) => s.firstSeenAt)) : 0;
  const maxSeen = rawSteps.length ? Math.max(...rawSteps.map((s) => s.firstSeenAt)) : 0;
  const isHistorical =
    !isStreaming &&
    rawSteps.length > 0 &&
    (maxSeen - minSeen < 300) &&
    Math.abs(minSeen - mountedAtRef.current) < 1500;

  /* Ticking clock for live "running" durations. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isStreaming) return;
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, [isStreaming]);

  /* Expansion state — by phase.phaseIndex. */
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const lastConvForExpandRef = useRef<string | undefined>(undefined);
  if (lastConvForExpandRef.current !== convId) {
    lastConvForExpandRef.current = convId;
    if (expanded.size > 0) setExpanded(new Set());
  }
  const toggleExpanded = (idx: number) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  /* Auto-scroll: stick to bottom unless the user has scrolled away. */
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<boolean>(true);
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    stickRef.current = atBottom;
  };
  const totalSubsteps = rawSteps.length;
  useEffect(() => {
    if (!stickRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [totalSubsteps, isStreaming]);

  /* Latest run for status pill + total elapsed. */
  const latestRunIndex = phases.length ? phases[phases.length - 1].runIndex : 0;
  const phasesInLatest = phases.filter((p) => p.runIndex === latestRunIndex);
  const latestStepsInRun = phasesInLatest.flatMap((p) => p.steps);
  const latestT0 = latestStepsInRun[0]?.firstSeenAt ?? 0;
  const latestLast = latestStepsInRun[latestStepsInRun.length - 1]?.firstSeenAt ?? 0;
  const totalElapsedMs = latestStepsInRun.length
    ? (isStreaming ? now : latestLast) - latestT0
    : 0;
  const hasError = phasesInLatest.some((p) => p.hasError);
  const erroredPhaseIdx = phasesInLatest.findIndex((p) => p.hasError);

  let statusText: string;
  let statusColor: string;
  let StatusIcon = CheckIcon as typeof CheckIcon;
  if (isStreaming) {
    statusText = `${t("running")}…`;
    statusColor = "#10b981";
    StatusIcon = Loader2Icon;
  } else if (hasError) {
    statusText = `${t("failed")} ${t("stepN")} ${erroredPhaseIdx + 1}`;
    statusColor = "#ef4444";
    StatusIcon = AlertTriangleIcon;
  } else if (phases.length > 0) {
    statusText = t("complete");
    statusColor = "#4577ff";
    StatusIcon = CheckIcon;
  } else {
    statusText = t("idle");
    statusColor = "#5b6178";
    StatusIcon = ActivityIcon;
  }

  const lastPhaseIndex = phases[phases.length - 1]?.phaseIndex;

  return (
    <aside className="flex w-full shrink-0 flex-col activity-panel">
      <header className="activity-header">
        <div className="flex items-center gap-2">
          <ActivityIcon size={14} className="activity-header-icon" />
          <span className="activity-header-title">{t("activity")}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="activity-close-btn"
            title={t("hidePanel")}
            aria-label={t("hidePanel")}
          >
            <XIcon size={14} />
          </button>
        )}
      </header>

      <div className="activity-status-row">
        <span
          className="activity-status-pill"
          style={{
            color: statusColor,
            background: `${statusColor}10`,
            border: `1px solid ${statusColor}40`,
          }}
        >
          <StatusIcon size={11} className={isStreaming ? "spin-slow" : ""} />
          {statusText}
        </span>
        {!isHistorical && phases.length > 0 && (
          <span className="activity-total-time">{fmtDuration(totalElapsedMs)}</span>
        )}
      </div>

      {phases.length > 0 && (
        <div className="activity-progress-track">
          <div
            className="activity-progress-fill"
            style={{
              width: "100%",
              background: hasError
                ? "linear-gradient(90deg, #4577ff 0%, #ef4444 100%)"
                : isStreaming
                  ? "linear-gradient(90deg, #4577ff 0%, rgba(69,119,255,0.3) 100%)"
                  : "#4577ff",
              opacity: isStreaming ? 0.7 : 1,
            }}
          />
        </div>
      )}

      <div className="activity-steps-wrap" ref={scrollRef} onScroll={onScroll}>
        {phases.length === 0 ? (
          <div className="activity-empty">
            <ActivityIcon size={26} className="opacity-30 mb-3" />
            <div className="activity-empty-text">{t("noActivityYet")}</div>
          </div>
        ) : (
          <ol className="activity-phases">
            {phases.map((p) => {
              const isLastInLatest = isStreaming && p.phaseIndex === lastPhaseIndex && !p.hasError;
              const stateClass = p.hasError ? "is-error" : isLastInLatest ? "is-active" : "is-done";
              const isOpen = expanded.has(p.phaseIndex) || p.hasError;
              const PhaseIcon = phaseIcon(p);
              const startedAt = p.steps[0]?.firstSeenAt ?? 0;
              const endedAt = p.steps[p.steps.length - 1]?.firstSeenAt ?? 0;
              const phaseElapsedMs = isLastInLatest ? now - startedAt : endedAt - startedAt;
              const showRunDivider = p.isRunStart && p.runIndex > 1;

              return (
                <Fragment key={`${convId}-${p.phaseIndex}`}>
                  {showRunDivider && (
                    <li className="activity-run-divider" aria-hidden="true">
                      <span className="activity-run-divider-label">
                        {t("runN", { n: p.runIndex, defaultValue: `Run ${p.runIndex}` })}
                      </span>
                    </li>
                  )}
                  <li className={`activity-phase ${stateClass} ${isOpen ? "is-open" : ""}`}>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(p.phaseIndex)}
                      className="activity-phase-head"
                      aria-expanded={isOpen}
                    >
                      <ChevronRightIcon
                        size={11}
                        className={`activity-phase-chev ${isOpen ? "is-open" : ""}`}
                      />
                      <span className="activity-phase-status-icon">
                        {p.hasError ? (
                          <AlertTriangleIcon size={13} style={{ color: "#ef4444" }} />
                        ) : isLastInLatest ? (
                          <Loader2Icon size={13} className="spin-slow" style={{ color: "#10b981" }} />
                        ) : (
                          <CheckIcon size={13} style={{ color: "#4577ff" }} />
                        )}
                      </span>
                      <PhaseIcon size={13} className="activity-phase-icon" />
                      <div className="activity-phase-body">
                        <div className="activity-phase-line1">
                          {p.subtitle && (
                            <span className="activity-phase-subtitle">{p.subtitle}</span>
                          )}
                          <span className="activity-phase-title" title={p.fullTitle}>
                            {p.title}
                          </span>
                          {!isHistorical && (
                            <span className="activity-phase-time">
                              {fmtDuration(phaseElapsedMs)}
                            </span>
                          )}
                        </div>
                        {!isOpen && (() => {
                          /* Latest meaningful sub-step preview — skip the
                           * [run] step boundary itself (it just repeats the
                           * phase title) and any empty-body lines. */
                          const cand = [...p.steps].reverse().find(
                            (s) => firstLine(s.body).length > 0 && s.tag.toLowerCase() !== "run",
                          );
                          if (!cand) return null;
                          const color = tagColor(cand.tag, cand.isError);
                          return (
                            <div className="activity-phase-preview" title={cand.body}>
                              <span className="activity-phase-preview-tag" style={{ color }}>
                                {cand.tag}
                              </span>
                              <span className="activity-phase-preview-text">
                                {firstLine(cand.body)}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </button>
                    {isOpen && (
                      <ul className="activity-substeps">
                        {p.steps.map((s) => {
                          const offsetMs = s.firstSeenAt - startedAt;
                          const TagIcon = tagIcon(s.tag, s.isError);
                          const color = tagColor(s.tag, s.isError);
                          const preview = firstLine(s.body);
                          return (
                            <li
                              key={s.rawIndex}
                              className={`activity-substep ${s.isError ? "is-error" : ""}`}
                              style={{ ["--accent" as string]: color } as React.CSSProperties}
                            >
                              <TagIcon size={10} className="activity-substep-icon" style={{ color }} />
                              <span className="activity-substep-tag" style={{ color }}>
                                {s.tag}
                              </span>
                              {preview && (
                                <span
                                  className="activity-substep-preview"
                                  title={s.body}
                                >
                                  {preview}
                                </span>
                              )}
                              <span className="activity-substep-spacer" />
                              {!isHistorical && (
                                <span className="activity-substep-time">
                                  +{fmtDuration(offsetMs)}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ol>
        )}
      </div>
    </aside>
  );
}
