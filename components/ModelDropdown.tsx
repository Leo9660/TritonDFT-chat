"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, CheckIcon } from "lucide-react";
import { MODELS } from "@/lib/models";

/** Custom model picker — a real, styleable, reliably-opening dropdown (the
 *  native <select> popup couldn't be styled and behaved inconsistently). */
export function ModelDropdown({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (m: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = MODELS.find((m) => m.id === value);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1 rounded-lg pl-2.5 pr-2 py-1.5 outline-none transition"
        style={{
          background: "var(--bg-0)",
          color: "var(--fg)",
          border: `1px solid ${open ? "rgba(69,119,255,0.5)" : "var(--border)"}`,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span className="flex-1 text-left truncate">{current?.label ?? value}</span>
        <ChevronDownIcon
          size={14}
          style={{
            color: "var(--fg-dim)",
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .15s",
          }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 rounded-lg py-1 overflow-y-auto"
          style={{
            zIndex: 60,
            maxHeight: 300,
            background: "var(--bg-1)",
            border: "1px solid var(--border-strong)",
            boxShadow: "0 14px 32px rgba(0,0,0,0.55)",
            animation: "slide-in-up 0.16s ease-out both",
          }}
        >
          {MODELS.map((m) => {
            const active = m.id === value;
            return (
              <button
                key={m.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: active ? "var(--fg)" : "var(--fg-mute)",
                  background: active ? "rgba(69,119,255,0.12)" : "transparent",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <span className="flex-1 truncate">{m.label}</span>
                {active && <CheckIcon size={12} style={{ color: "var(--blue-500)", flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
