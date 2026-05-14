"use client";

import { SettingsIcon, GlobeIcon } from "lucide-react";
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
      className="flex items-center justify-between px-4 py-2 border-b"
      style={{ borderColor: "var(--border)" }}
    >
      <h1 className="font-semibold text-lg">{t("appTitle")}</h1>
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleLang}
          title="Toggle language"
          className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-sm"
        >
          <GlobeIcon size={16} />
          {lang === "en" ? "EN" : "中"}
        </button>
        <button
          onClick={onOpenSettings}
          title={t("settings")}
          className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
        >
          <SettingsIcon size={16} />
        </button>
      </div>
    </header>
  );
}
