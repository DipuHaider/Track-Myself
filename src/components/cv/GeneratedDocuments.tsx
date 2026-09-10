"use client";

import { useState } from "react";
import { Download, FileText, Trash2 } from "lucide-react";
import type { CVFileMeta } from "@/types/cv";

const FORMAT_NAME: Record<string, string> = {
  ats: "ATS", europass: "Europass", designer: "Designer", lebenslauf: "Lebenslauf",
};

function describe(file: CVFileMeta) {
  const bits: string[] = [];
  if (file.genDocType === "cover-letter") bits.push("Cover letter");
  else if (file.genDocType === "resume") bits.push("Tailored resume");
  else bits.push(`${FORMAT_NAME[file.genFormat ?? ""] ?? "CV"}${file.genVariant === "compact" ? " Compact" : ""}`);
  if (file.genOutput) bits.push(file.genOutput.toUpperCase());
  return bits.join(" · ");
}

function when(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

const kb = (n: number) => `${Math.max(1, Math.round(n / 1024))} KB`;

export default function GeneratedDocuments({
  files,
  onDeleted,
}: {
  files: CVFileMeta[];
  onDeleted: (id: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function remove(id: string) {
    setBusy(id);
    setError("");
    try {
      const res = await fetch(`/api/user/cv/files/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete that document.");
      onDeleted(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete that document.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="surface rounded-xl border p-5">
      {/* The tab above already names this panel — no second heading. */}
      <p className="text-muted mb-4 text-sm">
        Every CV, resume and cover letter TrackMyself has built for you. Re-generating the same
        format replaces its entry rather than adding another. These are never read back into the
        CV Builder.
      </p>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {files.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center">
          <FileText size={22} className="text-muted mx-auto mb-2" aria-hidden="true" />
          <p className="text-muted text-sm">
            Nothing generated yet. Build one in the CV Builder and it will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {files.map((file) => (
            <li key={file._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <FileText size={15} className="text-muted shrink-0" aria-hidden="true" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-muted text-xs">
                  {describe(file)}
                  {file.genFor ? ` · ${file.genFor}` : ""}
                  {` · ${kb(file.size)}`}
                  {when(file.uploadedAt) ? ` · ${when(file.uploadedAt)}` : ""}
                </p>
              </div>

              <a
                href={`/api/user/cv/files/${file._id}/raw?download=1`}
                className="flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-2)]"
              >
                <Download size={12} aria-hidden="true" /> Download
              </a>

              <button
                type="button"
                onClick={() => remove(file._id)}
                disabled={busy === file._id}
                aria-label={`Delete ${file.name}`}
                className="shrink-0 rounded-md p-1.5 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
