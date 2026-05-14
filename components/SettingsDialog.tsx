"use client";

import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  backendUrl: string;
  onClose: () => void;
  onSave: (url: string) => void;
}

export function SettingsDialog({ open, backendUrl, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const [v, setV] = useState(backendUrl);

  useEffect(() => setV(backendUrl), [backendUrl, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 anim-slide-in"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5"
        style={{
          background: "var(--bg-1)",
          border: "1px solid var(--border-strong)",
          boxShadow: "var(--shadow-md, 0 12px 28px rgba(0,0,0,0.45))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="italic"
            style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500 }}
          >
            {t("settings")}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md transition"
            style={{ color: "var(--fg-dim)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--fg)";
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--fg-dim)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <XIcon size={18} />
          </button>
        </div>
        <label
          className="block text-xs mb-1.5 tracking-wider uppercase"
          style={{ color: "var(--fg-mute)", fontFamily: "var(--font-mono)" }}
        >
          {t("backendUrl")}
        </label>
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          className="w-full px-3 py-2 rounded-lg outline-none transition"
          style={{
            background: "var(--bg-0)",
            border: "1px solid var(--border-strong)",
            color: "var(--fg)",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(69, 119, 255, 0.5)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
          placeholder="https://tritondft.nrp-nautilus.io"
        />
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg transition text-sm"
            style={{ color: "var(--fg-mute)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {t("cancel")}
          </button>
          <button
            onClick={() => onSave(v.trim())}
            className="px-4 py-2 rounded-lg text-white font-medium text-sm transition"
            style={{
              background: "var(--grad-primary)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.1) inset",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
          >
            {t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
