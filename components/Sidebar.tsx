"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PlusIcon,
  TrashIcon,
  MessageSquareIcon,
  SearchIcon,
  FolderIcon,
  FolderPlusIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  EditIcon,
  CheckIcon,
  XIcon,
  BookOpenIcon,
  MoreHorizontalIcon,
  CpuIcon,
  FileCodeIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Conversation, Folder } from "@/lib/types";
import { MODELS } from "@/lib/models";
import { cn } from "@/lib/utils";

interface Props {
  conversations: Conversation[];
  folders: Folder[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onMoveToFolder: (id: string, folderId: string | null) => void;
  onNewFolder: () => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onToggleFolder: (id: string) => void;
  onOpenPrompts: () => void;
  // Per-conversation model + execution mode.
  model: string;
  onModelChange: (m: string) => void;
  scriptOnly: boolean;
  onToggleScriptOnly: () => void;
  canUseCpu: boolean;
  controlsDisabled: boolean;
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

function matchConv(c: Conversation, q: string): boolean {
  const needle = q.toLowerCase();
  if (c.title.toLowerCase().includes(needle)) return true;
  for (const m of c.messages) {
    if (m.content.toLowerCase().includes(needle)) return true;
  }
  return false;
}

export function Sidebar(props: Props) {
  const {
    conversations,
    folders,
    activeId,
    onSelect,
    onNew,
    onDelete,
    onRename,
    onMoveToFolder,
    onNewFolder,
    onRenameFolder,
    onDeleteFolder,
    onToggleFolder,
    onOpenPrompts,
    model,
    onModelChange,
    scriptOnly,
    onToggleScriptOnly,
    canUseCpu,
    controlsDisabled,
  } = props;
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const cpuOn = canUseCpu && !scriptOnly;

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    return conversations.filter((c) => matchConv(c, query));
  }, [conversations, query]);

  // Group filtered conversations by folder
  const looseChats = filtered.filter((c) => !c.folderId);
  const folderMap = new Map<string, Conversation[]>();
  folders.forEach((f) => folderMap.set(f.id, []));
  filtered.forEach((c) => {
    if (c.folderId && folderMap.has(c.folderId)) {
      folderMap.get(c.folderId)!.push(c);
    }
  });

  return (
    <aside
      className="w-64 shrink-0 flex flex-col border-r"
      style={{ background: "var(--bg-1)", borderColor: "var(--border)" }}
    >
      {/* Action buttons */}
      <div className="p-3 border-b flex flex-col gap-2" style={{ borderColor: "var(--border)" }}>
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
        <div className="grid grid-cols-2 gap-2">
          <SecondaryButton onClick={onNewFolder} icon={<FolderPlusIcon size={13} />} label={t("newFolder")} />
          <SecondaryButton onClick={onOpenPrompts} icon={<BookOpenIcon size={13} />} label={t("prompts")} />
        </div>
      </div>

      {/* Model + run mode (per conversation) — one row */}
      <div className="px-3 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
        <div className="relative flex-1 min-w-0">
          <select
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={controlsDisabled}
            className="w-full appearance-none rounded-lg pl-2.5 pr-7 py-1.5 outline-none cursor-pointer truncate"
            style={{
              background: "var(--bg-0)",
              color: "var(--fg)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            size={14}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: "var(--fg-dim)",
            }}
          />
        </div>
        {canUseCpu ? (
          <button
            type="button"
            onClick={onToggleScriptOnly}
            disabled={controlsDisabled}
            title={cpuOn
              ? "CPU run: executes the DFT calculation"
              : "Script-only: generates the inputs without running them"}
            className="shrink-0 whitespace-nowrap flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition"
            style={{
              border: "1px solid var(--border)",
              background: cpuOn ? "rgba(34,197,94,0.12)" : "var(--bg-0)",
              color: cpuOn ? "#22c55e" : "var(--fg-mute)",
              fontWeight: 600,
              cursor: controlsDisabled ? "not-allowed" : "pointer",
            }}
          >
            {cpuOn ? <CpuIcon size={13} /> : <FileCodeIcon size={13} />}
            {cpuOn ? "CPU" : "Script"}
          </button>
        ) : (
          <span
            title="Your account generates input scripts only. Running on CPU requires an admin."
            className="shrink-0 whitespace-nowrap flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs"
            style={{
              border: "1px solid var(--border)",
              background: "var(--bg-0)",
              color: "var(--fg-dim)",
              fontWeight: 600,
            }}
          >
            <FileCodeIcon size={13} />
            Script
          </span>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        <div
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
          style={{ background: "var(--bg-0)", border: "1px solid var(--border)" }}
        >
          <SearchIcon size={13} style={{ color: "var(--fg-dim)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchChats")}
            className="flex-1 bg-transparent outline-none text-sm min-w-0"
            style={{ color: "var(--fg)" }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="rounded p-0.5"
              style={{ color: "var(--fg-dim)" }}
              title={t("clear")}
            >
              <XIcon size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 && conversations.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <div className="text-center text-xs py-8 px-4" style={{ color: "var(--fg-dim)" }}>
            {t("noMatch")}
          </div>
        ) : (
          <>
            {/* Folders with their chats */}
            {folders.map((folder) => {
              const chats = folderMap.get(folder.id) || [];
              if (query && chats.length === 0) return null; // hide empty folders during search
              return (
                <FolderRow
                  key={folder.id}
                  folder={folder}
                  chats={chats}
                  activeId={activeId}
                  folders={folders}
                  i18nLang={i18n.language}
                  onToggle={() => onToggleFolder(folder.id)}
                  onRename={(name) => onRenameFolder(folder.id, name)}
                  onDelete={() => onDeleteFolder(folder.id)}
                  onSelect={onSelect}
                  onDeleteChat={onDelete}
                  onRenameChat={onRename}
                  onMoveChat={onMoveToFolder}
                />
              );
            })}

            {/* Loose (no-folder) chats */}
            {looseChats.length > 0 && (
              <div className={folders.length > 0 ? "mt-1" : ""}>
                {folders.length > 0 && (
                  <div
                    className="px-3 pt-2 pb-1 text-[10px] font-medium tracking-wider uppercase"
                    style={{ color: "var(--fg-dim)", fontFamily: "var(--font-mono)" }}
                  >
                    {t("ungrouped")}
                  </div>
                )}
                {looseChats.map((c) => (
                  <ChatItem
                    key={c.id}
                    chat={c}
                    active={c.id === activeId}
                    folders={folders}
                    i18nLang={i18n.language}
                    onSelect={() => onSelect(c.id)}
                    onDelete={() => onDelete(c.id)}
                    onRename={(name) => onRename(c.id, name)}
                    onMove={(fid) => onMoveToFolder(c.id, fid)}
                  />
                ))}
              </div>
            )}
          </>
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

function SecondaryButton({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--border)",
        color: "var(--fg-mute)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
        e.currentTarget.style.color = "var(--fg)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        e.currentTarget.style.color = "var(--fg-mute)";
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center text-center py-10 px-4" style={{ color: "var(--fg-dim)" }}>
      <MessageSquareIcon size={28} opacity={0.5} />
      <div className="text-sm mt-3">{t("noConversations")}</div>
    </div>
  );
}

function FolderRow({
  folder,
  chats,
  activeId,
  folders,
  i18nLang,
  onToggle,
  onRename,
  onDelete,
  onSelect,
  onDeleteChat,
  onRenameChat,
  onMoveChat,
}: {
  folder: Folder;
  chats: Conversation[];
  activeId: string | null;
  folders: Folder[];
  i18nLang: string;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onSelect: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, name: string) => void;
  onMoveChat: (id: string, folderId: string | null) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(folder.name);
  const expanded = folder.expanded !== false;

  function commit() {
    if (draft.trim() && draft.trim() !== folder.name) onRename(draft.trim());
    setEditing(false);
  }

  return (
    <div className="mb-1">
      <div
        className="group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition"
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        onClick={onToggle}
      >
        {expanded ? <ChevronDownIcon size={13} className="opacity-60" /> : <ChevronRightIcon size={13} className="opacity-60" />}
        <FolderIcon size={13} style={{ color: "var(--amber-500, #f59e0b)" }} />
        {editing ? (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setDraft(folder.name); setEditing(false); }
            }}
            onBlur={commit}
            autoFocus
            className="flex-1 bg-transparent outline-none text-sm min-w-0 px-1"
            style={{ color: "var(--fg)", borderBottom: "1px solid rgba(69, 119, 255, 0.5)" }}
          />
        ) : (
          <span
            className="flex-1 truncate text-sm font-medium"
            style={{ color: "var(--fg-mute)", letterSpacing: "0.02em" }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(true);
              setDraft(folder.name);
            }}
          >
            {folder.name}
          </span>
        )}
        <span className="text-[10px]" style={{ color: "var(--fg-dim)", fontFamily: "var(--font-mono)" }}>
          {chats.length}
        </span>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <IconBtn
            onClick={() => { setEditing(true); setDraft(folder.name); }}
            title={t("rename")}
            danger={false}
          ><EditIcon size={11} /></IconBtn>
          <IconBtn
            onClick={() => {
              if (chats.length > 0) {
                if (!confirm(t("confirmDeleteFolder"))) return;
              }
              onDelete();
            }}
            title={t("delete")}
            danger
          ><TrashIcon size={11} /></IconBtn>
        </div>
      </div>

      {expanded && (
        <div className="ml-3">
          {chats.length === 0 && (
            <div className="text-[11px] px-3 py-1" style={{ color: "var(--fg-dim)" }}>
              {t("emptyFolder")}
            </div>
          )}
          {chats.map((c) => (
            <ChatItem
              key={c.id}
              chat={c}
              active={c.id === activeId}
              folders={folders}
              i18nLang={i18nLang}
              onSelect={() => onSelect(c.id)}
              onDelete={() => onDeleteChat(c.id)}
              onRename={(name) => onRenameChat(c.id, name)}
              onMove={(fid) => onMoveChat(c.id, fid)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChatItem({
  chat,
  active,
  folders,
  i18nLang,
  onSelect,
  onDelete,
  onRename,
  onMove,
}: {
  chat: Conversation;
  active: boolean;
  folders: Folder[];
  i18nLang: string;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onMove: (folderId: string | null) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chat.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  function commit() {
    if (draft.trim() && draft.trim() !== chat.title) onRename(draft.trim());
    setEditing(false);
  }

  return (
    <div
      className={cn("group px-2.5 py-2 rounded-lg cursor-pointer flex items-start gap-2 transition mb-0.5")}
      style={{
        background: active ? "rgba(69, 119, 255, 0.12)" : "transparent",
        borderLeft: active ? "2px solid var(--blue-500)" : "2px solid transparent",
        paddingLeft: active ? "8px" : "10px",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
      onClick={() => !editing && onSelect()}
    >
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setDraft(chat.title); setEditing(false); }
            }}
            onBlur={commit}
            autoFocus
            className="w-full bg-transparent outline-none text-sm px-0.5"
            style={{ color: "var(--fg)", borderBottom: "1px solid rgba(69, 119, 255, 0.5)" }}
          />
        ) : (
          <div
            className="truncate text-sm"
            style={{ color: active ? "var(--fg)" : "var(--fg-mute)" }}
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); setDraft(chat.title); }}
            title={t("doubleClickRename")}
          >
            {chat.title || "(untitled)"}
          </div>
        )}
        <div className="text-[11px] mt-0.5" style={{ color: "var(--fg-dim)", fontFamily: "var(--font-mono)" }}>
          {relativeTime(chat.updatedAt, i18nLang)}
        </div>
      </div>

      <div
        ref={menuRef}
        className="relative opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setMenuOpen((x) => !x)}
          className="p-1 rounded"
          style={{ color: "var(--fg-dim)" }}
          title={t("more")}
        >
          <MoreHorizontalIcon size={13} />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1 rounded-lg py-1"
            style={{
              zIndex: 30,
              background: "var(--bg-1)",
              border: "1px solid var(--border-strong)",
              boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
              minWidth: 170,
            }}
          >
            <MenuRow onClick={() => { setEditing(true); setDraft(chat.title); setMenuOpen(false); }} icon={<EditIcon size={12} />} label={t("rename")} />
            <div style={{ height: 1, background: "var(--border)", margin: "4px 8px" }} />
            <div className="px-3 py-1 text-[10px] uppercase tracking-wider" style={{ color: "var(--fg-dim)", fontFamily: "var(--font-mono)" }}>
              {t("moveTo")}
            </div>
            <MenuRow
              onClick={() => { onMove(null); setMenuOpen(false); }}
              icon={<XIcon size={12} />}
              label={t("noneFolder")}
              checked={!chat.folderId}
            />
            {folders.map((f) => (
              <MenuRow
                key={f.id}
                onClick={() => { onMove(f.id); setMenuOpen(false); }}
                icon={<FolderIcon size={12} />}
                label={f.name}
                checked={chat.folderId === f.id}
              />
            ))}
            <div style={{ height: 1, background: "var(--border)", margin: "4px 8px" }} />
            <MenuRow
              onClick={() => {
                setMenuOpen(false);
                if (confirm(t("confirmDelete"))) onDelete();
              }}
              icon={<TrashIcon size={12} />}
              label={t("delete")}
              danger
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MenuRow({
  onClick,
  icon,
  label,
  danger,
  checked,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  checked?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition"
      style={{ color: danger ? "#fca5a5" : "var(--fg)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = danger ? "rgba(239, 68, 68, 0.08)" : "rgba(255,255,255,0.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ color: danger ? "#ef4444" : "var(--fg-mute)" }}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {checked && <CheckIcon size={11} style={{ color: "var(--blue-500)" }} />}
    </button>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      className="p-0.5 rounded transition"
      style={{ color: "var(--fg-dim)" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = danger ? "#ef4444" : "var(--fg)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-dim)")}
    >
      {children}
    </button>
  );
}
