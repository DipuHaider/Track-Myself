"use client";

import { useRef, useState } from "react";
import {
  Check, Download, Eye, FileText, ImageIcon, Loader2,
  Pencil, Star, Trash2, Upload, X,
} from "lucide-react";
import type { CVFileCategory, CVFileMeta } from "@/types/cv";

export type SectionSpec = {
  category: CVFileCategory;
  title: string;
  description: string;
  accept: string;
  maxMB: number;
  kind: "document" | "image";
  primaryLabel?: string;
  singleSlot?: boolean;
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKind(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "application/msword") return "DOC";
  if (mimeType.startsWith("image/")) return mimeType.split("/")[1].toUpperCase();
  return "DOCX";
}

async function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DocumentSection({
  spec, files, primaryId, onFilesChange, onPrimaryChange,
}: {
  spec: SectionSpec;
  files: CVFileMeta[];
  primaryId: string;
  onFilesChange: (files: CVFileMeta[], mode: "all" | "section") => void;
  onPrimaryChange: (slotValue: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isImage = spec.kind === "image";

  async function upload(file: File) {
    setError("");
    if (file.size > spec.maxMB * 1024 * 1024) {
      setError(`File must be under ${spec.maxMB} MB`);
      return;
    }
    setUploading(true);
    try {
      const data = await readAsBase64(file);
      const res = await fetch("/api/user/cv/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          mimeType: file.type,
          data,
          category: spec.category,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? "Upload failed. Please try again.");
        return;
      }
      onFilesChange(body as CVFileMeta[], "all");
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function togglePrimary(id: string) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/user/cv/files/${id}/main`, { method: "PATCH" });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? "Could not update this section.");
        return;
      }
      onPrimaryChange(body.value ?? "");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/user/cv/files/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Could not delete that file.");
        return;
      }
      onFilesChange(files.filter((f) => f._id !== id), "section");
      if (primaryId === id) onPrimaryChange("");
    } finally {
      setBusyId(null);
    }
  }

  async function saveRename(id: string) {
    const name = renameValue.trim();
    if (!name) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/user/cv/files/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        setError("Could not rename that file.");
        return;
      }
      onFilesChange(files.map((f) => (f._id === id ? { ...f, name } : f)), "section");
      setRenameId(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="surface overflow-hidden rounded-xl border">
      <div className="surface-muted flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span style={{ color: "var(--primary)" }} aria-hidden="true">
            {isImage ? <ImageIcon size={15} /> : <FileText size={15} />}
          </span>
          <div>
            <h2 className="text-sm font-semibold">{spec.title}</h2>
            <p className="text-muted text-[11px] leading-relaxed">{spec.description}</p>
          </div>
        </div>
        <span className="text-muted text-[11px]">{files.length} file{files.length === 1 ? "" : "s"}</span>
      </div>

      <div className="space-y-3 p-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) upload(file);
          }}
          onClick={() => !uploading && inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 transition hover:bg-[var(--surface-2)]"
          style={{
            borderColor: dragging ? "var(--primary)" : "var(--border)",
            background: dragging ? "var(--surface-2)" : undefined,
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={spec.accept}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          {uploading ? (
            <>
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--primary)" }} />
              <p className="text-muted text-xs">Uploading…</p>
            </>
          ) : (
            <>
              <Upload size={18} className="text-muted" aria-hidden="true" />
              <p className="text-sm font-medium">
                Drop a file or <span style={{ color: "var(--primary)" }}>browse</span>
              </p>
              <p className="text-muted text-[11px]">
                {spec.accept.replace(/\./g, "").toUpperCase().replace(/,/g, ", ")} · max {spec.maxMB} MB
              </p>
            </>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {files.length === 0 ? (
          <p className="text-muted py-1 text-center text-xs">Nothing uploaded yet.</p>
        ) : (
          <ul className="space-y-2" role="list">
            {files.map((file) => {
              const isPrimary = primaryId === file._id;
              const busy = busyId === file._id;
              return (
                <li
                  key={file._id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5"
                  style={isPrimary ? { borderColor: "var(--primary)", boxShadow: "0 0 0 1px var(--primary)" } : {}}
                >
                  {isImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={`/api/user/cv/files/${file._id}/raw`}
                      alt={file.name}
                      className="h-11 w-11 shrink-0 rounded object-cover"
                      style={{ background: "var(--surface-2)" }}
                    />
                  ) : (
                    <FileText
                      size={17}
                      className={isPrimary ? "" : "text-muted"}
                      style={{ color: isPrimary ? "var(--primary)" : undefined }}
                      aria-hidden="true"
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    {renameId === file._id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          className="w-full rounded border bg-transparent px-2 py-1 text-sm"
                          value={renameValue}
                          autoFocus
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRename(file._id);
                            if (e.key === "Escape") setRenameId(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => saveRename(file._id)}
                          className="rounded p-1 text-green-600 hover:bg-[var(--surface-2)]"
                          title="Save name"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenameId(null)}
                          className="text-muted rounded p-1 hover:bg-[var(--surface-2)]"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        <p className="text-muted text-[11px]">
                          {fileKind(file.mimeType)} · {fmtSize(file.size)}
                          {file.uploadedAt ? ` · ${new Date(file.uploadedAt).toLocaleDateString()}` : ""}
                        </p>
                      </>
                    )}
                  </div>

                  {isPrimary && spec.primaryLabel && (
                    <span
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: "var(--primary)", color: "#fff" }}
                    >
                      <Star size={9} fill="currentColor" aria-hidden="true" /> {spec.primaryLabel}
                    </span>
                  )}

                  <div className="flex items-center gap-0.5">
                    <a
                      href={`/api/user/cv/files/${file._id}/raw`}
                      target="_blank"
                      rel="noreferrer"
                      title="View"
                      className="text-muted rounded-md p-1.5 transition hover:bg-[var(--surface-2)] hover:text-foreground"
                    >
                      <Eye size={14} />
                    </a>
                    <a
                      href={`/api/user/cv/files/${file._id}/raw?download=1`}
                      title="Download"
                      className="text-muted rounded-md p-1.5 transition hover:bg-[var(--surface-2)] hover:text-foreground"
                    >
                      <Download size={14} />
                    </a>
                    <button
                      type="button"
                      onClick={() => { setRenameId(file._id); setRenameValue(file.name); }}
                      title="Rename"
                      className="text-muted rounded-md p-1.5 transition hover:bg-[var(--surface-2)] hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                    {spec.primaryLabel && (
                      <button
                        type="button"
                        onClick={() => togglePrimary(file._id)}
                        disabled={busy}
                        title={isPrimary ? `Unset as ${spec.primaryLabel}` : `Set as ${spec.primaryLabel}`}
                        className={`rounded-md p-1.5 transition disabled:opacity-40 hover:bg-[var(--surface-2)] ${
                          isPrimary ? "text-amber-500" : "text-muted hover:text-amber-500"
                        }`}
                      >
                        {busy
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Star size={14} fill={isPrimary ? "currentColor" : "none"} />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(file._id, file.name)}
                      disabled={busy}
                      title="Delete"
                      className="text-muted rounded-md p-1.5 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
