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

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    let convId = activeId;
    if (!convId) {
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
      content: input.trim(),
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
              title: c.title || userMsg.content.slice(0, 40),
              messages: [...c.messages, userMsg, assistantMsg],
              updatedAt: Date.now(),
            }
          : c,
      ),
    );
    setInput("");
    setIsStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const baseMsgs: Message[] = [...(active?.messages ?? []), userMsg];

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
      onDone: () => {
        setIsStreaming(false);
      },
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
  }, [input, activeId, active, backendUrl]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const toggleLang = useCallback(() => {
    const next: Lang = lang === "en" ? "zh" : "en";
    setLang(next);
    saveLang(next);
    i18n.changeLanguage(next);
  }, [lang, i18n]);

  if (!hydrated) {
    return <div className="h-screen w-screen" />;
  }

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
        <TopBar lang={lang} onToggleLang={toggleLang} onOpenSettings={() => setSettingsOpen(true)} />
        <ChatMessages messages={active?.messages ?? []} isStreaming={isStreaming} />
        <div className="px-4 py-3 max-w-3xl w-full mx-auto">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={sendMessage}
            onStop={stopStreaming}
            isStreaming={isStreaming}
          />
          <div className="text-center text-xs text-[var(--muted)] mt-1.5">
            ⌘/Ctrl + Enter to send
          </div>
        </div>
      </main>
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
