import { Message } from "./types";

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export async function streamChat(
  backendUrl: string,
  messages: Message[],
  signal: AbortSignal,
  cb: StreamCallbacks,
): Promise<void> {
  try {
    const resp = await fetch(`${backendUrl.replace(/\/$/, "")}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.map(({ role, content }) => ({ role, content })),
        stream: true,
      }),
      signal,
    });

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
