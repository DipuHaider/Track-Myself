"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2, Lock, Star } from "lucide-react";
import {
  FORMAT_EXT, FORMAT_LABEL, FREE_MAX_EDGE,
  canvasToBlob, downloadBlob, fitWithin, formatBytes, resizeCanvas,
  type ExportFormat,
} from "@/lib/tools/imageOps";

const FORMATS: ExportFormat[] = ["image/png", "image/jpeg", "image/webp"];

type Resolution = "original" | "2048" | "1024" | "512";

const RESOLUTIONS: { value: Resolution; label: string }[] = [
  { value: "original", label: "Original (full resolution)" },
  { value: "2048",     label: "Large — 2048 px" },
  { value: "1024",     label: "Medium — 1024 px" },
  { value: "512",      label: "Small — 512 px" },
];

export default function ExportPanel({
  canvas, baseFileName, isPremium, hasTransparency, suffix = "",
}: {
  canvas: HTMLCanvasElement | null;
  baseFileName: string;
  isPremium: boolean;
  hasTransparency: boolean;
  suffix?: string;
}) {
  const [format, setFormat] = useState<ExportFormat>(hasTransparency ? "image/png" : "image/jpeg");
  const [resolution, setResolution] = useState<Resolution>("original");
  const [quality, setQuality] = useState(85);
  const [estimate, setEstimate] = useState<{ size: number; width: number; height: number } | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const effectiveFormat: ExportFormat = isPremium
    ? format
    : hasTransparency ? "image/png" : "image/jpeg";
  const effectiveQuality = isPremium ? quality : 82;

  function targetCanvas() {
    if (!canvas) return null;
    const maxEdge = isPremium
      ? (resolution === "original" ? Math.max(canvas.width, canvas.height) : Number(resolution))
      : FREE_MAX_EDGE;
    const size = fitWithin(canvas.width, canvas.height, maxEdge);
    if (size.width === canvas.width && size.height === canvas.height) return canvas;
    return resizeCanvas(canvas, size.width, size.height);
  }

  useEffect(() => {
    let alive = true;

    const timer = setTimeout(async () => {
      if (!canvas) {
        if (alive) setEstimate(null);
        return;
      }
      try {
        const target = targetCanvas();
        if (!target) return;
        const blob = await canvasToBlob(target, effectiveFormat, effectiveQuality);
        if (alive) setEstimate({ size: blob.size, width: target.width, height: target.height });
      } catch {
        if (alive) setEstimate(null);
      }
    }, 220);

    return () => { alive = false; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, effectiveFormat, effectiveQuality, resolution, isPremium]);

  async function handleDownload() {
    if (!canvas) return;
    setWorking(true);
    setError("");
    try {
      const target = targetCanvas();
      if (!target) return;
      const blob = await canvasToBlob(target, effectiveFormat, effectiveQuality);
      downloadBlob(blob, `${baseFileName}${suffix}_${target.width}x${target.height}.${FORMAT_EXT[effectiveFormat]}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not export that image.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="surface space-y-4 rounded-xl border p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Download</h3>
        {isPremium ? (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: "#10b98122", color: "#047857" }}
          >
            <Star size={9} fill="currentColor" aria-hidden="true" /> Premium
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: "#f59e0b22", color: "#d97706" }}
          >
            Free
          </span>
        )}
      </div>

      {isPremium ? (
        <>
          <div>
            <label className="text-muted mb-1 block text-xs font-medium">Resolution</label>
            <select
              className="surface w-full rounded-md border px-3 py-2 text-sm"
              value={resolution}
              onChange={(e) => setResolution(e.target.value as Resolution)}
            >
              {RESOLUTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-muted mb-1 block text-xs font-medium">Format</label>
            <div className="flex gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className="flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition"
                  style={format === f
                    ? { borderColor: "var(--primary)", color: "var(--primary)", background: "var(--surface-2)" }
                    : { borderColor: "var(--border)" }}
                >
                  {FORMAT_LABEL[f]}
                </button>
              ))}
            </div>
            {hasTransparency && format !== "image/png" && (
              <p className="text-muted mt-1.5 text-[11px]">
                {format === "image/jpeg"
                  ? "JPG has no transparency — the cut-out is placed on white."
                  : "WebP keeps transparency and files stay small."}
              </p>
            )}
          </div>

          {format !== "image/png" && (
            <div>
              <label className="text-muted mb-1 flex items-center justify-between text-xs font-medium">
                Quality <span>{quality}%</span>
              </label>
              <input
                type="range"
                min={40}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border px-4 py-3" style={{ borderColor: "#f59e0b44", background: "#fffbeb" }}>
          <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#92400e" }}>
            <Lock size={12} aria-hidden="true" />
            Optimised download — up to {FREE_MAX_EDGE} px, {FORMAT_LABEL[effectiveFormat]}
          </p>
          <p className="mt-1 text-[11px]" style={{ color: "#b45309" }}>
            Premium unlocks full resolution, PNG / JPG / WebP and a quality slider.{" "}
            <Link href="/me" className="underline">Upgrade</Link>
          </p>
        </div>
      )}

      <div className="text-muted flex items-center justify-between text-xs">
        <span>
          {!canvas
            ? "Nothing to export yet"
            : estimate ? `${estimate.width} × ${estimate.height} px` : "Measuring…"}
        </span>
        <span>{canvas && estimate ? formatBytes(estimate.size) : ""}</span>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleDownload}
        disabled={!canvas || working}
        className="btn-primary flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {working
          ? <><Loader2 size={15} className="animate-spin" aria-hidden="true" /> Preparing…</>
          : <><Download size={15} aria-hidden="true" /> Download {FORMAT_LABEL[effectiveFormat]}</>}
      </button>
    </div>
  );
}
