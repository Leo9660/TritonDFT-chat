"use client";

import { useEffect, useRef, useState } from "react";
import { DownloadIcon, FileTextIcon, XIcon, ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import {
  JobDetail, JobFile, BandData,
  fetchJobDetail, fetchJobFiles, fetchJobBands, fetchJobFileText, downloadJobZip,
} from "@/lib/api";
import { BandPlot } from "./BandPlot";

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function ResultsPanel({ jobId }: { jobId: string }) {
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [files, setFiles] = useState<JobFile[]>([]);
  const [bands, setBands] = useState<BandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  const [openFile, setOpenFile] = useState<string | null>(null);
  const [fileText, setFileText] = useState<string>("");
  const [fileLoading, setFileLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [d, f, b] = await Promise.all([
          fetchJobDetail(jobId).catch(() => null),
          fetchJobFiles(jobId).catch(() => []),
          fetchJobBands(jobId).catch(() => null),
        ]);
        if (cancelled) return;
        setDetail(d);
        setFiles(f);
        setBands(b);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // The panel renders after an async fetch — by then the chat's own
  // bottom-pin has already fired, so the page doesn't follow. Once content is
  // in, smoothly bring the panel into view so the user sees the result appear.
  useEffect(() => {
    if (loading) return;
    const id = requestAnimationFrame(() => {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => cancelAnimationFrame(id);
  }, [loading]);

  async function viewFile(name: string) {
    if (openFile === name) {
      setOpenFile(null);
      return;
    }
    setOpenFile(name);
    setFileLoading(true);
    try {
      setFileText(await fetchJobFileText(jobId, name));
    } catch {
      setFileText("(failed to load file)");
    } finally {
      setFileLoading(false);
    }
  }

  async function onDownload() {
    setDownloading(true);
    try {
      await downloadJobZip(jobId);
    } catch {
      // ignore — button just re-enables
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return null;
  // Nothing produced (e.g. agent errored before any run) — don't show an empty box.
  const result = detail?.result || null;
  const hasResult = result && Object.keys(result).length > 0;
  const hasCards = !!(
    result &&
    (result.material ||
      result.task_type ||
      typeof result.final_energy_ev === "number" ||
      typeof result.band_gap_ev === "number")
  );
  if (!hasResult && files.length === 0 && !bands) return null;

  return (
    <div
      ref={rootRef}
      className="mt-3 rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-1)",
        border: "1px solid var(--border)",
        animation: "slide-in-up 0.32s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}
    >
      {/* header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left"
        style={{ background: "rgba(255,255,255,0.02)" }}
      >
        {open ? <ChevronDownIcon size={15} /> : <ChevronRightIcon size={15} />}
        <span style={{ fontWeight: 600, fontSize: 13 }}>Results &amp; artifacts</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "var(--fg-dim)" }}>
          {files.length} file{files.length === 1 ? "" : "s"}
        </span>
      </button>

      {open && (
        <div style={{ padding: "12px 14px 16px" }}>
          {/* analysis / conclusion — the answer to the question */}
          {result?.analysis && (
            <div
              style={{
                marginBottom: 14,
                padding: "11px 13px",
                borderRadius: 10,
                background: "rgba(69,119,255,0.06)",
                border: "1px solid rgba(69,119,255,0.25)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  color: "var(--blue-500, #4577ff)",
                  fontWeight: 700,
                  marginBottom: 5,
                }}
              >
                Analysis · conclusion
              </div>
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.62,
                  color: "var(--fg)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {result.analysis}
              </div>
            </div>
          )}

          {/* key-value cards */}
          {hasCards && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: 8,
                marginBottom: 14,
              }}
            >
              {result?.material && <Card label="Material" value={result.material} />}
              {result?.task_type && <Card label="Task" value={result.task_type} mono />}
              {typeof result?.final_energy_ev === "number" && (
                <Card label="Final energy" value={`${result.final_energy_ev.toFixed(3)} eV`} mono />
              )}
              {typeof result?.band_gap_ev === "number" && (
                <Card label="Band gap" value={`${result.band_gap_ev.toFixed(3)} eV`} mono />
              )}
            </div>
          )}

          {/* band structure plot */}
          {bands && bands.bands.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-mute)", marginBottom: 6 }}>
                Band structure
              </div>
              <BandPlot data={bands} />
            </div>
          )}

          {/* file list */}
          {files.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-mute)" }}>
                  Files
                </span>
                <span style={{ flex: 1 }} />
                <button
                  onClick={onDownload}
                  disabled={downloading}
                  className="inline-flex items-center gap-1.5"
                  style={{
                    padding: "5px 12px",
                    borderRadius: 8,
                    background: "var(--grad-primary)",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: downloading ? "wait" : "pointer",
                    opacity: downloading ? 0.6 : 1,
                  }}
                >
                  <DownloadIcon size={13} />
                  {downloading ? "Zipping…" : "Download all (.zip)"}
                </button>
              </div>
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                {files.map((f) => (
                  <div key={f.name}>
                    <button
                      onClick={() => f.text && viewFile(f.name)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 10px",
                        background: openFile === f.name ? "rgba(255,255,255,0.04)" : "transparent",
                        borderBottom: "1px solid var(--border)",
                        cursor: f.text ? "pointer" : "default",
                        textAlign: "left",
                      }}
                    >
                      <FileTextIcon size={13} style={{ color: "var(--fg-dim)", flexShrink: 0 }} />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{f.name}</span>
                      <span style={{ flex: 1 }} />
                      <span style={{ fontSize: 11, color: "var(--fg-dim)" }}>{fmtBytes(f.size)}</span>
                    </button>
                    {openFile === f.name && (
                      <div style={{ position: "relative", background: "var(--bg)" }}>
                        <button
                          onClick={() => setOpenFile(null)}
                          title="Close"
                          style={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            padding: 3,
                            background: "var(--bg-1)",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            cursor: "pointer",
                            color: "var(--fg-mute)",
                            zIndex: 1,
                          }}
                        >
                          <XIcon size={12} />
                        </button>
                        <pre
                          style={{
                            margin: 0,
                            padding: "10px 12px",
                            maxHeight: 320,
                            overflow: "auto",
                            fontSize: 11.5,
                            lineHeight: 1.5,
                            fontFamily: "var(--font-mono)",
                            color: "var(--fg-mute)",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {fileLoading ? "Loading…" : fileText}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Card({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 8,
        background: "var(--bg)",
        border: "1px solid var(--border)",
      }}
    >
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--fg-dim)" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          marginTop: 2,
          fontFamily: mono ? "var(--font-mono)" : "inherit",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}
