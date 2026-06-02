"use client";

import {
  SettingsIcon, GlobeIcon, ExternalLinkIcon, ChevronDownIcon, CpuIcon, FileCodeIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Lang } from "@/lib/types";
import { MODELS } from "@/lib/models";
import { ChatMenu } from "./ChatMenu";
import { UserMenu } from "./UserMenu";

interface Props {
  lang: Lang;
  onToggleLang: () => void;
  onOpenSettings: () => void;
  hasConversation: boolean;
  panelOpen: boolean;
  onTogglePanel: () => void;
  onExport: () => void;
  onCopy: () => Promise<void>;
  // Per-conversation model + execution mode (regular accounts are script-only).
  model: string;
  onModelChange: (m: string) => void;
  scriptOnly: boolean;
  onToggleScriptOnly: () => void;
  canUseCpu: boolean;
  controlsDisabled: boolean;
}

export function TopBar({
  lang,
  onToggleLang,
  onOpenSettings,
  hasConversation,
  panelOpen,
  onTogglePanel,
  onExport,
  onCopy,
  model,
  onModelChange,
  scriptOnly,
  onToggleScriptOnly,
  canUseCpu,
  controlsDisabled,
}: Props) {
  const { t } = useTranslation();
  const cpuOn = canUseCpu && !scriptOnly;
  return (
    <header
      className="relative z-50 flex items-center justify-between px-4 py-2 border-b backdrop-blur-md"
      style={{
        borderColor: "var(--border)",
        background: "rgba(7, 8, 13, 0.55)",
      }}
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="inline-block w-2.5 h-2.5 rounded-full"
          style={{
            background: "var(--grad-primary)",
            boxShadow: "0 0 10px var(--blue-500)",
          }}
        />
        <h1
          className="italic"
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 500,
            fontSize: 22,
            lineHeight: 1,
          }}
        >
          {t("appTitle")}
        </h1>
        <span
          className="hidden sm:inline-flex ml-2 px-1.5 py-0.5 rounded text-[10px] tracking-wider uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--amber-500, #f59e0b)",
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
          }}
        >
          Beta
        </span>
      </div>

      {/* center: per-conversation model + execution mode */}
      <div
        className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-2"
        style={{ fontSize: 12 }}
      >
        <div className="relative inline-flex items-center" title="Model — billed by OpenAI/Anthropic price × tokens">
          <select
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={controlsDisabled}
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
            disabled={controlsDisabled}
            title={cpuOn
              ? "CPU run: executes the DFT calculation"
              : "Script-only: generates inputs without running them"}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition"
            style={{
              border: "1px solid var(--border)",
              background: cpuOn ? "rgba(34,197,94,0.12)" : "var(--bg-1)",
              color: cpuOn ? "#22c55e" : "var(--fg-mute)",
              cursor: controlsDisabled ? "not-allowed" : "pointer",
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

      <div className="flex items-center gap-1">
        <a
          href="https://tritondft.com"
          target="_blank"
          rel="noopener"
          className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm transition"
          style={{ color: "var(--fg-mute)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-mute)")}
          title="About TritonDFT"
        >
          About
          <ExternalLinkIcon size={12} />
        </a>
        <button
          onClick={onToggleLang}
          title="Toggle language"
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-sm transition"
          style={{ color: "var(--fg-mute)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <GlobeIcon size={14} />
          {lang === "en" ? "EN" : "中"}
        </button>
        <button
          onClick={onOpenSettings}
          title={t("settings")}
          className="p-1.5 rounded-md transition"
          style={{ color: "var(--fg-mute)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <SettingsIcon size={16} />
        </button>
        <ChatMenu
          hasConversation={hasConversation}
          panelOpen={panelOpen}
          onTogglePanel={onTogglePanel}
          onExport={onExport}
          onCopy={onCopy}
        />
        <UserMenu />
      </div>
    </header>
  );
}
