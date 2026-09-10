"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, FileText, Loader2, X } from "lucide-react";
import type { CVFileMeta } from "@/types/cv";

const FORMAT_NAME: Record<string, string> = {
  ats: "ATS", europass: "Europass", designer: "Designer", lebenslauf: "Lebenslauf",
};

function describe(file: CVFileMeta) {
  if (file.genDocType === "cover-letter") return "Cover letter";
  if (file.genDocType === "resume") return "Tailored resume";
  const base = FORMAT_NAME[file.genFormat ?? ""] ?? "CV";
  return file.genVariant === "compact" ? `${base} Compact` : base;
}

function when(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function SavedCVModal({
  files,
  onClose,
}: {
  files: CVFileMeta[];
  onClose: () => void;
}) {
  const [activeId, setActiveId] = useState(files[0]?._id ?? "");
  const [frameLoading, setFrameLoading] = useState(true);

  const active = useMemo(
    () => files.find((f) => f._id === activeId) ?? files[0],
    [files, activeId],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* A .docx is re-rendered to PDF for viewing; a stored PDF is served as-is. */
  const isPdf = active?.mimeType === "application/pdf";
  const src = active ? `/api/user/cv/files/${active._id}/raw?as=pdf#view=FitH` : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Saved CV preview"
    >
      <div className="surface flex h-[88dvh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{active?.name ?? "Saved CV"}</h2>
            {active && (
              <p className="text-muted truncate text-xs">
                {describe(active)}
                {isPdf ? "" : " · rendered from your Word version for viewing"}
                {when(active.uploadedAt) ? ` · ${when(active.uploadedAt)}` : ""}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {active && (
              <>
                <a
                  href={`/api/user/cv/files/${active._id}/raw?download=1`}
                  className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-2)]"
                >
                  <Download size={12} aria-hidden="true" />
                  {active.name.split(".").pop()?.toUpperCase()}
                </a>
                <a
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-2)]"
                >
                  <ExternalLink size={12} aria-hidden="true" /> New tab
                </a>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-md p-1.5 transition hover:bg-[var(--surface-2)]"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        {files.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto border-b px-4 py-2">
            {files.map((f) => {
              const on = f._id === active?._id;
              return (
                <button
                  key={f._id}
                  type="button"
                  onClick={() => { setActiveId(f._id); setFrameLoading(true); }}
                  className="shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition"
                  style={on
                    ? { borderColor: "var(--primary)", color: "var(--primary)", background: "var(--primary)14" }
                    : { borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                >
                  {describe(f)}
                  <span className="ml-1.5 opacity-60">{f.genOutput?.toUpperCase()}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="relative flex-1 bg-[var(--surface-2)]">
          {frameLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Loader2 size={22} className="text-muted animate-spin" aria-hidden="true" />
              <p className="text-muted text-xs">
                {isPdf ? "Loading preview…" : "Rendering a PDF view…"}
              </p>
            </div>
          )}
          {active && (
            <iframe
              key={active._id}
              src={src}
              title={`Preview of ${active.name}`}
              className="h-full w-full"
              onLoad={() => setFrameLoading(false)}
            />
          )}
          {!active && (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <FileText size={24} className="text-muted" aria-hidden="true" />
              <p className="text-muted text-sm">Nothing generated yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
