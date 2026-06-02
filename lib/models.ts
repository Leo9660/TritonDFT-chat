// Models offered in the chat composer. Ids must match the backend's
// credits.MODEL_PRICES keys exactly — the backend prices each job by model.

export interface ModelOption {
  id: string;
  label: string;
  /** Short hint shown in the dropdown. */
  hint: string;
}

export const MODELS: ModelOption[] = [
  { id: "gpt-5.2", label: "GPT-5.2", hint: "Newest flagship" },
  { id: "gpt-5.1", label: "GPT-5.1", hint: "Flagship" },
  { id: "gpt-5", label: "GPT-5", hint: "Flagship" },
  { id: "gpt-5-mini", label: "GPT-5 mini", hint: "Cheaper, fast" },
  { id: "gpt-5-nano", label: "GPT-5 nano", hint: "Cheapest" },
  { id: "gpt-4o", label: "GPT-4o", hint: "Balanced (default)" },
  { id: "gpt-4o-mini", label: "GPT-4o mini", hint: "Cheap" },
];

export const DEFAULT_MODEL = "gpt-4o";

export function isValidModel(id: string | undefined | null): boolean {
  return !!id && MODELS.some((m) => m.id === id);
}
