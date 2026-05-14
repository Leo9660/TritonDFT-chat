"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CopyIcon, CheckIcon } from "lucide-react";
import { Message } from "@/lib/types";
import { MessageRenderer } from "./MessageRenderer";

interface Props {
  messages: Message[];
  isStreaming: boolean;
}

export function ChatMessages({ messages, isStreaming }: Props) {
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

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        {messages.map((m, i) => (
          <MessageBubble
            key={m.id}
            message={m}
            isLast={i === lastIdx}
            isStreaming={i === lastIdx && lastIsAssistantStreaming}
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
}: {
  message: Message;
  isLast: boolean;
  isStreaming: boolean;
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

  return (
    <div className="self-start max-w-[92%] group anim-slide-in">
      <div
        className="rounded-2xl px-4 py-3 relative"
        style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}
      >
        <MessageRenderer content={message.content} />
        {isStreaming && <span className="streaming-cursor" aria-hidden="true" />}
      </div>
      {!isStreaming && message.content.length > 0 && (
        <button
          onClick={copy}
          className="mt-1.5 ml-2 inline-flex items-center gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: copied ? "var(--green-500, #10b981)" : "var(--fg-dim)" }}
          title={copied ? t("copied") : t("copy")}
        >
          {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
          {copied ? t("copied") : t("copy")}
        </button>
      )}
    </div>
  );
}
