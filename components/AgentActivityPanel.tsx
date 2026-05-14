"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import { Conversation } from "@/lib/types";

interface Props {
  conversation: Conversation | null;
  isStreaming: boolean;
  onClose?: () => void;
}

interface Step {
  tag: string;
  body: string;
  isError: boolean;
  index: number;
  firstSeenAt: number;
}

const ERROR_TAGS = new Set(["error", "exception", "fatal"]);

function parseSteps(conv: Conversation | null): Step[] {
  if (!conv) return [];
  const last = [...conv.messages].reverse().find((m) => m.role === "assistant");
  if (!last) return [];
  const out: Step[] = [];
  let i = 0;
  for (const line of last.content.split("\n")) {
    const m = line.match(/^\[(\w+)\]\s*(.*)$/);
    if (m) {
      i += 1;
      out.push({
        tag: m[1],
        body: (m[2] || "").trim(),
        isError: ERROR_TAGS.has(m[1].toLowerCase()),
        index: i,
        firstSeenAt: 0,
      });
    }
  }
  return out;
}

function tagColor(tag: string): string {
  const t = tag.toLowerCase();
  if (ERROR_TAGS.has(t)) return "#ef4444";
  if (t === "warn" || t === "warning") return "#fbbf24";
  if (t === "planner") return "#7c9eff";
  if (t === "executor") return "#fbbf24";
  if (t === "analyzer") return "#34d399";
  if (t === "refiner") return "#a78bfa";
  if (t === "dftagent") return "#c9d8ff";
  if (t === "info_query" || t === "info-query") return "#67e8f9";
  return "#9fa5b9";
}

function tagIcon(tag: string, isError: boolean) {
  if (isError) return AlertTriangleIcon;
  const t = tag.toLowerCase();
  if (t === "dftagent") return AtomIcon;
  if (t === "info_query" || t === "info-query") return DatabaseIcon;
  if (t === "planner" || t === "plan") return SparklesIcon;
  if (t === "executor" || t === "solve_sub_problem" || t === "solve") return CpuIcon;
  if (t === "analyzer") return FlaskConicalIcon;
  if (t === "refiner") return SparklesIcon;
  if (t === "run") return PlayIcon;
  return TerminalIcon;
}

function prettyTag(raw: string): string {
  const t = raw.replace(/_/g, " ").replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function firstLine(s: string): string {
  if (!s) return "—";
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
  const steps = useMemo(() => parseSteps(conversation), [conversation]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Reset expanded set when conversation changes
  const convId = conversation?.id;
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

  const seenRef = useRef<Map<string, number>>(new Map());
  const mountedAtRef = useRef<number>(Date.now());
  const lastConvIdRef = useRef<string | undefined>(undefined);

  /* React-idiomatic derived state: reset refs DURING render when convId
   * changes. The previous useEffect-based reset ran AFTER render, so the
   * very first render with the new convId still used the OLD mountedAt
   * value — which made the historical-detection diff blow up to minutes,
   * leaking "+0ms" labels for old conversations. */
  if (lastConvIdRef.current !== convId) {
    lastConvIdRef.current = convId;
    seenRef.current = new Map();
    mountedAtRef.current = Date.now();
  }

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isStreaming) return;
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, [isStreaming]);

  steps.forEach((s) => {
    const k = `${convId}::${s.index}`;
    if (!seenRef.current.has(k)) seenRef.current.set(k, Date.now());
    s.firstSeenAt = seenRef.current.get(k) || 0;
  });

  /* Historical detection: a conversation loaded from localStorage gets all
   * steps stamped within the same render tick. If they're all within 1500ms
   * of the panel mount AND none of them are >300ms apart from each other,
   * it's almost certainly a freshly-hydrated old run — hide fake timings. */
  const minSeen = steps.length ? Math.min(...steps.map((s) => s.firstSeenAt)) : 0;
  const maxSeen = steps.length ? Math.max(...steps.map((s) => s.firstSeenAt)) : 0;
  const isHistorical =
    !isStreaming &&
    steps.length > 0 &&
    (maxSeen - minSeen < 300) &&
    Math.abs(minSeen - mountedAtRef.current) < 1500;

  const t0 = steps[0]?.firstSeenAt || 0;
  const totalElapsedMs = steps.length
    ? (isStreaming ? now : steps[steps.length - 1].firstSeenAt) - t0
    : 0;

  const lastIdx = steps.length - 1;
  const hasError = steps.some((s) => s.isError);
  const errorIdx = steps.findIndex((s) => s.isError);

  let statusText: string;
  let statusColor: string;
  let StatusIcon = CheckIcon as typeof CheckIcon;
  if (isStreaming) {
    statusText = `${t("running")}…`;
    statusColor = "#10b981";
    StatusIcon = Loader2Icon;
  } else if (hasError) {
    statusText = `${t("failed")} ${t("stepN")} ${errorIdx + 1}`;
    statusColor = "#ef4444";
    StatusIcon = AlertTriangleIcon;
  } else if (steps.length > 0) {
    statusText = t("complete");
    statusColor = "#4577ff";
    StatusIcon = CheckIcon;
  } else {
    statusText = t("idle");
    statusColor = "#5b6178";
    StatusIcon = ActivityIcon;
  }

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

      {/* Compact 1-line status pill */}
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
        {!isHistorical && steps.length > 0 && (
          <span className="activity-total-time">{fmtDuration(totalElapsedMs)}</span>
        )}
      </div>

      {/* Tiny progress bar — fills as steps accumulate, errors turn red */}
      {steps.length > 0 && (
        <div className="activity-progress-track">
          <div
            className="activity-progress-fill"
            style={{
              width: isStreaming ? "100%" : "100%",
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

      <div className="activity-steps-wrap">
        {steps.length === 0 ? (
          <div className="activity-empty">
            <ActivityIcon size={26} className="opacity-30 mb-3" />
            <div className="activity-empty-text">{t("noActivityYet")}</div>
          </div>
        ) : (
          <ol className="activity-rows">
            {steps.map((s, i) => {
              const isActive = isStreaming && i === lastIdx && !s.isError;
              const color = tagColor(s.tag);
              const TagIcon = tagIcon(s.tag, s.isError);
              const offsetMs = s.firstSeenAt - t0;
              const stateClass = s.isError
                ? "is-error"
                : isActive
                  ? "is-active"
                  : "is-done";
              const isOpen = expanded.has(s.index) || s.isError; // errors always open
              const hasBody = (s.body || "").trim().length > 0;

              return (
                <li
                  key={`${convId}-${s.index}`}
                  className={`activity-row ${stateClass} ${isOpen ? "is-open" : ""}`}
                  style={
                    {
                      ["--accent" as string]: color,
                    } as React.CSSProperties
                  }
                >
                  <button
                    type="button"
                    onClick={() => hasBody && toggleExpanded(s.index)}
                    className="activity-row-head"
                    aria-expanded={isOpen}
                    title={hasBody ? (isOpen ? "Collapse" : "Expand") : undefined}
                    disabled={!hasBody}
                  >
                    <ChevronRightIcon
                      size={11}
                      className={`activity-row-chev ${isOpen ? "is-open" : ""}`}
                      style={{ opacity: hasBody ? 1 : 0 }}
                    />
                    <TagIcon size={12} className="activity-row-icon" style={{ color }} />
                    <span className="activity-row-tag" style={{ color }}>
                      {prettyTag(s.tag)}
                    </span>
                    {!isOpen && hasBody && (
                      <span className="activity-row-preview">{firstLine(s.body)}</span>
                    )}
                    <span className="activity-row-spacer" />
                    {!isHistorical && (
                      <span className="activity-row-time">
                        {isActive
                          ? <><Loader2Icon size={9} className="spin-slow inline-block mr-1" />{fmtDuration(now - s.firstSeenAt)}</>
                          : i === 0
                            ? `0ms`
                            : `+${fmtDuration(offsetMs)}`}
                      </span>
                    )}
                  </button>
                  {isOpen && hasBody && (
                    <div className="activity-row-text" title={s.body}>
                      {s.body}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </aside>
  );
}
