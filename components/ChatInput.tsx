"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, SendIcon, SquareIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  /** Most-recent user message in the active conversation — used by ArrowUp recall. */
  lastUserMessage?: string;
}

export function ChatInput({ value, onChange, onSend, onStop, isStreaming, lastUserMessage }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 240) + "px";
  }, [value]);

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!isStreaming && value.trim()) onSend();
      return;
    }
    // ArrowUp on empty input → recall last sent message (terminal-style).
    if (e.key === "ArrowUp" && !value && lastUserMessage && !isStreaming) {
      e.preventDefault();
      onChange(lastUserMessage);
      // Place cursor at end after React updates the value
      requestAnimationFrame(() => {
        const el = ref.current;
        if (el) {
          el.setSelectionRange(lastUserMessage.length, lastUserMessage.length);
        }
      });
    }
  }

  const canSend = value.trim() && !isStreaming;

  return (
    <div
      className="flex gap-2 rounded-2xl p-2 items-end transition"
      style={{
        background: "var(--bg-1)",
        border: focused ? "1px solid rgba(69, 119, 255, 0.5)" : "1px solid var(--border-strong)",
        boxShadow: focused ? "0 0 0 3px rgba(69, 119, 255, 0.12)" : "none",
      }}
    >
      <button
        type="button"
        title={t("attachImage")}
        disabled
        className="rounded-lg disabled:opacity-40 cursor-not-allowed flex-shrink-0 inline-flex items-center justify-center"
        style={{
          color: "var(--fg-dim)",
          width: 38,
          height: 38,
        }}
      >
        <ImageIcon size={18} />
      </button>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKey}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        rows={1}
        placeholder={t("placeholder")}
        className="flex-1 resize-none bg-transparent outline-none px-1 max-h-60"
        style={{
          color: "var(--fg)",
          /* Match button height so single-line text vertically centers
             against the side icons (no more "icon below text" mismatch). */
          minHeight: 38,
          lineHeight: "22px",
          paddingTop: 8,
          paddingBottom: 8,
        }}
      />
      {isStreaming ? (
        <button
          type="button"
          onClick={onStop}
          title={t("stop")}
          className="rounded-lg text-white transition flex-shrink-0 inline-flex items-center justify-center"
          style={{ background: "#ef4444", width: 38, height: 38 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#dc2626")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#ef4444")}
        >
          <SquareIcon size={18} />
        </button>
      ) : (
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          title={t("send")}
          className="rounded-lg text-white transition flex-shrink-0 inline-flex items-center justify-center"
          style={{
            background: canSend ? "var(--grad-primary)" : "rgba(255,255,255,0.06)",
            color: canSend ? "white" : "var(--fg-dim)",
            cursor: canSend ? "pointer" : "not-allowed",
            boxShadow: canSend ? "0 6px 14px rgba(69, 119, 255, 0.3)" : "none",
            width: 38,
            height: 38,
          }}
          onMouseEnter={(e) => {
            if (canSend) e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "";
          }}
        >
          <SendIcon size={18} />
        </button>
      )}
    </div>
  );
}
