"use client";

import { useEffect, useState } from "react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="w-full max-w-md rounded-xl p-4 shadow-xl"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      >
        <h2 className="font-semibold mb-3">{t("settings")}</h2>
        <label className="block text-sm mb-1">{t("backendUrl")}</label>
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          className="w-full px-3 py-2 rounded-md border outline-none bg-transparent"
          style={{ borderColor: "var(--border)" }}
          placeholder="https://tritondft.nrp-nautilus.io"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5">
            {t("cancel")}
          </button>
          <button
            onClick={() => onSave(v.trim())}
            className="px-3 py-1.5 rounded-md bg-[var(--accent)] text-white hover:opacity-90"
          >
            {t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
