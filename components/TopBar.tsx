"use client";

import { SettingsIcon, GlobeIcon, ExternalLinkIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Lang } from "@/lib/types";

interface Props {
  lang: Lang;
  onToggleLang: () => void;
  onOpenSettings: () => void;
}

export function TopBar({ lang, onToggleLang, onOpenSettings }: Props) {
  const { t } = useTranslation();
  return (
    <header
      className="flex items-center justify-between px-4 py-2 border-b backdrop-blur-md"
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
      </div>
    </header>
  );
}
