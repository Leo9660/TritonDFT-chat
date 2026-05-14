import { Conversation, Lang } from "./types";

const CONV_KEY = "tritondft.conversations.v1";
const LANG_KEY = "tritondft.lang.v1";
const BACKEND_KEY = "tritondft.backendUrl.v1";

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadConversations(): Conversation[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(CONV_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]) {
  if (!isBrowser()) return;
  localStorage.setItem(CONV_KEY, JSON.stringify(conversations));
}

export function loadLang(): Lang {
  if (!isBrowser()) return "en";
  const v = localStorage.getItem(LANG_KEY);
  return v === "zh" || v === "en" ? v : "en";
}

export function saveLang(lang: Lang) {
  if (!isBrowser()) return;
  localStorage.setItem(LANG_KEY, lang);
}

export function loadBackendUrl(): string {
  if (!isBrowser()) {
    return process.env.NEXT_PUBLIC_BACKEND_URL || "https://tritondft.nrp-nautilus.io";
  }
  return (
    localStorage.getItem(BACKEND_KEY) ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "https://tritondft.nrp-nautilus.io"
  );
}

export function saveBackendUrl(url: string) {
  if (!isBrowser()) return;
  localStorage.setItem(BACKEND_KEY, url);
}
