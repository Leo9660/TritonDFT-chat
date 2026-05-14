"use client";

import { PlusIcon, TrashIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function Sidebar({ conversations, activeId, onSelect, onNew, onDelete }: Props) {
  const { t } = useTranslation();

  return (
    <aside
      className="w-64 shrink-0 flex flex-col border-r"
      style={{ background: "var(--bg-elev)", borderColor: "var(--border)" }}
    >
      <div className="p-3 border-b" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 justify-center py-2 rounded-lg bg-[var(--accent)] text-white hover:opacity-90"
        >
          <PlusIcon size={16} />
          {t("newChat")}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="text-sm text-[var(--muted)] text-center py-6">{t("noConversations")}</div>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5",
                c.id === activeId && "bg-black/5 dark:bg-white/10",
              )}
              onClick={() => onSelect(c.id)}
            >
              <div className="flex-1 truncate text-sm">{c.title || "(untitled)"}</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(t("confirmDelete"))) onDelete(c.id);
                }}
                title={t("delete")}
                className="opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-red-500"
              >
                <TrashIcon size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
