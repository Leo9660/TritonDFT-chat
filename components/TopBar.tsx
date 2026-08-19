"use client";

import { SettingsIcon, GlobeIcon, ExternalLinkIcon, SunIcon, MoonIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Lang } from "@/lib/types";
import type { Theme } from "@/lib/theme";
import { ChatMenu } from "./ChatMenu";
import { UserMenu } from "./UserMenu";

interface Props {
  lang: Lang;
  onToggleLang: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  hasConversation: boolean;
  panelOpen: boolean;
  onTogglePanel: () => void;
  onExport: () => void;
  onCopy: () => Promise<void>;
}

export function TopBar({
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
  onOpenSettings,
  hasConversation,
  panelOpen,
  onTogglePanel,
  onExport,
  onCopy,
}: Props) {
  const { t } = useTranslation();
  return (
    <header
      className="relative z-50 flex items-center justify-between px-4 py-2 border-b backdrop-blur-md"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg-glass)",
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
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-md transition"
          style={{ color: "var(--fg-mute)" }}
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          aria-label="Toggle colour theme"
        >
          {theme === "dark" ? <SunIcon size={15} /> : <MoonIcon size={15} />}
        </button>
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
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tint-2)")}
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
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tint-2)")}
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
