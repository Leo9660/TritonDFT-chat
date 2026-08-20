// Models offered in the chat composer. Ids must match the backend's
// credits.MODEL_PRICES keys exactly — the backend prices each job by model.

export interface ModelOption {
  id: string;
  label: string;
  /** Short hint shown in the dropdown. */
  hint: string;
}

export const MODELS: ModelOption[] = [
  { id: "gpt-5.2", label: "GPT-5.2", hint: "Flagship (default)" },
  // Below the default on purpose: first position reads as "this is the one",
  // and the default is gpt-5.2.
  { id: "gpt-5.6-terra", label: "GPT-5.6 Terra", hint: "Highest accuracy, pick it deliberately" },
  { id: "gpt-5.1", label: "GPT-5.1", hint: "Flagship" },
  { id: "gpt-5", label: "GPT-5", hint: "Flagship" },
  { id: "gpt-5-mini", label: "GPT-5 mini", hint: "Cheaper, fast" },
  { id: "gpt-5-nano", label: "GPT-5 nano", hint: "Cheapest" },
  { id: "gpt-4o", label: "GPT-4o", hint: "Older, noticeably weaker" },
  { id: "gpt-4o-mini", label: "GPT-4o mini", hint: "Cheap" },
  { id: "claude-opus-4-8", label: "Claude Opus 4.8", hint: "Anthropic flagship (pricey)" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", hint: "Anthropic balanced" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", hint: "Anthropic cheap" },
];

export const DEFAULT_MODEL = "gpt-5.2";

export function isValidModel(id: string | undefined | null): boolean {
  return !!id && MODELS.some((m) => m.id === id);
}
