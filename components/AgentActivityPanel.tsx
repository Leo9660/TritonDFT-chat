"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangleIcon,
  ActivityIcon,
  XIcon,
  CheckIcon,
  Loader2Icon,
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
  index: number; // 1-based
  firstSeenAt: number; // ms timestamp
}

const ERROR_TAGS = new Set(["error", "exception", "fatal"]);

/** Parse [Tag] steps from the LAST assistant message. */
function parseSteps(conv: Conversation | null): Step[] {
  if (!conv) return [];
  const lastAssistant = [...conv.messages].reverse().find((m) => m.role === "assistant");
  if (!lastAssistant) return [];
  const lines = lastAssistant.content.split("\n");
  const out: Step[] = [];
  let i = 0;
  for (const line of lines) {
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
  if (t === "system") return "#9fa5b9";
  return "#9fa5b9";
}

function relTime(ts: number, now: number, locale: string): string {
  if (!ts) return "—";
  const d = Math.max(0, Math.floor((now - ts) / 1000));
  if (locale === "zh") {
    if (d < 2) return "刚刚";
    if (d < 60) return `${d}秒前`;
    if (d < 3600) return `${Math.floor(d / 60)}分前`;
    return `${Math.floor(d / 3600)}时前`;
  }
  if (d < 2) return "now";
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
}

export function AgentActivityPanel({ conversation, isStreaming, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const rawSteps = useMemo(() => parseSteps(conversation), [conversation]);

  // Track when each step first appeared (client-side timestamp).
  const seenRef = useRef<Map<string, number>>(new Map());
  const conversationId = conversation?.id;
  // Reset memory when switching to a different conversation.
  useEffect(() => {
    seenRef.current = new Map();
  }, [conversationId]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isStreaming]);

  // Stamp newly-discovered steps.
  rawSteps.forEach((s) => {
    const key = `${conversationId}::${s.index}::${s.tag}`;
    if (!seenRef.current.has(key)) {
      seenRef.current.set(key, Date.now());
    }
    s.firstSeenAt = seenRef.current.get(key) || 0;
  });

  const steps = rawSteps;
  const lastIdx = steps.length - 1;
  const hasError = steps.some((s) => s.isError);
  const errorIdx = steps.findIndex((s) => s.isError);

  let statusText: string;
  let statusColor: string;
  let StatusIcon: typeof CheckIcon = CheckIcon;
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

      {/* Status banner */}
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
              : `${steps.length} ${steps.length === 1 ? t("stepSingular") : t("stepPlural")}`}
          </div>
        </div>
      </div>

      {/* Steps timeline */}
      <div className="activity-steps-wrap">
        {steps.length === 0 ? (
          <div className="activity-empty">
            <ActivityIcon size={28} className="opacity-30 mb-3" />
            <div className="activity-empty-text">{t("noActivityYet")}</div>
          </div>
        ) : (
          <ol className="activity-steps">
            {steps.map((s, i) => {
              const isActive = isStreaming && i === lastIdx && !s.isError;
              const color = tagColor(s.tag);
              return (
                <li
                  key={`${s.index}-${s.tag}`}
                  className={`activity-step ${s.isError ? "is-error" : ""} ${isActive ? "is-active" : ""}`}
                >
                  <div className="activity-step-rail">
                    <span
                      className="activity-step-num"
                      style={{ color: "var(--fg-dim)" }}
                    >
                      {String(s.index).padStart(2, "0")}
                    </span>
                    <span
                      className="activity-step-dot"
                      style={{
                        background: color,
                        boxShadow: isActive
                          ? `0 0 0 5px ${color}33, 0 0 14px ${color}aa`
                          : `0 0 0 3px ${color}1f`,
                      }}
                      aria-hidden="true"
                    >
                      {s.isError && <AlertTriangleIcon size={10} color="#fff" strokeWidth={2.5} />}
                    </span>
                    {i < steps.length - 1 && (
                      <span
                        className="activity-step-line"
                        style={{
                          background: `linear-gradient(to bottom, ${color}88, ${tagColor(steps[i + 1].tag)}88)`,
                        }}
                      />
                    )}
                  </div>
                  <div className="activity-step-body">
                    <div
                      className="activity-step-tag"
                      style={{ color }}
                    >
                      {s.tag}
                    </div>
                    <div className="activity-step-text" title={s.body}>
                      {s.body || "—"}
                    </div>
                    <div className="activity-step-time">
                      {isActive ? (
                        <span className="activity-step-time-running" style={{ color }}>
                          {t("inProgress")}…
                        </span>
                      ) : (
                        relTime(s.firstSeenAt, now, i18n.language)
                      )}
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
