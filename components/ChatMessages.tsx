"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
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
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "self-end max-w-[80%] rounded-2xl px-4 py-2 bg-[var(--accent)] text-white whitespace-pre-wrap"
                : "self-start max-w-[90%] rounded-2xl px-4 py-2 bg-[var(--bg-elev)]"
            }
          >
            {m.role === "user" ? m.content : <MessageRenderer content={m.content} />}
          </div>
        ))}
        {isStreaming && messages[messages.length - 1]?.role === "user" && (
          <div className="self-start text-[var(--muted)] italic">{t("thinking")}</div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
