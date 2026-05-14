"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";

/**
 * Color-code agent tags like "[Planner]" or "[info_query]" at the start of a line.
 * Only matches OUTSIDE code blocks (we split by fenced ``` regions).
 */
function colorizeAgentTags(src: string): string {
  const fences = src.split(/(```[\s\S]*?```)/g);
  return fences
    .map((chunk, i) => {
      if (i % 2 === 1) return chunk; // inside code fence, leave alone
      return chunk.replace(/^\[(\w+)\]/gm, (_m, tag) => {
        const cls = tag.toLowerCase().replace(/_/g, "-");
        return `<span class="agent-tag ${cls}">[${tag}]</span>`;
      });
    })
    .join("");
}

export function MessageRenderer({ content }: { content: string }) {
  const processed = colorizeAgentTags(content);
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
