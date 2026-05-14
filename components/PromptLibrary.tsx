"use client";

import { useEffect, useRef, useState } from "react";
import { XIcon, PlusIcon, TrashIcon, EditIcon, CheckIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { nanoid } from "nanoid";
import { PromptTemplate } from "@/lib/types";

interface Props {
  open: boolean;
  prompts: PromptTemplate[];
  onClose: () => void;
  onPick: (content: string) => void;
  onChange: (next: PromptTemplate[]) => void;
}

export function PromptLibrary({ open, prompts, onClose, onPick, onChange }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
    if (!open) {
      setQuery("");
      setEditingId(null);
      setCreating(false);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const filtered = prompts.filter(
    (p) =>
      !query.trim() ||
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.content.toLowerCase().includes(query.toLowerCase()),
  );

  function startEdit(p: PromptTemplate) {
    setEditingId(p.id);
    setDraftTitle(p.title);
    setDraftContent(p.content);
  }

  function startCreate() {
    setCreating(true);
    setEditingId("__new__");
    setDraftTitle("");
    setDraftContent("");
  }

  function commit() {
    if (!draftTitle.trim() || !draftContent.trim()) return;
    if (editingId === "__new__") {
      const fresh: PromptTemplate = {
        id: nanoid(8),
        title: draftTitle.trim(),
        content: draftContent.trim(),
        createdAt: Date.now(),
      };
      onChange([fresh, ...prompts]);
    } else if (editingId) {
      onChange(
        prompts.map((p) =>
          p.id === editingId ? { ...p, title: draftTitle.trim(), content: draftContent.trim() } : p,
        ),
      );
    }
    setEditingId(null);
    setCreating(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setCreating(false);
  }

  function removePrompt(id: string) {
    if (!confirm(t("confirmDeletePrompt"))) return;
    onChange(prompts.filter((p) => p.id !== id));
    if (editingId === id) setEditingId(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 anim-slide-in"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl flex flex-col"
        style={{
          background: "var(--bg-1)",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          maxHeight: "min(78vh, 720px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <h2
              className="italic"
              style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500 }}
            >
              {t("promptLibrary")}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--fg-mute)" }}>
              {t("promptLibraryHint")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition"
            style={{ color: "var(--fg-dim)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <XIcon size={16} />
          </button>
        </header>

        <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPrompts")}
            className="flex-1 px-3 py-2 rounded-lg outline-none text-sm"
            style={{
              background: "var(--bg-0)",
              border: "1px solid var(--border)",
              color: "var(--fg)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(69, 119, 255, 0.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
          <button
            onClick={startCreate}
            disabled={creating}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-white"
            style={{
              background: "var(--grad-primary)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.1) inset",
              opacity: creating ? 0.5 : 1,
            }}
          >
            <PlusIcon size={14} />
            {t("newPrompt")}
          </button>
        </div>

        <div className="overflow-y-auto p-3 flex-1">
          {creating && (
            <PromptEditor
              title={draftTitle}
              content={draftContent}
              onTitle={setDraftTitle}
              onContent={setDraftContent}
              onSave={commit}
              onCancel={cancelEdit}
            />
          )}
          {filtered.length === 0 && !creating ? (
            <div className="text-center py-12 text-sm" style={{ color: "var(--fg-dim)" }}>
              {query ? t("noPromptsMatch") : t("noPrompts")}
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((p) =>
                editingId === p.id ? (
                  <li key={p.id}>
                    <PromptEditor
                      title={draftTitle}
                      content={draftContent}
                      onTitle={setDraftTitle}
                      onContent={setDraftContent}
                      onSave={commit}
                      onCancel={cancelEdit}
                    />
                  </li>
                ) : (
                  <li
                    key={p.id}
                    className="group rounded-lg p-3 cursor-pointer transition"
                    style={{
                      background: "var(--bg-0)",
                      border: "1px solid var(--border)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(69, 119, 255, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                    }}
                    onClick={() => {
                      onPick(p.content);
                      onClose();
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm mb-1" style={{ color: "var(--fg)" }}>
                          {p.title}
                        </div>
                        <div className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--fg-mute)" }}>
                          {p.content}
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(p);
                          }}
                          className="p-1 rounded transition"
                          style={{ color: "var(--fg-dim)" }}
                          title={t("edit")}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-dim)")}
                        >
                          <EditIcon size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removePrompt(p.id);
                          }}
                          className="p-1 rounded transition"
                          style={{ color: "var(--fg-dim)" }}
                          title={t("delete")}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-dim)")}
                        >
                          <TrashIcon size={13} />
                        </button>
                      </div>
                    </div>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>

        <footer
          className="px-5 py-3 text-xs border-t flex items-center justify-between"
          style={{ borderColor: "var(--border)", color: "var(--fg-dim)", fontFamily: "var(--font-mono)" }}
        >
          <span>{prompts.length} {t("promptsTotal")}</span>
          <span>{t("clickToInsert")}</span>
        </footer>
      </div>
    </div>
  );
}

function PromptEditor({
  title,
  content,
  onTitle,
  onContent,
  onSave,
  onCancel,
}: {
  title: string;
  content: string;
  onTitle: (v: string) => void;
  onContent: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="rounded-lg p-3 mb-2"
      style={{
        background: "var(--bg-0)",
        border: "1px solid rgba(69, 119, 255, 0.4)",
      }}
    >
      <input
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        placeholder={t("promptTitlePlaceholder")}
        autoFocus
        className="w-full text-sm px-2 py-1.5 rounded mb-2 outline-none"
        style={{
          background: "var(--bg-1)",
          border: "1px solid var(--border)",
          color: "var(--fg)",
        }}
      />
      <textarea
        value={content}
        onChange={(e) => onContent(e.target.value)}
        placeholder={t("promptContentPlaceholder")}
        rows={4}
        className="w-full text-xs px-2 py-1.5 rounded resize-none outline-none"
        style={{
          background: "var(--bg-1)",
          border: "1px solid var(--border)",
          color: "var(--fg)",
          fontFamily: "var(--font-mono)",
          lineHeight: 1.5,
        }}
      />
      <div className="flex justify-end gap-2 mt-2">
        <button
          onClick={onCancel}
          className="px-3 py-1 rounded text-xs"
          style={{ color: "var(--fg-mute)" }}
        >
          {t("cancel")}
        </button>
        <button
          onClick={onSave}
          disabled={!title.trim() || !content.trim()}
          className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs text-white"
          style={{
            background: "var(--grad-primary)",
            opacity: !title.trim() || !content.trim() ? 0.5 : 1,
          }}
        >
          <CheckIcon size={12} />
          {t("save")}
        </button>
      </div>
    </div>
  );
}
