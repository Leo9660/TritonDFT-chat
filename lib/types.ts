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

/** One subproblem in the agent's plan (from GET /jobs/{id} → plan / pending_plan). */
export interface PlanStep {
  id: number;
  index: number;
  problem: string;
  tool: string;
  input: string;
  /** QE binary this tool maps to, e.g. "pw.x" / "bands.x". */
  exec: string;
  /** pw.x calculation mode, e.g. "vc-relax" / "bands". Empty for post-processing. */
  mode: string;
  description: string;
  /** False when the tool name isn't in the backend's allowed set. */
  valid: boolean;
}

/** A plan paused for human review in assistant mode. */
export interface PendingPlan {
  query: string;
  steps: PlanStep[];
}

/** The three axes of the PseudoDojo library tree. */
export type Xc = "LDA" | "PBE" | "PBEsol";
export type Relativistic = "SR" | "FR";
export type Accuracy = "standard" | "stringent";

export interface PseudoChoice {
  xc: Xc;
  relativistic: Relativistic;
  accuracy: Accuracy;
}

/** PseudoDojo publishes no fully-relativistic LDA library. */
export function pseudoAvailable(xc: Xc, rel: Relativistic): boolean {
  return !(xc === "LDA" && rel === "FR");
}

export const DEFAULT_PSEUDO: PseudoChoice = {
  xc: "PBE",
  relativistic: "SR",
  accuracy: "standard",
};

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
  /** Experimental: render plots and show extracted values (band gap, energy). */
  plots?: boolean;
  /** Pseudopotential library choice. Undefined = backend default (PBE/SR/standard). */
  pseudo?: PseudoChoice;
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
