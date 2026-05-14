"use client";

import { PlusIcon, TrashIcon, MessageSquareIcon } from "lucide-react";
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

function relativeTime(ts: number, locale: string): string {
  const now = Date.now();
  const diff = Math.floor((now - ts) / 1000);
  if (locale === "zh") {
    if (diff < 60) return "刚刚";
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
    return new Date(ts).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  }
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function Sidebar({ conversations, activeId, onSelect, onNew, onDelete }: Props) {
  const { t, i18n } = useTranslation();

  return (
    <aside
      className="w-64 shrink-0 flex flex-col border-r"
      style={{ background: "var(--bg-1)", borderColor: "var(--border)" }}
    >
      <div className="p-3 border-b" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 justify-center py-2.5 rounded-lg text-white font-medium text-sm transition"
          style={{
            background: "var(--grad-primary)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.1) inset",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
        >
          <PlusIcon size={16} />
          {t("newChat")}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center text-center py-10 px-4" style={{ color: "var(--fg-dim)" }}>
            <MessageSquareIcon size={28} opacity={0.5} />
            <div className="text-sm mt-3">{t("noConversations")}</div>
          </div>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group px-3 py-2.5 rounded-lg cursor-pointer flex items-start gap-2 transition mb-0.5",
              )}
              style={{
                background: c.id === activeId ? "rgba(69, 119, 255, 0.12)" : "transparent",
                borderLeft: c.id === activeId ? "2px solid var(--blue-500)" : "2px solid transparent",
                paddingLeft: c.id === activeId ? "10px" : "12px",
              }}
              onMouseEnter={(e) => {
                if (c.id !== activeId)
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(e) => {
                if (c.id !== activeId) e.currentTarget.style.background = "transparent";
              }}
              onClick={() => onSelect(c.id)}
            >
              <div className="flex-1 min-w-0">
                <div
                  className="truncate text-sm"
                  style={{ color: c.id === activeId ? "var(--fg)" : "var(--fg-mute)" }}
                >
                  {c.title || "(untitled)"}
                </div>
                <div
                  className="text-[11px] mt-0.5"
                  style={{ color: "var(--fg-dim)", fontFamily: "var(--font-mono)" }}
                >
                  {relativeTime(c.updatedAt, i18n.language)}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(t("confirmDelete"))) onDelete(c.id);
                }}
                title={t("delete")}
                className="opacity-0 group-hover:opacity-100 mt-0.5 transition"
                style={{ color: "var(--fg-dim)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-dim)")}
              >
                <TrashIcon size={14} />
              </button>
            </div>
          ))
        )}
      </div>
      <div
        className="p-3 border-t text-[11px] flex items-center justify-between"
        style={{ borderColor: "var(--border)", color: "var(--fg-dim)", fontFamily: "var(--font-mono)" }}
      >
        <span>{conversations.length} chat{conversations.length === 1 ? "" : "s"}</span>
        <a
          href="https://github.com/yil384/TritonDFT-frontend"
          target="_blank"
          rel="noopener"
          className="transition"
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg-mute)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-dim)")}
        >
          github
        </a>
      </div>
    </aside>
  );
}
