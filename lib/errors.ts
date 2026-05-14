// Parse + translate backend API errors.
//
// Standard backend error shape (FastAPI HTTPException with dict detail):
//   { "detail": { "code": "<key>", "message": "<fallback en>", "details"?: {...} } }
// Legacy/raw shapes are also handled defensively.

import i18n from "i18next";

export interface ParsedError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  status?: number;
}

/** Translate using i18n if a key is registered, else use the backend's fallback message. */
export function tr(err: ParsedError): string {
  const key = `errors.${err.code}`;
  // i18next.exists(key) → true if the key resolves in current language or fallback
  if (i18n.exists(key)) {
    const opts: Record<string, unknown> = {};
    if (err.details) {
      // Expose common detail fields as interpolation vars: {{max}}, {{needed}}, etc.
      if (typeof err.details.max_chars === "number") opts.max = err.details.max_chars;
      if (typeof err.details.credits_needed === "number") opts.needed = err.details.credits_needed;
      if (typeof err.details.credits_remaining === "number") opts.remaining = err.details.credits_remaining;
    }
    return i18n.t(key, opts) as string;
  }
  return err.message || err.code;
}

/** Best-effort parse of a Response body (already read as text). */
export function parseError(status: number, bodyText: string): ParsedError {
  let parsed: ParsedError = { code: "unknown", message: "", status };
  try {
    const obj = JSON.parse(bodyText);
    // Shape A: FastAPI HTTPException → { detail: { code, message, details } }
    if (obj && typeof obj === "object" && obj.detail && typeof obj.detail === "object") {
      const d = obj.detail as Record<string, unknown>;
      parsed = {
        code: (d.code as string) || `http_${status}`,
        message: (d.message as string) || "",
        details: d.details as Record<string, unknown> | undefined,
        status,
      };
    }
    // Shape B: FastAPI HTTPException with string detail → { detail: "snake_case" }
    else if (obj && typeof obj === "object" && typeof obj.detail === "string") {
      parsed = { code: obj.detail, message: obj.detail, status };
    }
    // Shape C: legacy { error: "...", message: "..." }
    else if (obj && typeof obj === "object" && typeof obj.error === "string") {
      parsed = {
        code: obj.error,
        message: (obj.message as string) || obj.error,
        status,
      };
    } else {
      parsed = { code: `http_${status}`, message: bodyText.slice(0, 200), status };
    }
  } catch {
    parsed = { code: `http_${status}`, message: bodyText.slice(0, 200), status };
  }
  return parsed;
}

/** Read response body and parse — convenience wrapper. */
export async function parseResponseError(resp: Response): Promise<ParsedError> {
  const txt = await resp.text().catch(() => "");
  return parseError(resp.status, txt);
}

/** Take any thrown value (Error or string) and try to extract a ParsedError shape. */
export function fromThrown(e: unknown): ParsedError {
  if (e instanceof Error) {
    // Errors we threw ourselves (see authFetch helpers) carry the parsed shape
    const cause = (e as Error & { parsed?: ParsedError }).parsed;
    if (cause) return cause;
    return { code: "unknown", message: e.message };
  }
  return { code: "unknown", message: String(e) };
}
