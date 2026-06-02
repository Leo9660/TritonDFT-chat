export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  /** Set once a DFT job finishes — used to render the results/artifacts panel. */
  jobId?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  folderId?: string | null;
  /** OpenAI model used for this chat. */
  model?: string;
  /** Generate input files without running them on CPU. */
  scriptOnly?: boolean;
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
