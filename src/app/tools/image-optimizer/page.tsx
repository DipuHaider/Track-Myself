"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, ImageIcon, Trash2, Upload, X } from "lucide-react";

type OutputFormat = "original" | "image/jpeg" | "image/png" | "image/webp";

interface ImageEntry {
  id: string;
  file: File;
  originalUrl: string;
  originalSize: number;
  compressed: { blob: Blob; url: string; size: number } | null;
  processing: boolean;
  error: string | null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function ext(format: OutputFormat, originalType: string): string {
  const t = format === "original" ? originalType : format;
  return t === "image/png" ? "png" : t === "image/webp" ? "webp" : "jpg";
}

async function compress(
  file: File,
  quality: number,
  format: OutputFormat,
): Promise<{ blob: Blob; url: string; size: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(objUrl); reject(new Error("Canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objUrl);
      const mime = format === "original" ? (file.type || "image/jpeg") : format;
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Compression failed")); return; }
          resolve({ blob, url: URL.createObjectURL(blob), size: blob.size });
        },
        mime,
        quality / 100,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error("Failed to load image")); };
    img.src = objUrl;
  });
}

export default function ImageOptimizerPage() {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [quality, setQuality] = useState(80);
  const [format, setFormat] = useState<OutputFormat>("original");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const accepted = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!accepted.length) return;
    setImages((prev) => [
      ...prev,
      ...accepted.map((file) => ({
        id: Math.random().toString(36).slice(2),
        file,
        originalUrl: URL.createObjectURL(file),
        originalSize: file.size,
        compressed: null,
        processing: false,
        error: null,
      })),
    ]);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const processAll = async () => {
    setImages((prev) =>
      prev.map((img) => ({ ...img, processing: !img.compressed, error: null })),
    );
    for (const entry of images) {
      if (entry.compressed) continue;
      try {
        const result = await compress(entry.file, quality, format);
        setImages((prev) =>
          prev.map((img) =>
            img.id === entry.id ? { ...img, compressed: result, processing: false } : img,
          ),
        );
      } catch (e) {
        setImages((prev) =>
          prev.map((img) =>
            img.id === entry.id
              ? { ...img, error: (e as Error).message, processing: false }
              : img,
          ),
        );
      }
    }
  };

  const reprocessAll = async () => {
    setImages((prev) =>
      prev.map((img) => ({ ...img, compressed: null, processing: true, error: null })),
    );
    for (const entry of images) {
      try {
        const result = await compress(entry.file, quality, format);
        setImages((prev) =>
          prev.map((img) =>
            img.id === entry.id ? { ...img, compressed: result, processing: false } : img,
          ),
        );
      } catch (e) {
        setImages((prev) =>
          prev.map((img) =>
            img.id === entry.id
              ? { ...img, error: (e as Error).message, processing: false }
              : img,
          ),
        );
      }
    }
  };

  const remove = (id: string) =>
    setImages((prev) => prev.filter((img) => img.id !== id));

  const download = (entry: ImageEntry) => {
    if (!entry.compressed) return;
    const a = document.createElement("a");
    a.href = entry.compressed.url;
    const base = entry.file.name.replace(/\.[^.]+$/, "");
    a.download = `${base}-optimized.${ext(format, entry.file.type)}`;
    a.click();
  };

  const downloadAll = () => images.filter((i) => i.compressed).forEach(download);

  const processed = images.filter((i) => i.compressed);
  const totalOriginal = processed.reduce((s, i) => s + i.originalSize, 0);
  const totalCompressed = processed.reduce((s, i) => s + (i.compressed?.size ?? 0), 0);
  const savings = totalOriginal > 0 ? Math.round((1 - totalCompressed / totalOriginal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Back + title */}
      <div>
        <Link
          href="/tools"
          className="text-muted mb-3 inline-flex items-center gap-1.5 text-sm hover:underline"
        >
          <ArrowLeft size={14} /> Back to Tools
        </Link>
        <h1 className="text-2xl font-bold">Image Optimizer</h1>
        <p className="text-muted mt-1 text-sm">
          Compress images in your browser — nothing is uploaded to any server.
        </p>
      </div>

      {/* Controls */}
      <div className="surface flex flex-wrap items-center gap-6 rounded-xl border p-5">
        <div className="flex flex-1 flex-col gap-1.5 min-w-[180px]">
          <label className="text-sm font-medium">
            Quality — <span style={{ color: "var(--primary)" }}>{quality}%</span>
          </label>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full accent-[var(--primary)]"
          />
          <div className="flex justify-between text-xs text-muted">
            <span>Smaller file</span><span>Better quality</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Output format</label>
          <div className="flex rounded-lg border overflow-hidden text-sm">
            {(["original", "image/jpeg", "image/png", "image/webp"] as OutputFormat[]).map((f, i) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`px-3 py-1.5 transition ${i > 0 ? "border-l" : ""} ${
                  format === f ? "bg-[var(--primary)] text-white" : "hover:bg-[var(--surface-2)]"
                }`}
              >
                {f === "original" ? "Original" : f.split("/")[1].toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {images.length > 0 && (
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={reprocessAll}
              className="rounded-md border px-4 py-2 text-sm transition hover:bg-[var(--surface-2)]"
            >
              Re-process
            </button>
            {processed.length > 1 && (
              <button
                type="button"
                onClick={downloadAll}
                className="btn-primary rounded-md px-4 py-2 text-sm"
              >
                Download all ({processed.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Savings summary */}
      {processed.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-3 text-sm dark:border-green-900 dark:bg-green-950/30">
          <span className="font-semibold text-green-700 dark:text-green-400">
            {savings}% smaller
          </span>
          <span className="text-green-600 dark:text-green-500">
            {" "}— {formatBytes(totalOriginal)} → {formatBytes(totalCompressed)} ({processed.length} image{processed.length !== 1 ? "s" : ""})
          </span>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 text-center transition ${
          dragging
            ? "border-[var(--primary)] bg-[var(--primary)]/5"
            : "border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--surface-2)]"
        }`}
      >
        <Upload size={28} className="text-muted" />
        <div>
          <p className="font-medium">Drop images here or click to upload</p>
          <p className="text-muted mt-1 text-sm">JPEG, PNG, WebP — any size</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* Image list */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{images.length} image{images.length !== 1 ? "s" : ""}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={processAll}
                className="btn-primary rounded-md px-4 py-1.5 text-sm"
                disabled={images.every((i) => i.compressed || i.processing)}
              >
                Optimise all
              </button>
              <button
                type="button"
                onClick={() => setImages([])}
                className="rounded-md border px-3 py-1.5 text-sm transition hover:bg-red-50 hover:text-red-600"
              >
                Clear all
              </button>
            </div>
          </div>

          {images.map((entry) => {
            const saving =
              entry.compressed
                ? Math.round((1 - entry.compressed.size / entry.originalSize) * 100)
                : null;

            return (
              <div key={entry.id} className="surface flex items-center gap-4 rounded-xl border p-4">
                {/* Thumbnail */}
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.compressed?.url ?? entry.originalUrl}
                    alt={entry.file.name}
                    className="h-full w-full object-cover"
                  />
                  {entry.processing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.file.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                    <span>Original: {formatBytes(entry.originalSize)}</span>
                    {entry.compressed && (
                      <>
                        <span>→ {formatBytes(entry.compressed.size)}</span>
                        <span
                          className={`font-semibold ${
                            saving! > 0 ? "text-green-600" : "text-amber-600"
                          }`}
                        >
                          {saving! > 0 ? `-${saving}%` : `+${Math.abs(saving!)}%`}
                        </span>
                      </>
                    )}
                    {entry.error && (
                      <span className="text-red-500">{entry.error}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1.5">
                  {!entry.compressed && !entry.processing && !entry.error && (
                    <button
                      type="button"
                      onClick={async () => {
                        setImages((p) => p.map((i) => i.id === entry.id ? { ...i, processing: true } : i));
                        try {
                          const result = await compress(entry.file, quality, format);
                          setImages((p) => p.map((i) => i.id === entry.id ? { ...i, compressed: result, processing: false } : i));
                        } catch (e) {
                          setImages((p) => p.map((i) => i.id === entry.id ? { ...i, error: (e as Error).message, processing: false } : i));
                        }
                      }}
                      className="rounded-md border px-3 py-1.5 text-xs transition hover:bg-[var(--surface-2)]"
                    >
                      Optimise
                    </button>
                  )}
                  {entry.compressed && (
                    <button
                      type="button"
                      onClick={() => download(entry)}
                      title="Download"
                      className="rounded-md p-1.5 text-muted transition hover:bg-[var(--surface-2)] hover:text-primary"
                    >
                      <Download size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(entry.id)}
                    title="Remove"
                    className="rounded-md p-1.5 text-muted transition hover:bg-red-50 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {images.length === 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-dashed p-5 text-sm text-muted">
          <ImageIcon size={20} className="shrink-0" />
          No images added yet. Drop some above to get started.
        </div>
      )}
    </div>
  );
}
