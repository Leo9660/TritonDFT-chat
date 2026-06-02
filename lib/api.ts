import { Message } from "./types";
import { ApiError, loadToken, authFetch } from "./auth";
import { parseError, ParsedError } from "./errors";

export interface JobCallbacks {
  /** Full accumulated agent output so far (replace, don't append). */
  onUpdate: (fullOutput: string) => void;
  /** Called while the job waits in queue. position 0 = next to run. */
  onQueue?: (position: number) => void;
  /** Receives the job id (or null) so the caller can render the results panel. */
  onDone: (jobId: string | null) => void;
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
 *
 * Polling fetches the *full* output every 1.5s, but a client-side typewriter
 * reveals it character-by-character with human-like jitter — so the visual
 * cadence is decoupled from the (chunky) network cadence.
 */
export interface JobOptions {
  model?: string;
  scriptOnly?: boolean;
}

export function runJob(
  backendUrl: string,
  messages: Message[],
  cb: JobCallbacks,
  opts: JobOptions = {},
): JobHandle {
  const base = backendUrl.replace(/\/$/, "");
  let stopped = false;
  let jobId: string | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let typeTimer: ReturnType<typeof setTimeout> | null = null;

  // Typewriter state
  let target = "";                                  // full output from latest poll
  let displayed = 0;                                // chars revealed so far
  let phase: "queued" | "running" | "terminal" = "queued";
  let lastSent: string | null = null;

  function fail(status: number, txt: string) {
    const parsed = parseError(status, txt);
    cb.onApiError?.(parsed);
    cb.onError(new ApiError(parsed));
  }

  function emit(s: string) {
    if (s !== lastSent) {
      lastSent = s;
      cb.onUpdate(s);
    }
  }

  // Jittered inter-keystroke delay — mostly fast, with the occasional
  // human-like pause.
  function nextDelay(): number {
    const r = Math.random();
    if (r < 0.05) return 90 + Math.random() * 150;   // occasional "thinking" pause
    return 11 + Math.random() * 36;                  // normal jittery typing
  }

  function typeTick() {
    if (stopped) return;
    if (displayed < target.length) {
      const remaining = target.length - displayed;
      // Big backlog → reveal in chunks so we track the 1.5s poll cadence;
      // near the end → 1–2 chars at a time for a genuine typing feel.
      const step =
        remaining > 220 ? Math.ceil(remaining / 55) : 1 + Math.floor(Math.random() * 2);
      displayed = Math.min(target.length, displayed + step);
      emit(target.slice(0, displayed));
      typeTimer = setTimeout(typeTick, nextDelay());
    } else if (phase === "terminal") {
      typeTimer = null;
      cb.onDone(jobId);
    } else {
      // Caught up but job still running — show a placeholder if nothing has
      // streamed yet, then idle-poll for more.
      if (phase === "running" && target.length === 0) emit("⏳ Running…");
      typeTimer = setTimeout(typeTick, 60);
    }
  }

  function ensureTyping() {
    if (typeTimer === null && !stopped) typeTick();
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
        pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
      } else if (data.status === "running") {
        phase = "running";
        target = data.output || "";
        ensureTyping();
        pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
      } else {
        // Terminal: done | failed | timeout | cancelled
        let full = data.output || "";
        if ((data.status === "failed" || data.status === "timeout") && data.error) {
          full += `\n\n> ⚠️ ${data.error}`;
        }
        target = full;
        phase = "terminal";
        ensureTyping();   // typewriter drains the rest, then calls onDone
      }
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
          ...(opts.model ? { model: opts.model } : {}),
          ...(opts.scriptOnly != null ? { script_only: opts.scriptOnly } : {}),
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
      if (pollTimer) clearTimeout(pollTimer);
      if (typeTimer) clearTimeout(typeTimer);
      if (jobId) {
        fetch(`${base}/jobs/${jobId}/cancel`, {
          method: "POST",
          headers: authHeaders(),
        }).catch(() => {});
      }
      // Replace a frozen "⏳ Queued/Running" placeholder (or leave partial
      // output) with a clear stopped state — don't leave it looking stuck.
      const partial = lastSent && !lastSent.startsWith("⏳") ? lastSent.replace(/\s+$/, "") : "";
      cb.onUpdate((partial ? partial + "\n\n" : "") + "> ⏹ Stopped.");
      cb.onDone(jobId);
    },
  };
}

// ───── Artifacts: fetch a finished job's results & files ─────

export interface JobResult {
  material?: string;
  task_type?: string;
  final_energy_ry?: number;
  final_energy_ev?: number;
  band_gap_ev?: number;
  /** The agent's natural-language conclusion — the answer to the question. */
  analysis?: string;
}

export interface JobFile {
  name: string;
  size: number;
  ext: string;
  text: boolean;
}

export interface BandData {
  bands: number[][][];   // [band][point][k, energy]
  n_bands: number;
  e_min: number;
  e_max: number;
  k_min: number;
  k_max: number;
  e_fermi: number | null;   // Fermi energy (eV) for zero-referencing the plot
}

export interface JobDetail {
  status: string;
  result: JobResult | null;
  has_artifacts: boolean;
  error: string | null;
}

export async function fetchJobDetail(jobId: string): Promise<JobDetail> {
  const r = await authFetch(`/jobs/${jobId}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function fetchJobFiles(jobId: string): Promise<JobFile[]> {
  const r = await authFetch(`/jobs/${jobId}/files`);
  if (!r.ok) return [];
  const d = await r.json();
  return d.files || [];
}

export async function fetchJobBands(jobId: string): Promise<BandData | null> {
  const r = await authFetch(`/jobs/${jobId}/bands`);
  if (!r.ok) return null;
  const d = await r.json();
  return d.bands || null;
}

export async function fetchJobFileText(jobId: string, name: string): Promise<string> {
  const r = await authFetch(`/jobs/${jobId}/files/${encodeURIComponent(name)}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

export async function downloadJobZip(jobId: string): Promise<void> {
  const r = await authFetch(`/jobs/${jobId}/download`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tritondft-${jobId}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
