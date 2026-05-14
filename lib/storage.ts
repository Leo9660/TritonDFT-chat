import { Conversation, Folder, Lang, PromptTemplate } from "./types";

const CONV_KEY = "tritondft.conversations.v1";
const LANG_KEY = "tritondft.lang.v1";
const BACKEND_KEY = "tritondft.backendUrl.v1";
const FOLDERS_KEY = "tritondft.folders.v1";
const PROMPTS_KEY = "tritondft.prompts.v1";

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

export function loadFolders(): Folder[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveFolders(folders: Folder[]) {
  if (!isBrowser()) return;
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
}

export function loadPrompts(): PromptTemplate[] {
  if (!isBrowser()) {
    return DEFAULT_PROMPTS;
  }
  try {
    const raw = localStorage.getItem(PROMPTS_KEY);
    if (!raw) return DEFAULT_PROMPTS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PROMPTS;
  }
}

export function savePrompts(prompts: PromptTemplate[]) {
  if (!isBrowser()) return;
  localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
}

const DEFAULT_PROMPTS: PromptTemplate[] = [
  {
    id: "default-si",
    title: "Si vc-relax (LDA)",
    content:
      "Si diamond cubic, vc-relax with LDA, ecutwfc 30 Ry, k-grid 8×8×8. Report lattice constant and bulk modulus.",
    createdAt: 0,
  },
  {
    id: "default-graphene",
    title: "Graphene scf (PBE)",
    content:
      "Graphene 2D, scf with PBE, ecutwfc 60 Ry, k-grid 16×16×1, vacuum 15 Å. Report Dirac point and Fermi velocity.",
    createdAt: 0,
  },
  {
    id: "default-fe",
    title: "Fe magnetic (PBE+U)",
    content:
      "Fe bcc, magnetic scf with PBE+U (U=4.5 eV on 3d), ecutwfc 50 Ry. Report magnetic moment and lattice constant.",
    createdAt: 0,
  },
];
