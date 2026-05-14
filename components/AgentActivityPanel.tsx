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
} from "lucide-react";
import { Conversation } from "@/lib/types";

interface Props {
  conversation: Conversation | null;
  isStreaming: boolean;
  onClose?: () => void;
}

type Tag = string;
interface Step {
  tag: Tag;
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

function tagColor(tag: Tag): string {
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

/** Pick an evocative icon for each agent tag (mirrors legacy DFTAgentBlock). */
function tagIcon(tag: Tag, isError: boolean) {
  if (isError) return AlertTriangleIcon;
  const t = tag.toLowerCase();
  if (t === "dftagent") return AtomIcon;
  if (t === "info_query" || t === "info-query") return DatabaseIcon;
  if (t === "planner") return SparklesIcon;
  if (t === "executor") return CpuIcon;
  if (t === "analyzer") return FlaskConicalIcon;
  if (t === "refiner") return SparklesIcon;
  return TerminalIcon;
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

  /* Track first-seen time per step (per conversation) — used to derive
   * elapsed offsets. For convos restored from localStorage all steps get
   * timestamped at mount; we detect that case and skip the offsets. */
  const seenRef = useRef<Map<string, number>>(new Map());
  const mountedAtRef = useRef<number>(Date.now());
  const convId = conversation?.id;
  useEffect(() => {
    seenRef.current = new Map();
    mountedAtRef.current = Date.now();
  }, [convId]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [isStreaming]);

  steps.forEach((s) => {
    const k = `${convId}::${s.index}`;
    if (!seenRef.current.has(k)) seenRef.current.set(k, Date.now());
    s.firstSeenAt = seenRef.current.get(k) || 0;
  });

  /* "Historical" detection: if the conversation was already done when we
   * mounted the panel (not streaming) AND every step's firstSeenAt is within
   * 800ms of mount, the timestamps are artifacts of a fresh page-load. We hide
   * the elapsed column in that case rather than showing a misleading "now". */
  const isHistorical = !isStreaming && steps.every(
    (s) => Math.abs(s.firstSeenAt - mountedAtRef.current) < 800
  );

  const t0 = steps[0]?.firstSeenAt || 0;
  const totalElapsedMs = steps.length
    ? (isStreaming ? now : steps[steps.length - 1].firstSeenAt) - t0
    : 0;

  const lastIdx = steps.length - 1;
  const hasError = steps.some((s) => s.isError);
  const errorIdx = steps.findIndex((s) => s.isError);

  /* Status banner */
  let statusText: string;
  let statusColor: string;
  let StatusIcon = CheckIcon as typeof CheckIcon;
  if (isStreaming) {
    statusText = t("running");
    statusColor = "#10b981";
    StatusIcon = Loader2Icon;
  } else if (hasError) {
    statusText = `${t("failed")} · ${t("stepN")} ${errorIdx + 1}`;
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
    <aside className="hidden lg:flex w-80 shrink-0 flex-col activity-panel">
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

      {/* Compact status pill */}
      <div className="activity-status-banner" style={{ borderColor: `${statusColor}55` }}>
        <span
          className="activity-status-icon"
          style={{
            color: statusColor,
            background: `${statusColor}1a`,
            border: `1px solid ${statusColor}55`,
          }}
        >
          <StatusIcon size={14} className={isStreaming ? "spin-slow" : ""} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="activity-status-label" style={{ color: statusColor }}>
            {statusText}
          </div>
          <div className="activity-status-sub">
            {steps.length === 0
              ? t("noStepsYet")
              : isHistorical
                ? `${steps.length} ${steps.length === 1 ? t("stepSingular") : t("stepPlural")}`
                : `${steps.length} ${steps.length === 1 ? t("stepSingular") : t("stepPlural")} · ${fmtDuration(totalElapsedMs)}`
            }
          </div>
        </div>
      </div>

      {/* Section label */}
      {steps.length > 0 && (
        <div className="activity-section-label">{t("steps")}</div>
      )}

      {/* Cards */}
      <div className="activity-steps-wrap">
        {steps.length === 0 ? (
          <div className="activity-empty">
            <ActivityIcon size={28} className="opacity-30 mb-3" />
            <div className="activity-empty-text">{t("noActivityYet")}</div>
          </div>
        ) : (
          <ol className="activity-cards">
            {steps.map((s, i) => {
              const isActive = isStreaming && i === lastIdx && !s.isError;
              const isDone = !isActive && !s.isError;
              const color = tagColor(s.tag);
              const TagIcon = tagIcon(s.tag, s.isError);
              const offsetMs = s.firstSeenAt - t0;

              let StatusGlyph = CheckIcon as typeof CheckIcon;
              if (s.isError) StatusGlyph = AlertTriangleIcon;
              else if (isActive) StatusGlyph = Loader2Icon;
              else if (isDone) StatusGlyph = CheckIcon;

              const stateClass = s.isError
                ? "is-error"
                : isActive
                  ? "is-active"
                  : "is-done";

              return (
                <li
                  key={`${convId}-${s.index}`}
                  className={`activity-card ${stateClass}`}
                  style={{ borderColor: s.isError ? "rgba(239, 68, 68, 0.32)" : isActive ? "rgba(69, 119, 255, 0.32)" : "var(--border)" }}
                >
                  {/* Icon block */}
                  <div
                    className="activity-card-icon"
                    style={{
                      color,
                      background: `${color}1a`,
                      border: `1px solid ${color}40`,
                    }}
                  >
                    <TagIcon size={14} strokeWidth={2} />
                  </div>

                  {/* Body */}
                  <div className="activity-card-body">
                    <div className="activity-card-head">
                      <span className="activity-card-tag" style={{ color }}>
                        {s.tag}
                      </span>
                      {!isHistorical && (
                        <span className="activity-card-time">
                          {isActive ? (
                            <Loader2Icon size={10} className="spin-slow inline-block mr-1" />
                          ) : null}
                          {isActive
                            ? `${fmtDuration(now - s.firstSeenAt)}…`
                            : i === 0
                              ? `0ms`
                              : `+${fmtDuration(offsetMs)}`}
                        </span>
                      )}
                    </div>
                    <div className="activity-card-text" title={s.body}>
                      {s.body || "—"}
                    </div>
                    {/* Status row */}
                    <div className="activity-card-status">
                      <StatusGlyph
                        size={10}
                        strokeWidth={2.5}
                        className={isActive ? "spin-slow" : ""}
                        style={{
                          color: s.isError ? "#ef4444" : isActive ? "#7c9eff" : "#10b981",
                        }}
                      />
                      <span
                        style={{
                          color: s.isError ? "#fca5a5" : isActive ? "#7c9eff" : "var(--fg-dim)",
                        }}
                      >
                        {s.isError ? t("statusFailed") : isActive ? t("statusRunning") : t("statusDone")}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </aside>
  );
}
