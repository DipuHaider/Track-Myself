"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Eraser, Loader2, RotateCcw, Shield, Upload, X,
} from "lucide-react";
import ExportPanel from "@/components/tools/ExportPanel";
import { usePremium } from "@/hooks/usePremium";
import { MODEL_LICENCE, removeBackground, type RemovalProgress } from "@/lib/tools/backgroundRemoval";
import {
  baseName, formatBytes, withBackground,
} from "@/lib/tools/imageOps";

const SWATCHES = [
  { label: "Transparent", value: null },
  { label: "White",       value: "#ffffff" },
  { label: "Light grey",  value: "#f4f5f7" },
  { label: "Navy",        value: "#1e293b" },
  { label: "Brand blue",  value: "#2a78d6" },
  { label: "Warm sand",   value: "#efe6da" },
];

const CHECKERBOARD =
  "repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 18px 18px";

export default function BackgroundRemoverPage() {
  const { isPremium } = usePremium();

  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string>("");
  const [originalSize, setOriginalSize] = useState(0);
  const [cutout, setCutout] = useState<HTMLCanvasElement | null>(null);
  const [background, setBackground] = useState<string | null>(null);
  const [custom, setCustom] = useState("#2a78d6");
  const [compare, setCompare] = useState(false);
  const [progress, setProgress] = useState<RemovalProgress | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const run = useCallback(async (next: File) => {
    setError("");
    setCutout(null);
    setFile(next);
    setOriginalSize(next.size);
    setOriginalUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(next);
    });

    try {
      const { cutout: result } = await removeBackground(next, setProgress);
      setCutout(result);

      const host = previewRef.current;
      if (host) {
        host.innerHTML = "";
        result.style.maxWidth = "100%";
        result.style.maxHeight = "360px";
        result.style.objectFit = "contain";
        host.appendChild(result);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} If this keeps happening, try a smaller image or another browser.`
          : "Background removal failed.",
      );
    } finally {
      setProgress(null);
    }
  }, []);

  function onPick(files: FileList | null) {
    const next = files?.[0];
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    run(next);
  }

  function reset() {
    setFile(null);
    setCutout(null);
    setError("");
    setBackground(null);
    setOriginalUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return ""; });
    if (previewRef.current) previewRef.current.innerHTML = "";
  }

  const exportCanvas = cutout ? withBackground(cutout, background) : null;
  const busy = Boolean(progress);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/tools" className="text-muted mb-3 inline-flex items-center gap-1.5 text-sm hover:underline">
          <ArrowLeft size={14} aria-hidden="true" /> All tools
        </Link>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Eraser size={26} style={{ color: "#8b5cf6" }} aria-hidden="true" />
          Background Remover
        </h1>
        <p className="text-muted mt-2 text-sm">
          Cut the background out of a photo, drop in any colour you like, and download an optimised image.
          Everything runs in your browser — the picture is never uploaded anywhere.
        </p>
      </div>

      {!file && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); onPick(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-16 transition hover:bg-[var(--surface-2)]"
          style={{
            borderColor: dragging ? "var(--primary)" : "var(--border)",
            background: dragging ? "var(--surface-2)" : undefined,
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { onPick(e.target.files); e.target.value = ""; }}
          />
          <Upload size={30} className="text-muted" aria-hidden="true" />
          <p className="text-sm font-medium">
            Drop a photo here or <span style={{ color: "var(--primary)" }}>browse</span>
          </p>
          <p className="text-muted text-xs">JPG, PNG or WebP · works best on people and products</p>
        </div>
      )}

      {error && (
        <p className="surface rounded-lg border p-4 text-sm text-red-600">{error}</p>
      )}

      {file && (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-4">
            <div className="surface overflow-hidden rounded-xl border">
              <div className="surface-muted flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
                <p className="truncate text-xs font-medium">{file.name}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCompare((v) => !v)}
                    disabled={!cutout}
                    className="rounded-md border px-2.5 py-1 text-[11px] font-medium transition hover:bg-[var(--surface-2)] disabled:opacity-40"
                  >
                    {compare ? "Show result" : "Show original"}
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="text-muted rounded-md p-1.5 transition hover:bg-[var(--surface-2)]"
                    aria-label="Start over"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div
                className="flex min-h-[360px] items-center justify-center p-4"
                style={{ background: background ?? CHECKERBOARD }}
              >
                {busy && (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Loader2 size={26} className="animate-spin" style={{ color: "var(--primary)" }} aria-hidden="true" />
                    <p className="text-sm font-medium">{progress?.message}</p>
                    {typeof progress?.percent === "number" && (
                      <div className="h-1.5 w-56 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                        <div
                          className="h-full rounded-full transition-[width]"
                          style={{ width: `${progress.percent}%`, background: "var(--primary)" }}
                        />
                      </div>
                    )}
                    <p className="text-muted text-[11px]">
                      The model downloads once, then stays cached in your browser.
                    </p>
                  </div>
                )}

                {!busy && compare && originalUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={originalUrl} alt="Original" className="max-h-[360px] max-w-full object-contain" />
                )}

                <div ref={previewRef} className={busy || compare ? "hidden" : "flex justify-center"} />
              </div>
            </div>

            {cutout && (
              <div className="surface rounded-xl border p-5">
                <h3 className="mb-3 text-sm font-semibold">Background</h3>
                <div className="flex flex-wrap gap-2">
                  {SWATCHES.map((s) => {
                    const active = background === s.value;
                    return (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => setBackground(s.value)}
                        className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition"
                        style={active
                          ? { borderColor: "var(--primary)", boxShadow: "0 0 0 1px var(--primary)" }
                          : { borderColor: "var(--border)" }}
                      >
                        <span
                          aria-hidden="true"
                          className="h-3.5 w-3.5 rounded-full border"
                          style={{ background: s.value ?? CHECKERBOARD, borderColor: "var(--border)" }}
                        />
                        {s.label}
                      </button>
                    );
                  })}

                  <label className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium"
                    style={{ borderColor: background === custom ? "var(--primary)" : "var(--border)" }}>
                    <input
                      type="color"
                      value={custom}
                      onChange={(e) => { setCustom(e.target.value); setBackground(e.target.value); }}
                      className="h-3.5 w-3.5 cursor-pointer border-0 bg-transparent p-0"
                      aria-label="Custom background colour"
                    />
                    Custom
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <ExportPanel
              canvas={exportCanvas}
              baseFileName={baseName(file.name)}
              isPremium={isPremium}
              hasTransparency={background === null}
              suffix="_no-bg"
            />

            {cutout && (
              <Link
                href="/tools/profile-image"
                className="surface flex items-center justify-between gap-2 rounded-xl border p-4 text-sm transition hover:bg-[var(--surface-2)]"
              >
                <span>
                  <span className="block font-medium">Make it a profile picture</span>
                  <span className="text-muted text-xs">Crop, shape and platform sizes</span>
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            )}

            <div className="surface rounded-xl border p-4">
              <p className="text-muted flex items-start gap-2 text-[11px] leading-relaxed">
                <Shield size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  Runs entirely on your device with {MODEL_LICENCE}. Original file{" "}
                  {formatBytes(originalSize)}.
                </span>
              </p>
              <button
                type="button"
                onClick={() => file && run(file)}
                disabled={busy}
                className="text-muted mt-3 flex items-center gap-1.5 text-[11px] hover:underline disabled:opacity-40"
              >
                <RotateCcw size={11} aria-hidden="true" /> Run again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
