export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  folderId?: string | null;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
  expanded?: boolean;
}

export interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export type Lang = "en" | "zh";
