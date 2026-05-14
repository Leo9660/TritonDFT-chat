"use client";

import { useEffect, useRef, useState } from "react";
import {
  MoreVerticalIcon,
  DownloadIcon,
  ClipboardIcon,
  PanelRightIcon,
  PanelRightCloseIcon,
  CheckIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  hasConversation: boolean;
  panelOpen: boolean;
  onTogglePanel: () => void;
  onExport: () => void;
  onCopy: () => Promise<void>;
}

export function ChatMenu({ hasConversation, panelOpen, onTogglePanel, onExport, onCopy }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function handleCopy() {
    await onCopy();
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, 900);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((x) => !x)}
        title="More"
        className="p-1.5 rounded-md transition"
        style={{ color: "var(--fg-mute)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <MoreVerticalIcon size={16} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 rounded-xl anim-slide-in py-1"
          style={{
            zIndex: 60,
            background: "var(--bg-1)",
            border: "1px solid var(--border-strong)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
            minWidth: 220,
          }}
        >
          <MenuItem
            icon={panelOpen ? <PanelRightCloseIcon size={14} /> : <PanelRightIcon size={14} />}
            label={panelOpen ? t("hidePanel") : t("showPanel")}
            onClick={() => {
              onTogglePanel();
              setOpen(false);
            }}
          />
          {hasConversation && (
            <>
              <Divider />
              <MenuItem
                icon={copied ? <CheckIcon size={14} style={{ color: "#10b981" }} /> : <ClipboardIcon size={14} />}
                label={copied ? t("copied") : t("copyAsMarkdown")}
                onClick={handleCopy}
              />
              <MenuItem
                icon={<DownloadIcon size={14} />}
                label={t("downloadMarkdown")}
                onClick={() => {
                  onExport();
                  setOpen(false);
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition"
      style={{ color: "var(--fg)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ color: "var(--fg-mute)" }}>{icon}</span>
      {label}
    </button>
  );
}

function Divider() {
  return <div className="my-1 mx-2" style={{ height: 1, background: "var(--border)" }} />;
}
