"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, SendIcon, SquareIcon, CpuIcon, FileCodeIcon, ChevronDownIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MODELS } from "@/lib/models";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  /** Most-recent user message in the active conversation — used by ArrowUp recall. */
  lastUserMessage?: string;
  // Model + CPU controls
  model: string;
  onModelChange: (m: string) => void;
  scriptOnly: boolean;
  onToggleScriptOnly: () => void;
  /** Only admins / unlimited accounts may run CPU; others are locked to script-only. */
  canUseCpu: boolean;
}

export function ChatInput({
  value, onChange, onSend, onStop, isStreaming, lastUserMessage,
  model, onModelChange, scriptOnly, onToggleScriptOnly, canUseCpu,
}: Props) {
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
    // Enter sends; Shift+Enter inserts a newline. Skip while an IME
    // composition is active — Enter then just confirms the candidate.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
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
  const cpuOn = canUseCpu && !scriptOnly;

  return (
    <div className="flex flex-col gap-1.5">
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

    {/* Controls: model + execution mode */}
    <div className="flex items-center gap-2 px-1" style={{ fontSize: 12 }}>
      <div
        className="relative inline-flex items-center"
        title="Model — billed by OpenAI price × tokens"
      >
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={isStreaming}
          className="appearance-none rounded-lg pl-2.5 pr-7 py-1 outline-none cursor-pointer"
          style={{
            background: "var(--bg-1)",
            color: "var(--fg-mute)",
            border: "1px solid var(--border)",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
          }}
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} · {m.hint}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          size={13}
          style={{ position: "absolute", right: 7, pointerEvents: "none", color: "var(--fg-dim)" }}
        />
      </div>

      {canUseCpu ? (
        <button
          type="button"
          onClick={onToggleScriptOnly}
          disabled={isStreaming}
          title={cpuOn
            ? "CPU run: executes the DFT calculation"
            : "Script-only: generates inputs without running them"}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition"
          style={{
            border: "1px solid var(--border)",
            background: cpuOn ? "rgba(34,197,94,0.12)" : "var(--bg-1)",
            color: cpuOn ? "#22c55e" : "var(--fg-mute)",
            cursor: isStreaming ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {cpuOn ? <CpuIcon size={13} /> : <FileCodeIcon size={13} />}
          {cpuOn ? "CPU run" : "Script-only"}
        </button>
      ) : (
        <span
          title="Your account generates input scripts only. Running on CPU requires an admin."
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1"
          style={{
            border: "1px solid var(--border)",
            background: "var(--bg-1)",
            color: "var(--fg-dim)",
            fontWeight: 600,
          }}
        >
          <FileCodeIcon size={13} />
          Script-only
        </span>
      )}
    </div>
    </div>
  );
}
