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

import { Conversation, Lang, Message } from "@/lib/types";
import {
  loadConversations,
  saveConversations,
  loadLang,
  saveLang,
  loadBackendUrl,
  saveBackendUrl,
} from "@/lib/storage";
import { streamChat } from "@/lib/api";
import { conversationToMarkdown, downloadMarkdown, copyMarkdown } from "@/lib/export";

export default function Page() {
  const { i18n } = useTranslation();
  const [hydrated, setHydrated] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [backendUrl, setBackendUrl] = useState<string>("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const convs = loadConversations();
    setConversations(convs);
    setActiveId(convs[0]?.id ?? null);
    const lng = loadLang();
    setLang(lng);
    i18n.changeLanguage(lng);
    setBackendUrl(loadBackendUrl());
    setHydrated(true);
  }, [i18n]);

  useEffect(() => {
    if (hydrated) saveConversations(conversations);
  }, [conversations, hydrated]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

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

  // Core send: accepts an explicit prompt (used by EmptyState chips) and
  // falls back to the live input.
  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text) return;

      let convId = activeId;
      let baseHistory: Message[] = active?.messages ?? [];

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
        baseHistory = [];
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

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const baseMsgs: Message[] = [...baseHistory, userMsg];

      await streamChat(backendUrl, baseMsgs, ctrl.signal, {
        onDelta: (delta) => {
          setConversations((cs) =>
            cs.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    messages: c.messages.map((m, i) =>
                      i === c.messages.length - 1 ? { ...m, content: m.content + delta } : m,
                    ),
                  }
                : c,
            ),
          );
        },
        onDone: () => setIsStreaming(false),
        onError: (err) => {
          setConversations((cs) =>
            cs.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    messages: c.messages.map((m, i) =>
                      i === c.messages.length - 1
                        ? { ...m, content: m.content + `\n\n**Error:** ${err.message}` }
                        : m,
                    ),
                  }
                : c,
            ),
          );
          setIsStreaming(false);
        },
      });
    },
    [input, activeId, active, backendUrl],
  );

  const stopStreaming = useCallback(() => abortRef.current?.abort(), []);

  const toggleLang = useCallback(() => {
    const next: Lang = lang === "en" ? "zh" : "en";
    setLang(next);
    saveLang(next);
    i18n.changeLanguage(next);
  }, [lang, i18n]);

  if (!hydrated) {
    return <div className="h-screen w-screen" />;
  }

  const showEmpty = !active || active.messages.length === 0;

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={newChat}
        onDelete={deleteConv}
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
          />
        )}
        <div className="px-4 py-3 max-w-3xl w-full mx-auto">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => sendMessage()}
            onStop={stopStreaming}
            isStreaming={isStreaming}
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
        <AgentActivityPanel
          conversation={active}
          isStreaming={isStreaming}
          onClose={() => setPanelOpen(false)}
        />
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
    </div>
  );
}
