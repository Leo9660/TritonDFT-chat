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

/** Match a leading "[Tag]" pattern in a paragraph's first text node. */
const TAG_RE = /^\[(\w+)\]\s*/;

/**
 * Walk children: if the first child is a string starting with "[Tag]",
 * extract it and return [tagNode, restNodes]. Otherwise return [null, children].
 * Returns colored pill + remaining text instead of relying on HTML injection
 * + rehype-raw (which mis-renders when content sits inside a markdown code block).
 */
function extractLeadingTag(children: React.ReactNode): React.ReactNode[] | null {
  const arr = React.Children.toArray(children);
  if (arr.length === 0) return null;
  const first = arr[0];
  if (typeof first !== "string") return null;
  const m = first.match(TAG_RE);
  if (!m) return null;
  const tag = m[1];
  const cls = tag.toLowerCase().replace(/_/g, "-");
  const rest = first.slice(m[0].length);
  const out: React.ReactNode[] = [
    <span key="tag" className={`agent-tag ${cls}`}>[{tag}]</span>,
    " ",
  ];
  if (rest) out.push(rest);
  out.push(...arr.slice(1));
  return out;
}

type AnyProps = { children?: React.ReactNode; node?: unknown };

function PCustom({ children, node, ...rest }: AnyProps) {
  const replaced = extractLeadingTag(children);
  if (replaced) return <p className="agent-line" {...rest}>{replaced}</p>;
  return <p {...rest}>{children}</p>;
}

function LiCustom({ children, node, ...rest }: AnyProps) {
  const replaced = extractLeadingTag(children);
  if (replaced) return <li {...rest}>{replaced}</li>;
  return <li {...rest}>{children}</li>;
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
