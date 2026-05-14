"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";

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

/**
 * Color-code "[Tag]" prefixes at the start of a line (planner / executor /
 * analyzer / refiner / info_query / DFTAgent / etc.). Wraps each tag in a
 * <span class="agent-tag ..."> so CSS can style it. Skips code fence regions.
 */
function colorizeAgentTags(src: string): string {
  const fences = src.split(/(```[\s\S]*?```)/g);
  return fences
    .map((chunk, i) => {
      if (i % 2 === 1) return chunk;
      return chunk.replace(/^\[(\w+)\]/gm, (_m, tag) => {
        const cls = tag.toLowerCase().replace(/_/g, "-");
        return `<span class="agent-tag ${cls}">[${tag}]</span>`;
      });
    })
    .join("");
}

/** Drop runs of >= 3 blank lines down to single blank — avoids huge gaps. */
function collapseBlankLines(src: string): string {
  return src.replace(/\n{3,}/g, "\n\n");
}

export function MessageRenderer({ content }: { content: string }) {
  const processed = colorizeAgentTags(collapseBlankLines(autoCloseFence(content)));
  return (
    <div className="prose-msg">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
