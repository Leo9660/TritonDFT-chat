"use client";

import { useEffect, useRef } from "react";
import { ImageIcon, SendIcon, SquareIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
}

export function ChatInput({ value, onChange, onSend, onStop, isStreaming }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLTextAreaElement>(null);

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
    }
  }

  return (
    <div className="flex gap-2 border rounded-2xl p-2 items-end bg-[var(--bg-elev)]" style={{ borderColor: "var(--border)" }}>
      <button
        type="button"
        title={t("attachImage")}
        disabled
        className="p-2 rounded-lg text-[var(--muted)] disabled:opacity-40 cursor-not-allowed"
      >
        <ImageIcon size={18} />
      </button>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKey}
        rows={1}
        placeholder={t("placeholder")}
        className="flex-1 resize-none bg-transparent outline-none px-2 py-2 max-h-60"
      />
      {isStreaming ? (
        <button
          type="button"
          onClick={onStop}
          title={t("stop")}
          className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
        >
          <SquareIcon size={18} />
        </button>
      ) : (
        <button
          type="button"
          onClick={onSend}
          disabled={!value.trim()}
          title={t("send")}
          className={cn(
            "p-2 rounded-lg text-white",
            value.trim() ? "bg-[var(--accent)] hover:opacity-90" : "bg-gray-400 cursor-not-allowed",
          )}
        >
          <SendIcon size={18} />
        </button>
      )}
    </div>
  );
}
