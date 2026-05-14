"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";

/**
 * Auto-close an unbalanced fenced code block — important during streaming when
 * the closing ``` hasn't arrived yet (otherwise ReactMarkdown swallows the
 * entire trailing content into a single code block).
 */
function autoCloseFence(src: string): string {
  const fenceCount = (src.match(/```/g) || []).length;
  if (fenceCount % 2 === 1) return src + "\n```";
  return src;
}

/** Drop runs of >= 3 blank lines down to single blank — avoids huge gaps. */
function collapseBlankLines(src: string): string {
  return src.replace(/\n{3,}/g, "\n\n");
}

const TAG_RE = /^\[(\w+)\]\s*/;

type AnyProps = { children?: React.ReactNode; node?: unknown };

const ERROR_TAGS = new Set(["error", "exception", "fatal"]);
const WARN_TAGS = new Set(["warn", "warning"]);

function tagRender(tagName: string, rest: React.ReactNode[]) {
  const lc = tagName.toLowerCase();
  if (ERROR_TAGS.has(lc)) {
    return (
      <div className="agent-alert agent-alert-error">
        <span className="agent-alert-icon" aria-hidden="true">⚠</span>
        <div className="agent-alert-body">
          <div className="agent-alert-title">{tagName}</div>
          <div className="agent-alert-text">{rest}</div>
        </div>
      </div>
    );
  }
  if (WARN_TAGS.has(lc)) {
    return (
      <div className="agent-alert agent-alert-warn">
        <span className="agent-alert-icon" aria-hidden="true">⚠</span>
        <div className="agent-alert-body">
          <div className="agent-alert-title">{tagName}</div>
          <div className="agent-alert-text">{rest}</div>
        </div>
      </div>
    );
  }
  const cls = lc.replace(/_/g, "-");
  return (
    <p className="agent-line">
      <span className={`agent-tag ${cls}`}>[{tagName}]</span>
      {" "}
      {rest}
    </p>
  );
}

function tryWrapTag(children: React.ReactNode): React.ReactElement | null {
  const arr = React.Children.toArray(children);
  if (arr.length === 0) return null;
  const first = arr[0];
  if (typeof first !== "string") return null;
  const m = first.match(TAG_RE);
  if (!m) return null;
  const rest: React.ReactNode[] = [];
  const remainder = first.slice(m[0].length);
  if (remainder) rest.push(remainder);
  rest.push(...arr.slice(1));
  return tagRender(m[1], rest);
}

function PCustom({ children }: AnyProps) {
  const wrapped = tryWrapTag(children);
  if (wrapped) return wrapped;
  return <p>{children}</p>;
}

function LiCustom({ children }: AnyProps) {
  const wrapped = tryWrapTag(children);
  if (wrapped) return <li>{wrapped}</li>;
  return <li>{children}</li>;
}

export function MessageRenderer({ content }: { content: string }) {
  const processed = collapseBlankLines(autoCloseFence(content));
  return (
    <div className="prose-msg">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{ p: PCustom, li: LiCustom }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
