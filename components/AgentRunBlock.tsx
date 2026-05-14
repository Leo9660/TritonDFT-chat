"use client";

import { useMemo } from "react";
import { MessageRenderer } from "./MessageRenderer";

interface Props {
  content: string;
  isStreaming: boolean;
}

/**
 * Terminal-style frame around an assistant message. The body delegates to
 * MessageRenderer (markdown + agent-tag coloring), but the surrounding chrome
 * gives the response the look of a live agent run — mac-style dots, title,
 * status pill with step counter.
 */
export function AgentRunBlock({ content, isStreaming }: Props) {
  const stepCount = useMemo(() => {
    const m = content.match(/^\[\w+\]/gm);
    return m ? m.length : 0;
  }, [content]);

  return (
    <div className="agent-run">
      <header className="agent-run-header">
        <div className="agent-run-dots" aria-hidden="true">
          <span /><span /><span />
        </div>
        <div className="agent-run-title">tritondft.agent</div>
        <div className={`agent-run-status ${isStreaming ? "is-live" : "is-done"}`}>
          <span className="agent-run-status-dot" aria-hidden="true" />
          {isStreaming
            ? `Running · ${stepCount} step${stepCount === 1 ? "" : "s"}`
            : `Complete · ${stepCount} step${stepCount === 1 ? "" : "s"}`}
        </div>
      </header>
      <div className="agent-run-body">
        <MessageRenderer content={content} />
      </div>
    </div>
  );
}
