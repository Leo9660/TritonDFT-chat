"use client";

import { useEffect, useRef, useState, memo } from "react";
import { useTranslation } from "react-i18next";
import { CopyIcon, CheckIcon, RotateCwIcon } from "lucide-react";
import { Message } from "@/lib/types";
import { AgentRunBlock } from "./AgentRunBlock";
import { ResultsPanel } from "./ResultsPanel";

interface Props {
  messages: Message[];
  isStreaming: boolean;
  onRetry?: (prompt: string) => void;
  onRegenerate?: (prompt: string) => void;
}

export function ChatMessages({ messages, isStreaming, onRetry, onRegenerate }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Keep pinned to the bottom only when the user is already near it — don't
    // yank them down while they've scrolled up reading. Instant scroll (no
    // smooth) so it can't fight the rapid typewriter updates.
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (nearBottom) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isStreaming]);

  const lastIdx = messages.length - 1;
  const lastMsg = messages[lastIdx];
  // The last assistant message is "streaming" for the whole run — including
  // before any output arrives (AgentRunBlock shows the thinking state then).
  const lastIsAssistantStreaming =
    isStreaming && lastMsg?.role === "assistant";

  // Map assistant index → preceding user prompt text (for retry).
  const promptForAssistant: Record<number, string> = {};
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "assistant") {
      for (let j = i - 1; j >= 0; j--) {
        if (messages[j].role === "user") {
          promptForAssistant[i] = messages[j].content;
          break;
        }
      }
    }
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        {messages.map((m, i) => (
          <MessageBubble
            key={m.id}
            message={m}
            isLast={i === lastIdx}
            isStreaming={i === lastIdx && lastIsAssistantStreaming}
            retryPrompt={promptForAssistant[i]}
            onRetry={onRetry}
            onRegenerate={i === lastIdx ? onRegenerate : undefined}
          />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function MessageBubbleImpl({
  message,
  isStreaming,
  retryPrompt,
  onRetry,
  onRegenerate,
}: {
  message: Message;
  isLast: boolean;
  isStreaming: boolean;
  retryPrompt?: string;
  onRetry?: (prompt: string) => void;
  onRegenerate?: (prompt: string) => void;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [copyHover, setCopyHover] = useState(false);

  function copy() {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  // Green when just-copied, blue on hover, dim otherwise.
  const copyColor = copied
    ? "var(--green-500, #10b981)"
    : copyHover
      ? "var(--blue-500)"
      : "var(--fg-dim)";

  if (message.role === "user") {
    return (
      <div className="self-end max-w-[80%] flex flex-col items-end group anim-slide-in">
        <div
          className="rounded-2xl px-4 py-2.5 text-white whitespace-pre-wrap"
          style={{
            background: "var(--grad-primary)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.08) inset, 0 8px 22px rgba(69, 119, 255, 0.18)",
          }}
        >
          {message.content}
        </div>
        <button
          onClick={copy}
          onMouseEnter={() => setCopyHover(true)}
          onMouseLeave={() => setCopyHover(false)}
          className="mt-1 mr-0.5 inline-flex items-center gap-1 text-xs opacity-0 group-hover:opacity-100 transition"
          style={{ color: copyColor }}
          title={copied ? t("copied") : t("copy")}
        >
          {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
          {copied ? t("copied") : t("copy")}
        </button>
      </div>
    );
  }

  const handleRetry = onRetry && retryPrompt ? () => onRetry(retryPrompt) : undefined;

  return (
    <div className="self-start w-full max-w-full group anim-slide-in">
      <AgentRunBlock content={message.content} isStreaming={isStreaming} onRetry={handleRetry} />
      {message.jobId && !isStreaming && <ResultsPanel jobId={message.jobId} />}
      {!isStreaming && message.content.length > 0 && (
        <div className="mt-1.5 ml-2 inline-flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={copy}
            onMouseEnter={() => setCopyHover(true)}
            onMouseLeave={() => setCopyHover(false)}
            className="inline-flex items-center gap-1 text-xs transition"
            style={{ color: copyColor }}
            title={copied ? t("copied") : t("copy")}
          >
            {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
            {copied ? t("copied") : t("copy")}
          </button>
          {onRegenerate && retryPrompt && (
            <button
              onClick={() => onRegenerate(retryPrompt)}
              className="inline-flex items-center gap-1 text-xs transition"
              style={{ color: "var(--fg-dim)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--blue-500)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-dim)")}
              title={t("regenerate")}
            >
              <RotateCwIcon size={12} />
              {t("regenerate")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Memoized so a typewriter update to the streaming message doesn't re-render
// every other (unchanged) bubble in the conversation.
const MessageBubble = memo(
  MessageBubbleImpl,
  (a, b) =>
    a.message === b.message &&
    a.isLast === b.isLast &&
    a.isStreaming === b.isStreaming &&
    a.retryPrompt === b.retryPrompt,
);
