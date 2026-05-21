"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";

import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessages } from "@/components/ChatMessages";
import { SettingsDialog } from "@/components/SettingsDialog";
import { EmptyState } from "@/components/EmptyState";
import { AgentActivityPanel } from "@/components/AgentActivityPanel";
import { PromptLibrary } from "@/components/PromptLibrary";

import { Conversation, Folder, Lang, Message, PromptTemplate } from "@/lib/types";
import {
  loadConversations,
  saveConversations,
  loadLang,
  saveLang,
  loadBackendUrl,
  saveBackendUrl,
  loadFolders,
  saveFolders,
  loadPrompts,
  savePrompts,
} from "@/lib/storage";
import { runJob, JobHandle } from "@/lib/api";
import { downloadMarkdown, copyMarkdown } from "@/lib/export";
import { useAuth } from "@/lib/auth-context";
import { LoginGate } from "@/components/LoginGate";
import { fromThrown, tr } from "@/lib/errors";

const ACTIVITY_WIDTH_KEY = "tritondft.activityWidth.v1";
const ACTIVITY_MIN = 260;
const ACTIVITY_MAX = 640;
const ACTIVITY_DEFAULT = 320;

export default function Page() {
  const { i18n } = useTranslation();
  const auth = useAuth();
  const [hydrated, setHydrated] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [backendUrl, setBackendUrl] = useState<string>("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [activityWidth, setActivityWidth] = useState<number>(ACTIVITY_DEFAULT);

  const jobRef = useRef<JobHandle | null>(null);

  // Hydrate
  useEffect(() => {
    const convs = loadConversations();
    setConversations(convs);
    setActiveId(convs[0]?.id ?? null);
    setFolders(loadFolders());
    setPrompts(loadPrompts());
    const lng = loadLang();
    setLang(lng);
    i18n.changeLanguage(lng);
    setBackendUrl(loadBackendUrl());
    if (typeof window !== "undefined") {
      const w = parseInt(localStorage.getItem(ACTIVITY_WIDTH_KEY) || "", 10);
      if (!Number.isNaN(w) && w >= ACTIVITY_MIN && w <= ACTIVITY_MAX) setActivityWidth(w);
    }
    setHydrated(true);
  }, [i18n]);

  useEffect(() => {
    if (hydrated) saveConversations(conversations);
  }, [conversations, hydrated]);
  useEffect(() => {
    if (hydrated) saveFolders(folders);
  }, [folders, hydrated]);
  useEffect(() => {
    if (hydrated) savePrompts(prompts);
  }, [prompts, hydrated]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  // ─── Conversation actions ───
  const newChat = useCallback(() => {
    const id = nanoid(10);
    const fresh: Conversation = {
      id,
      title: "",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations((cs) => [fresh, ...cs]);
    setActiveId(id);
  }, []);

  const deleteConv = useCallback(
    (id: string) => {
      setConversations((cs) => {
        const next = cs.filter((c) => c.id !== id);
        if (id === activeId) setActiveId(next[0]?.id ?? null);
        return next;
      });
    },
    [activeId],
  );

  const renameConv = useCallback((id: string, newTitle: string) => {
    setConversations((cs) =>
      cs.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c)),
    );
  }, []);

  const moveConvToFolder = useCallback((id: string, folderId: string | null) => {
    setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, folderId } : c)));
  }, []);

  // ─── Folder actions ───
  const newFolder = useCallback(() => {
    const id = nanoid(8);
    setFolders((fs) => [
      { id, name: "New folder", createdAt: Date.now(), expanded: true },
      ...fs,
    ]);
  }, []);

  const renameFolder = useCallback((id: string, name: string) => {
    setFolders((fs) => fs.map((f) => (f.id === id ? { ...f, name } : f)));
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setFolders((fs) => fs.filter((f) => f.id !== id));
    setConversations((cs) =>
      cs.map((c) => (c.folderId === id ? { ...c, folderId: null } : c)),
    );
  }, []);

  const toggleFolder = useCallback((id: string) => {
    setFolders((fs) => fs.map((f) => (f.id === id ? { ...f, expanded: f.expanded === false } : f)));
  }, []);

  // ─── Send ───
  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text) return;

      let convId = activeId;

      if (!convId || (overrideText && (active?.messages.length ?? 0) === 0 && active === null)) {
        const id = nanoid(10);
        const fresh: Conversation = {
          id,
          title: "",
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setConversations((cs) => [fresh, ...cs]);
        setActiveId(id);
        convId = id;
      }

      const userMsg: Message = {
        id: nanoid(8),
        role: "user",
        content: text,
        createdAt: Date.now(),
      };
      const assistantMsg: Message = {
        id: nanoid(8),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      };

      setConversations((cs) =>
        cs.map((c) =>
          c.id === convId
            ? {
                ...c,
                title: c.title || text.slice(0, 40),
                messages: [...c.messages, userMsg, assistantMsg],
                updatedAt: Date.now(),
              }
            : c,
        ),
      );
      if (!overrideText) setInput("");
      setIsStreaming(true);

      // Backend's extract_user_message only uses the latest user msg; sending
      // history bloats the payload and trips the 2M conversation-size cap when
      // a prior assistant turn contained large logs (e.g. MPI dumps).
      const baseMsgs: Message[] = [userMsg];

      // Replace the trailing assistant message's content wholesale (job output
      // is cumulative — each poll returns the full text so far).
      const setAssistant = (content: string) =>
        setConversations((cs) =>
          cs.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m, i) =>
                    i === c.messages.length - 1 ? { ...m, content } : m,
                  ),
                }
              : c,
          ),
        );

      jobRef.current = runJob(backendUrl, baseMsgs, {
        onQueue: (pos) => {
          setAssistant(
            pos === 0
              ? "⏳ Starting…"
              : `⏳ Queued — ${pos} job${pos === 1 ? "" : "s"} ahead of you`,
          );
        },
        onUpdate: (output) => {
          setAssistant(output);
        },
        onDone: () => {
          setIsStreaming(false);
          jobRef.current = null;
          // Refresh credits after each completed run
          auth.refresh();
        },
        onError: (err) => {
          const human = tr(fromThrown(err));
          setAssistant(`> ⚠️ ${human}`);
          setIsStreaming(false);
          jobRef.current = null;
        },
        onApiError: (parsed) => {
          // 401/403 means session is gone — sign out so the LoginGate appears.
          if (parsed.status === 401 || parsed.status === 403) {
            auth.signOut();
          }
          // Always refresh credits — the failed request may have caused a deduction
          // refund or revealed a balance change.
          auth.refresh();
        },
      });
    },
    [input, activeId, active, backendUrl, auth],
  );

  // Regenerate: drop the trailing assistant msg (and trailing user-only artifacts)
  // and re-send the last user message.
  const regenerate = useCallback(
    (prompt: string) => {
      if (!active) return sendMessage(prompt);
      const msgs = [...active.messages];
      // Pop the trailing assistant; pop the corresponding user before it.
      if (msgs.length && msgs[msgs.length - 1].role === "assistant") msgs.pop();
      if (msgs.length && msgs[msgs.length - 1].role === "user") msgs.pop();
      setConversations((cs) =>
        cs.map((c) => (c.id === active.id ? { ...c, messages: msgs } : c)),
      );
      // Defer to next tick so the state update lands before sendMessage reads `active.messages`.
      setTimeout(() => sendMessage(prompt), 0);
    },
    [active, sendMessage],
  );

  const stopStreaming = useCallback(() => jobRef.current?.cancel(), []);

  const toggleLang = useCallback(() => {
    const next: Lang = lang === "en" ? "zh" : "en";
    setLang(next);
    saveLang(next);
    i18n.changeLanguage(next);
  }, [lang, i18n]);

  // ─── Activity panel resize ───
  const resizingRef = useRef<{ active: boolean; startX: number; startW: number }>({
    active: false,
    startX: 0,
    startW: 0,
  });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!resizingRef.current.active) return;
      const delta = resizingRef.current.startX - e.clientX;
      const next = Math.max(
        ACTIVITY_MIN,
        Math.min(ACTIVITY_MAX, resizingRef.current.startW + delta),
      );
      setActivityWidth(next);
    }
    function onUp() {
      if (!resizingRef.current.active) return;
      resizingRef.current.active = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try {
        localStorage.setItem(ACTIVITY_WIDTH_KEY, String(activityWidth));
      } catch {}
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [activityWidth]);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizingRef.current = { active: true, startX: e.clientX, startW: activityWidth };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [activityWidth],
  );

  if (!hydrated) return <div className="h-screen w-screen" />;

  // Auth gate: while we're checking /auth/me, show nothing; if not signed in,
  // overlay the login modal (the chat UI stays mounted underneath so layout
  // doesn't jump after sign-in).
  const needsLogin = !auth.loading && !auth.signedIn;

  const showEmpty = !active || active.messages.length === 0;

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {needsLogin && <LoginGate />}
      <Sidebar
        conversations={conversations}
        folders={folders}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={newChat}
        onDelete={deleteConv}
        onRename={renameConv}
        onMoveToFolder={moveConvToFolder}
        onNewFolder={newFolder}
        onRenameFolder={renameFolder}
        onDeleteFolder={deleteFolder}
        onToggleFolder={toggleFolder}
        onOpenPrompts={() => setPromptsOpen(true)}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <TopBar
          lang={lang}
          onToggleLang={toggleLang}
          onOpenSettings={() => setSettingsOpen(true)}
          hasConversation={!!active && active.messages.length > 0}
          panelOpen={panelOpen}
          onTogglePanel={() => setPanelOpen((x) => !x)}
          onExport={() => { if (active) downloadMarkdown(active); }}
          onCopy={async () => { if (active) await copyMarkdown(active); }}
        />
        {showEmpty ? (
          <EmptyState onPrompt={(text) => sendMessage(text)} />
        ) : (
          <ChatMessages
            messages={active!.messages}
            isStreaming={isStreaming}
            onRetry={(prompt) => sendMessage(prompt)}
            onRegenerate={(prompt) => regenerate(prompt)}
          />
        )}
        <div className="px-4 py-3 max-w-3xl w-full mx-auto">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => sendMessage()}
            onStop={stopStreaming}
            isStreaming={isStreaming}
            lastUserMessage={
              [...(active?.messages ?? [])].reverse().find((m) => m.role === "user")?.content
            }
          />
          <div
            className="text-center text-xs mt-1.5"
            style={{ color: "var(--fg-dim)", fontFamily: "var(--font-mono)" }}
          >
            ⌘/Ctrl + Enter to send
          </div>
        </div>
      </main>
      {panelOpen && (
        <>
          {/* Drag handle */}
          <div
            onMouseDown={startResize}
            className="hidden lg:block resize-handle"
            title="Drag to resize"
            aria-label="Resize activity panel"
          />
          <div style={{ width: activityWidth }} className="hidden lg:flex shrink-0">
            <AgentActivityPanel
              conversation={active}
              isStreaming={isStreaming}
              onClose={() => setPanelOpen(false)}
            />
          </div>
        </>
      )}
      <SettingsDialog
        open={settingsOpen}
        backendUrl={backendUrl}
        onClose={() => setSettingsOpen(false)}
        onSave={(url) => {
          setBackendUrl(url);
          saveBackendUrl(url);
          setSettingsOpen(false);
        }}
      />
      <PromptLibrary
        open={promptsOpen}
        prompts={prompts}
        onClose={() => setPromptsOpen(false)}
        onPick={(text) => setInput(text)}
        onChange={setPrompts}
      />
    </div>
  );
}
