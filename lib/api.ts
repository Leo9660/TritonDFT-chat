import { Message } from "./types";
import { ApiError, loadToken } from "./auth";
import { parseError, ParsedError } from "./errors";

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
  /** Called on 401/402/403/413/429 etc. — receives the parsed error so the UI can show a translated message. */
  onApiError?: (err: ParsedError) => void;
}

export async function streamChat(
  backendUrl: string,
  messages: Message[],
  signal: AbortSignal,
  cb: StreamCallbacks,
): Promise<void> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = loadToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const resp = await fetch(`${backendUrl.replace(/\/$/, "")}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages: messages.map(({ role, content }) => ({ role, content })),
        stream: true,
      }),
      signal,
    });

    if (!resp.ok || !resp.body) {
      const txt = await resp.text().catch(() => "");
      const parsed = parseError(resp.status, txt);
      cb.onApiError?.(parsed);
      throw new ApiError(parsed);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) cb.onDelta(chunk);
    }

    cb.onDone();
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      cb.onDone();
      return;
    }
    cb.onError(err as Error);
  }
}
