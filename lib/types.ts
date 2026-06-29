export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  /** Set once a DFT job finishes — used to render the results/artifacts panel. */
  jobId?: string;
}

/** auto = run end-to-end; assistant = pause for human review before each step. */
export type Mode = "auto" | "assistant";

export interface PendingScript {
  filename: string;
  content: string;
}

/** A step paused for human review in assistant mode (from GET /jobs/{id}). */
export interface PendingStep {
  step_index: number;
  step_id?: number;
  total_steps?: number | null;
  problem: string;
  tool: string;
  attempt: number;
  scripts: PendingScript[];
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
  /** Human-in-the-loop mode for this chat. */
  mode?: Mode;
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
