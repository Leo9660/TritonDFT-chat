"use client";

import { useMemo } from "react";
import { RotateCwIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AgentStream } from "./AgentStream";

interface Props {
  content: string;
  isStreaming: boolean;
  onRetry?: () => void;
}

/**
 * Terminal-style frame around an assistant message:
 *   ┌─────────────────────────────┐
 *   │ ●●●  tritondft.agent    pill │   ← header
 *   ├─────────────────────────────┤
 *   │  body (markdown + tags)     │
 *   ├─────────────────────────────┤
 *   │  footer (if failed)         │
 *   └─────────────────────────────┘
 *
 * State pill becomes red ("Failed at step N") when the body contains an
 * [ERROR]-class tag. Footer shows a Retry button on failure.
 */
export function AgentRunBlock({ content, isStreaming, onRetry }: Props) {
  const { t } = useTranslation();
  const { stepCount, errorAt } = useMemo(() => parseAgentState(content), [content]);

  const trimmed = content.trim();
  // "Waiting" = streaming but only a ⏳ placeholder (queued / starting / no
  // output yet) — show a calm dots state, not the raw placeholder in the body.
  const isWaiting = isStreaming && (!trimmed || trimmed.startsWith("⏳"));
  let waitWord = "Working";
  if (!trimmed) waitWord = "Thinking";
  else if (trimmed.startsWith("⏳ Queued")) waitWord = "Queued";
  else if (trimmed.startsWith("⏳ Starting")) waitWord = "Starting";
  else if (trimmed.startsWith("⏳ Running")) waitWord = "Running";
  const waitingText = !trimmed ? t("thinking") : trimmed.replace(/^⏳\s*/, "");

  const hasFailed = !isStreaming && errorAt > 0;
  const labelPlural = (n: number) => `${n} step${n === 1 ? "" : "s"}`;

  let statusClass = "is-done";
  let statusText: string;
  if (isWaiting) {
    statusClass = "is-live";
    statusText = waitWord;
  } else if (isStreaming) {
    statusClass = "is-live";
    statusText = `Running · ${labelPlural(stepCount)}`;
  } else if (hasFailed) {
    statusClass = "is-failed";
    statusText = `Failed at step ${errorAt} / ${stepCount}`;
  } else {
    statusText = `Complete · ${labelPlural(stepCount)}`;
  }

  return (
    <div className={`agent-run ${hasFailed ? "is-failed" : ""}`}>
      <header className="agent-run-header">
        <div className="agent-run-dots" aria-hidden="true">
          <span /><span /><span />
        </div>
        <div className="agent-run-title">tritondft.agent</div>
        <div className={`agent-run-status ${statusClass}`}>
          <span className="agent-run-status-dot" aria-hidden="true" />
          {statusText}
        </div>
      </header>

      <div className="agent-run-body">
        {isWaiting ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 0" }}>
            <span className="thinking-dots" aria-hidden="true">
              <span /><span /><span />
            </span>
            <span style={{ color: "var(--fg-mute)", fontSize: 13, fontStyle: "italic" }}>
              {waitingText}
            </span>
          </div>
        ) : (
          <>
            <AgentStream content={content} />
            {isStreaming && <span className="streaming-cursor" aria-hidden="true" />}
          </>
        )}
      </div>

      {hasFailed && (
        <footer className="agent-run-footer">
          <div className="agent-run-footer-text">
            {t("agentFailedHint")}
          </div>
          {onRetry && (
            <button className="agent-run-retry" onClick={onRetry} type="button">
              <RotateCwIcon size={13} />
              {t("retry")}
            </button>
          )}
        </footer>
      )}
    </div>
  );
}

function parseAgentState(content: string): { stepCount: number; errorAt: number } {
  // Count "[Tag]" appearances; find the index of the first ERROR-like tag.
  const re = /^\[(\w+)\]/gm;
  let m: RegExpExecArray | null;
  let count = 0;
  let errorAt = 0;
  while ((m = re.exec(content)) !== null) {
    count += 1;
    if (errorAt === 0) {
      const t = m[1].toLowerCase();
      if (t === "error" || t === "exception" || t === "fatal") errorAt = count;
    }
  }
  return { stepCount: count, errorAt };
}
