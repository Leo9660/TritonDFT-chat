import { Message } from "./types";
import { ApiError, loadToken } from "./auth";
import { parseError, ParsedError } from "./errors";

export interface JobCallbacks {
  /** Full accumulated agent output so far (replace, don't append). */
  onUpdate: (fullOutput: string) => void;
  /** Called while the job waits in queue. position 0 = next to run. */
  onQueue?: (position: number) => void;
  onDone: () => void;
  onError: (err: Error) => void;
  /** 401/402/403/etc — receives the parsed error for translated UI messages. */
  onApiError?: (err: ParsedError) => void;
}

export interface JobHandle {
  /** Stop polling and cancel the job server-side. */
  cancel: () => void;
}

const POLL_INTERVAL_MS = 1500;

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const t = loadToken();
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

/**
 * Submit a DFT job and poll it to completion.
 *
 * Execution is decoupled from this request — the job runs on a backend worker
 * and survives the browser closing. Returns a handle whose cancel() stops
 * polling and cancels the job server-side.
 */
export function runJob(
  backendUrl: string,
  messages: Message[],
  cb: JobCallbacks,
): JobHandle {
  const base = backendUrl.replace(/\/$/, "");
  let stopped = false;
  let jobId: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function fail(status: number, txt: string) {
    const parsed = parseError(status, txt);
    cb.onApiError?.(parsed);
    cb.onError(new ApiError(parsed));
  }

  async function poll() {
    if (stopped || !jobId) return;
    try {
      const resp = await fetch(`${base}/jobs/${jobId}`, { headers: authHeaders() });
      if (!resp.ok) {
        fail(resp.status, await resp.text().catch(() => ""));
        return;
      }
      const data = await resp.json();
      if (stopped) return;

      if (data.status === "queued") {
        cb.onQueue?.(data.queue_position ?? 0);
      } else if (data.status === "running") {
        if (data.output) cb.onUpdate(data.output);
      } else {
        // Terminal: done | failed | timeout | cancelled
        if (data.status === "failed" || data.status === "timeout") {
          const tail = data.error ? `\n\n> ⚠️ ${data.error}` : "";
          cb.onUpdate((data.output || "") + tail);
        } else if (typeof data.output === "string") {
          cb.onUpdate(data.output);
        }
        cb.onDone();
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    } catch (e) {
      if (!stopped) cb.onError(e as Error);
    }
  }

  (async () => {
    try {
      const resp = await fetch(`${base}/jobs`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          messages: messages.map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!resp.ok) {
        fail(resp.status, await resp.text().catch(() => ""));
        return;
      }
      const data = await resp.json();
      jobId = data.job_id;
      if ((data.queue_position ?? 0) > 0) cb.onQueue?.(data.queue_position);
      poll();
    } catch (e) {
      if (!stopped) cb.onError(e as Error);
    }
  })();

  return {
    cancel: () => {
      if (stopped) return;
      stopped = true;
      if (timer) clearTimeout(timer);
      if (jobId) {
        fetch(`${base}/jobs/${jobId}/cancel`, {
          method: "POST",
          headers: authHeaders(),
        }).catch(() => {});
      }
      cb.onDone();
    },
  };
}
