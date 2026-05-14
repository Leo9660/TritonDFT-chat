import { Message } from "./types";
import { loadToken } from "./auth";

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
  /** Called on 401 (auth lost) or 402 (out of credits). */
  onAuthError?: (status: number, body: string) => void;
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

    if (resp.status === 401 || resp.status === 402 || resp.status === 403) {
      const txt = await resp.text();
      cb.onAuthError?.(resp.status, txt);
      throw new Error(`HTTP ${resp.status}: ${txt}`);
    }

    if (!resp.ok || !resp.body) {
      throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
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
