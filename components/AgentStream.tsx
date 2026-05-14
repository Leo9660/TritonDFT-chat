"use client";

/**
 * Renders an agent's `[Tag] body` stream as clean step rows instead of raw log.
 *
 * Parse rules:
 *  - A line matching `^\[tag\] body` starts a new Step (body may be empty).
 *  - A non-tagged line that follows a Step is appended to that step's body
 *    (e.g. multi-line code snippets the agent prints after a tag line).
 *  - A non-tagged line with NO preceding step (or starting with `>` blockquote
 *    markers we inject) becomes part of a Markdown block, rendered as
 *    regular markdown.
 */

import { useMemo } from "react";
import {
  AlertTriangleIcon,
  AtomIcon,
  DatabaseIcon,
  SparklesIcon,
  CpuIcon,
  FlaskConicalIcon,
  TerminalIcon,
  ChevronRightIcon,
  PlayIcon,
} from "lucide-react";
import { MessageRenderer } from "./MessageRenderer";

interface Props {
  content: string;
}

type Block =
  | { kind: "step"; tag: string; body: string; isError: boolean; key: number }
  | { kind: "markdown"; text: string; key: number };

const ERROR_TAGS = new Set(["error", "exception", "fatal"]);

function tagColor(tag: string, isError: boolean): string {
  if (isError) return "#ef4444";
  const t = tag.toLowerCase();
  if (t === "warn" || t === "warning") return "#fbbf24";
  if (t === "planner" || t === "plan") return "#7c9eff";
  if (t === "executor" || t === "solve_sub_problem" || t === "solve") return "#fbbf24";
  if (t === "analyzer") return "#34d399";
  if (t === "refiner") return "#a78bfa";
  if (t === "dftagent") return "#c9d8ff";
  if (t === "run") return "#9fa5b9";
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

function prettyTag(raw: string, isError: boolean): string {
  // Convert `solve_sub_problem` → "Solve sub-problem", `info_query` → "Info query".
  const t = raw.replace(/_/g, " ").replace(/-/g, " ");
  const cap = t.charAt(0).toUpperCase() + t.slice(1);
  return isError ? `${cap} · error` : cap;
}

function parseBlocks(content: string): Block[] {
  const lines = content.split("\n");
  const out: Block[] = [];
  let curStep: Extract<Block, { kind: "step" }> | null = null;
  let mdBuf: string[] = [];
  let key = 0;

  const flushMd = () => {
    if (mdBuf.length === 0) return;
    const text = mdBuf.join("\n").trim();
    mdBuf = [];
    if (text) out.push({ kind: "markdown", text, key: key++ });
  };

  const flushStep = () => {
    if (curStep) {
      curStep.body = curStep.body.trimEnd();
      out.push(curStep);
      curStep = null;
    }
  };

  // `[tag][subtag] body` or `[tag] body`. We treat any `[…error…]` segment as an error step.
  const tagRe = /^\[([\w-]+)\](?:\[([\w-]+)\])?\s*(.*)$/;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");
    const m = line.match(tagRe);
    if (m) {
      // New step. Flush whatever we were accumulating.
      flushMd();
      flushStep();
      const t1 = m[1].toLowerCase();
      const t2 = (m[2] || "").toLowerCase();
      const isError = ERROR_TAGS.has(t1) || ERROR_TAGS.has(t2) || t2 === "error";
      curStep = {
        kind: "step",
        tag: m[1],
        body: m[3] || "",
        isError,
        key: key++,
      };
    } else if (curStep) {
      // Continuation of current step's body.
      curStep.body += (curStep.body ? "\n" : "") + line;
    } else {
      // No preceding step — collect as markdown.
      mdBuf.push(line);
    }
  }
  flushStep();
  flushMd();
  return out;
}

export function AgentStream({ content }: Props) {
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <div className="agent-stream">
      {blocks.map((b) => {
        if (b.kind === "markdown") {
          return (
            <div key={b.key} className="agent-stream-md">
              <MessageRenderer content={b.text} />
            </div>
          );
        }
        const Icon = tagIcon(b.tag, b.isError);
        const color = tagColor(b.tag, b.isError);
        return (
          <div key={b.key} className={`agent-step ${b.isError ? "is-error" : ""}`}>
            <div className="agent-step-bullet" style={{ color }}>
              <Icon size={13} />
            </div>
            <div className="agent-step-main">
              <div className="agent-step-tag" style={{ color }}>
                <ChevronRightIcon size={10} style={{ opacity: 0.6 }} />
                {prettyTag(b.tag, b.isError)}
              </div>
              {b.body && (
                <div className="agent-step-body">{b.body}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
