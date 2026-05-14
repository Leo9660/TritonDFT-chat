"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CircleIcon, AlertTriangleIcon, ActivityIcon, XIcon } from "lucide-react";
import { Conversation } from "@/lib/types";

interface Props {
  conversation: Conversation | null;
  isStreaming: boolean;
  onClose?: () => void;
}

interface Step {
  tag: string;
  body: string; // first ~80 chars
  isError: boolean;
  index: number; // 1-based
}

const ERROR_TAGS = new Set(["error", "exception", "fatal"]);

/** Parse [Tag] steps from the LAST assistant message of the conversation. */
function parseSteps(conv: Conversation | null): Step[] {
  if (!conv) return [];
  const lastAssistant = [...conv.messages].reverse().find((m) => m.role === "assistant");
  if (!lastAssistant) return [];
  const content = lastAssistant.content;
  const out: Step[] = [];
  const lines = content.split("\n");
  let i = 0;
  for (const line of lines) {
    const m = line.match(/^\[(\w+)\]\s*(.*)$/);
    if (m) {
      i += 1;
      out.push({
        tag: m[1],
        body: (m[2] || "").slice(0, 80),
        isError: ERROR_TAGS.has(m[1].toLowerCase()),
        index: i,
      });
    }
  }
  return out;
}

function tagColor(tag: string): string {
  const t = tag.toLowerCase();
  if (ERROR_TAGS.has(t)) return "#ef4444";
  if (t === "warn" || t === "warning") return "#fbbf24";
  if (t === "planner") return "#7c9eff";
  if (t === "executor") return "#fbbf24";
  if (t === "analyzer") return "#34d399";
  if (t === "refiner") return "#a78bfa";
  if (t === "dftagent") return "#c9d8ff";
  if (t === "info_query" || t === "info-query") return "#67e8f9";
  return "#9fa5b9";
}

export function AgentActivityPanel({ conversation, isStreaming, onClose }: Props) {
  const { t } = useTranslation();
  const steps = useMemo(() => parseSteps(conversation), [conversation]);
  const hasError = steps.some((s) => s.isError);
  const lastIdx = steps.length - 1;

  return (
    <aside
      className="hidden lg:flex w-72 shrink-0 flex-col border-l"
      style={{ background: "var(--bg-1)", borderColor: "var(--border)" }}
    >
      <header
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <ActivityIcon size={15} style={{ color: "var(--blue-500)" }} />
          <span
            className="text-sm"
            style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.05em", color: "var(--fg)" }}
          >
            {t("activity")}
          </span>
          {steps.length > 0 && (
            <span
              className="ml-1 text-[11px] px-1.5 py-0.5 rounded-md"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--fg-mute)",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border)",
              }}
            >
              {steps.length}
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md transition"
            style={{ color: "var(--fg-dim)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-dim)")}
            title="Hide panel"
          >
            <XIcon size={14} />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-3">
        {steps.length === 0 ? (
          <div
            className="text-center text-xs py-10 px-4"
            style={{ color: "var(--fg-dim)" }}
          >
            {t("noActivityYet")}
          </div>
        ) : (
          <ol className="relative">
            {/* Vertical connector line */}
            <span
              className="absolute left-[10px] top-2 bottom-2 w-px"
              style={{ background: "var(--border)" }}
              aria-hidden="true"
            />
            {steps.map((s, i) => {
              const isLastStreaming = isStreaming && i === lastIdx && !s.isError;
              return (
                <li key={i} className="relative pl-8 pr-1 pb-3 last:pb-0">
                  <span
                    className="absolute left-[3px] top-[3px] w-[15px] h-[15px] rounded-full flex items-center justify-center"
                    style={{
                      background: "var(--bg-1)",
                      border: `2px solid ${tagColor(s.tag)}`,
                      boxShadow: isLastStreaming
                        ? `0 0 0 4px ${tagColor(s.tag)}33`
                        : "none",
                      animation: isLastStreaming ? "pulse-live 1.4s ease-in-out infinite" : undefined,
                    }}
                  >
                    {s.isError ? (
                      <AlertTriangleIcon size={9} style={{ color: tagColor(s.tag) }} />
                    ) : (
                      <CircleIcon size={5} style={{ color: tagColor(s.tag), fill: tagColor(s.tag) }} />
                    )}
                  </span>
                  <div
                    className="text-[11px] font-medium mb-0.5"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: tagColor(s.tag),
                      letterSpacing: "0.02em",
                    }}
                  >
                    {s.tag}
                  </div>
                  <div
                    className="text-[12px] leading-snug truncate"
                    style={{ color: s.isError ? "#fca5a5" : "var(--fg-mute)" }}
                    title={s.body}
                  >
                    {s.body || "—"}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <footer
        className="p-3 border-t text-[11px] flex items-center justify-between"
        style={{ borderColor: "var(--border)", color: "var(--fg-dim)", fontFamily: "var(--font-mono)" }}
      >
        <span>
          {isStreaming ? (
            <span style={{ color: "#10b981" }}>● {t("running")}</span>
          ) : hasError ? (
            <span style={{ color: "#ef4444" }}>● {t("failed")}</span>
          ) : steps.length > 0 ? (
            <span style={{ color: "var(--blue-500)" }}>● {t("complete")}</span>
          ) : (
            <span>— {t("idle")}</span>
          )}
        </span>
        <span>{steps.length} {steps.length === 1 ? t("stepSingular") : t("stepPlural")}</span>
      </footer>
    </aside>
  );
}
