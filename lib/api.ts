import { Message, Mode, PendingStep, PendingPlan, PlanStep, PseudoChoice } from "./types";
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
  /**
   * Assistant mode: a step's script is paused awaiting the user's review.
   * Fires once per distinct pending step (deduped by step + attempt).
   */
  onApproval?: (pending: PendingStep, jobId: string) => void;
  /**
   * Assistant mode: the plan is paused awaiting the user's review. Fires once
   * per distinct plan revision (deduped by the step list itself, so a revision
   * that changes nothing doesn't re-open the dialog).
   */
  onPlanReview?: (pending: PendingPlan, jobId: string) => void;
  /** The agent's plan, as soon as it exists. Fires in both modes, once. */
  onPlan?: (steps: PlanStep[]) => void;
  /**
   * The job id, as soon as the job is created — long before it finishes. Lets
   * the UI mount the artifacts panel while the run is still going, so the user
   * can watch the scripts appear instead of staring at a log, and still has
   * them if they stop the run early.
   */
  onJobId?: (jobId: string) => void;
}

export interface DosData {
  total?: { x_label: string; e_fermi: number | null; points: [number, number][] };
  projected?: { label: string; points: [number, number][] }[];
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
  mode?: Mode;
  /** Experimental: render plots and surface extracted values. */
  plots?: boolean;
  /** Pseudopotential library. Omitted = backend default. */
  pseudo?: PseudoChoice;
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

  // Output is emitted whole. A character-by-character reveal made a 60-line
  // agent log crawl for minutes after the run had already finished, and it
  // fights the reader: the interesting part is usually the last line.
  let target = "";                                  // full output from latest poll
  let phase: "queued" | "running" | "terminal" = "queued";
  let lastSent: string | null = null;
  let lastPendingKey: string | null = null;         // dedupe onApproval fires
  let lastPlanKey: string | null = null;            // dedupe onPlanReview fires
  let planSent = false;                             // onPlan fires once

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

  function flush() {
    if (stopped) return;
    if (target.length === 0 && phase === "running") {
      emit("");
    } else {
      emit(target);
    }
    if (phase === "terminal") cb.onDone(jobId);
  }

  function ensureTyping() {
    flush();
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

      // The plan lands on the job row in both modes — surface it as soon as
      // it's there, independent of which status the job is in.
      if (!planSent && Array.isArray(data.plan) && data.plan.length) {
        planSent = true;
        cb.onPlan?.(data.plan as PlanStep[]);
      }

      if (data.status === "queued") {
        cb.onQueue?.(data.queue_position ?? 0);
        pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
      } else if (data.status === "running") {
        phase = "running";
        target = data.output || "";
        ensureTyping();
        pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
      } else if (data.status === "awaiting_plan") {
        // Assistant mode: the plan is waiting for the user. Same shape as the
        // step gate below — keep output flowing and keep polling so we resume
        // automatically once the user acts.
        phase = "running";
        target = data.output || "";
        ensureTyping();
        const pp = data.pending_plan as PendingPlan | null;
        if (pp) {
          // Key on the plan content: after a "suggest" round the revised plan
          // must re-open the dialog, but an unchanged one shouldn't.
          const key = JSON.stringify(
            (pp.steps || []).map((s) => [s.tool, s.problem, s.input]),
          );
          if (key !== lastPlanKey) {
            lastPlanKey = key;
            cb.onPlanReview?.(pp, jobId as string);
          }
        }
        pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
      } else if (data.status === "awaiting_approval") {
        // Assistant mode: a step's script is waiting for the user. Keep the
        // output flowing and surface the pending step (once per step/attempt),
        // and keep polling so we resume automatically once the user acts.
        phase = "running";
        target = data.output || "";
        ensureTyping();
        const p = data.pending_step as PendingStep | null;
        if (p) {
          const key = `${p.step_index}:${p.attempt}`;
          if (key !== lastPendingKey) {
            lastPendingKey = key;
            cb.onApproval?.(p, jobId as string);
          }
        }
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
          ...(opts.mode ? { mode: opts.mode } : {}),
          ...(opts.plots != null ? { plots: opts.plots } : {}),
          ...(opts.pseudo ? { pseudo_choice: opts.pseudo } : {}),
        }),
      });
      if (!resp.ok) {
        fail(resp.status, await resp.text().catch(() => ""));
        return;
      }
      const data = await resp.json();
      jobId = data.job_id;
      if (jobId) cb.onJobId?.(jobId);
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

// ───── Assistant mode: submit a decision for a paused step ─────

export type StepAction =
  | { action: "approve"; scripts?: { filename: string; content: string }[] }
  | { action: "suggest"; suggestion: string }
  | { action: "cancel" };

/** Submit the user's decision for a step awaiting review (assistant mode).
 * The job resumes server-side; the still-running poll loop picks it up. */
export async function submitStepAction(jobId: string, body: StepAction): Promise<void> {
  const r = await authFetch(`/jobs/${jobId}/step-action`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

export type PlanAction =
  | { action: "approve"; steps?: { problem: string; tool: string; input: string }[] }
  | { action: "suggest"; suggestion: string }
  | { action: "cancel" };

/** Submit the user's decision for a plan awaiting review (assistant mode). */
export async function submitPlanAction(jobId: string, body: PlanAction): Promise<void> {
  const r = await authFetch(`/jobs/${jobId}/plan-action`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
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

export async function fetchJobDos(jobId: string): Promise<DosData | null> {
  const r = await authFetch(`/jobs/${jobId}/dos`);
  if (!r.ok) return null;
  return (await r.json()).dos ?? null;
}

export async function fetchJobPhonons(jobId: string): Promise<BandData | null> {
  const r = await authFetch(`/jobs/${jobId}/phonons`);
  if (!r.ok) return null;
  return (await r.json()).phonons ?? null;
}

/** The generated input for one step. Times out rather than hanging: the run
 *  directory lives on a busy PVC and a slow listing used to leave the tab
 *  saying "Loading…" indefinitely with no way back. */
export async function fetchStepInput(
  jobId: string, step: number, timeoutMs = 12000,
): Promise<string | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await authFetch(`/jobs/${jobId}/steps/${step}/input`, { signal: ctl.signal });
    if (!r.ok) return null;
    return (await r.json()).text ?? null;
  } finally {
    clearTimeout(timer);
  }
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
