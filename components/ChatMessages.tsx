"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CopyIcon, CheckIcon, RotateCwIcon } from "lucide-react";
import { Message } from "@/lib/types";
import { AgentRunBlock } from "./AgentRunBlock";

interface Props {
  messages: Message[];
  isStreaming: boolean;
  onRetry?: (prompt: string) => void;
  onRegenerate?: (prompt: string) => void;
}

export function ChatMessages({ messages, isStreaming, onRetry, onRegenerate }: Props) {
  const { t } = useTranslation();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  const lastIdx = messages.length - 1;
  const lastMsg = messages[lastIdx];
  const lastIsAssistantStreaming =
    isStreaming && lastMsg?.role === "assistant" && lastMsg.content.length > 0;
  const lastIsEmptyAssistant =
    isStreaming && lastMsg?.role === "assistant" && lastMsg.content.length === 0;

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
    <div className="flex-1 overflow-y-auto px-4 py-4">
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
        {lastIsEmptyAssistant && (
          <div
            className="self-start flex items-center gap-3 px-4 py-3 rounded-2xl anim-slide-in"
            style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}
          >
            <span className="thinking-dots" aria-hidden="true">
              <span /><span /><span />
            </span>
            <span style={{ color: "var(--fg-mute)" }} className="text-sm italic">
              {t("thinking")}
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function MessageBubble({
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

  function copy() {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  if (message.role === "user") {
    return (
      <div
        className="self-end max-w-[80%] rounded-2xl px-4 py-2.5 text-white whitespace-pre-wrap anim-slide-in"
        style={{
          background: "var(--grad-primary)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.08) inset, 0 8px 22px rgba(69, 119, 255, 0.18)",
        }}
      >
        {message.content}
      </div>
    );
  }

  const handleRetry = onRetry && retryPrompt ? () => onRetry(retryPrompt) : undefined;

  return (
    <div className="self-start w-full max-w-full group anim-slide-in">
      <AgentRunBlock content={message.content} isStreaming={isStreaming} onRetry={handleRetry} />
      {isStreaming && (
        <span className="streaming-cursor inline-block ml-1 mt-1" aria-hidden="true" />
      )}
      {!isStreaming && message.content.length > 0 && (
        <div className="mt-1.5 ml-2 inline-flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={copy}
            className="inline-flex items-center gap-1 text-xs"
            style={{ color: copied ? "var(--green-500, #10b981)" : "var(--fg-dim)" }}
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
