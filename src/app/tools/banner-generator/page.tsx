"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Download, Eye, Image as ImageIcon, Layers, Loader2,
  Lock, Sparkles, Star, Upload, Wand2, X,
} from "lucide-react";
import { usePremium } from "@/hooks/usePremium";
import { BANNER_PRESETS, CUSTOM_PRESET, type BannerPreset } from "@/lib/tools/bannerPresets";
import {
  BANNER_LAYOUTS, BANNER_STYLES, DEFAULT_BRIEF, drawSafeZones, renderBanner,
  type BannerBrief, type BannerLayout, type BannerStyle,
} from "@/lib/tools/bannerRender";
import {
  FORMAT_EXT, FORMAT_LABEL, canvasToBlob, downloadBlob, formatBytes,
  loadImage, type ExportFormat,
} from "@/lib/tools/imageOps";

const EXAMPLES = [
  "Md Fuad Haider Dipu — AI-First Full-Stack Developer, 14 years, Next.js, TypeScript, RAG, MCP. Relocating to Germany 2027.",
  "Cloud platform engineer specialising in Kubernetes, Terraform and cost optimisation. Open to staff roles.",
  "Product designer turning research into shipped interfaces. Figma, design systems, accessibility.",
];

export default function BannerGeneratorPage() {
  const { isPremium } = usePremium();

  const [prompt, setPrompt] = useState("");
  const [brief, setBrief] = useState<BannerBrief>(DEFAULT_BRIEF);
  const [briefSource, setBriefSource] = useState<"ai" | "local" | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const [preset, setPreset] = useState<BannerPreset>(BANNER_PRESETS[0]);
  const [customWidth, setCustomWidth] = useState(1600);
  const [customHeight, setCustomHeight] = useState(400);
  const [showSafeZones, setShowSafeZones] = useState(true);

  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoOffsetX, setPhotoOffsetX] = useState(0);
  const [photoOffsetY, setPhotoOffsetY] = useState(0);
  const [photoOverlay, setPhotoOverlay] = useState(0.45);

  const [format, setFormat] = useState<ExportFormat>("image/png");
  const [quality, setQuality] = useState(90);
  const [retina, setRetina] = useState(false);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const activePreset: BannerPreset = useMemo(
    () => (preset.key === "custom"
      ? { ...CUSTOM_PRESET, width: customWidth, height: customHeight }
      : preset),
    [preset, customWidth, customHeight],
  );

  const effectiveFormat: ExportFormat = isPremium ? format : "image/png";
  const effectiveQuality = isPremium ? quality : 92;
  const exportScale = isPremium && retina ? 2 : 1;

  const build = useCallback(
    (scale: number) =>
      renderBanner({
        preset: activePreset,
        brief,
        scale,
        photo,
        photoZoom,
        photoOffsetX,
        photoOffsetY,
        photoOverlay,
      }),
    [activePreset, brief, photo, photoZoom, photoOffsetX, photoOffsetY, photoOverlay],
  );

  useEffect(() => {
    const host = previewRef.current;
    if (!host) return;

    const previewScale = Math.min(1, 880 / activePreset.width);
    const canvas = build(previewScale);

    if (showSafeZones) {
      const ctx = canvas.getContext("2d");
      if (ctx) drawSafeZones(ctx, activePreset, previewScale);
    }

    canvas.style.width = "100%";
    canvas.style.height = "auto";
    canvas.style.display = "block";
    canvas.style.borderRadius = "8px";

    host.innerHTML = "";
    host.appendChild(canvas);
  }, [build, activePreset, showSafeZones]);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        const blob = await canvasToBlob(build(exportScale), effectiveFormat, effectiveQuality);
        if (alive) setEstimate(blob.size);
      } catch {
        if (alive) setEstimate(null);
      }
    }, 260);
    return () => { alive = false; clearTimeout(timer); };
  }, [build, exportScale, effectiveFormat, effectiveQuality]);

  async function generate() {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/tools/banner-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, platform: activePreset.platform }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not build that banner.");
        return;
      }
      setBrief({
        headline: data.headline ?? "",
        subheadline: data.subheadline ?? "",
        tagline: data.tagline ?? "",
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
        palette: data.palette ?? DEFAULT_BRIEF.palette,
        style: (BANNER_STYLES as readonly string[]).includes(data.style) ? data.style : "gradient",
        layout: (BANNER_LAYOUTS as readonly string[]).includes(data.layout) ? data.layout : "left",
      });
      setBriefSource(data.source === "ai" ? "ai" : "local");
    } catch {
      setError("Could not reach the banner service.");
    } finally {
      setGenerating(false);
    }
  }

  async function pickPhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file?.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    try {
      setPhoto(await loadImage(url));
      setPhotoName(file.name);
    } catch {
      setError("Could not read that image.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function download(target: BannerPreset) {
    setDownloading(true);
    setError("");
    try {
      const canvas = renderBanner({
        preset: target,
        brief,
        scale: exportScale,
        photo,
        photoZoom,
        photoOffsetX,
        photoOffsetY,
        photoOverlay,
      });
      const blob = await canvasToBlob(canvas, effectiveFormat, effectiveQuality);
      downloadBlob(
        blob,
        `banner_${target.key}_${canvas.width}x${canvas.height}.${FORMAT_EXT[effectiveFormat]}`,
      );
      return blob.size;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not export that banner.");
      return 0;
    } finally {
      setDownloading(false);
    }
  }

  async function downloadAll() {
    for (const p of BANNER_PRESETS) {
      await download(p);
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  const oversize = activePreset.maxBytes && estimate ? estimate > activePreset.maxBytes : false;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/tools" className="text-muted mb-3 inline-flex items-center gap-1.5 text-sm hover:underline">
          <ArrowLeft size={14} aria-hidden="true" /> All tools
        </Link>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Layers size={26} style={{ color: "#f97316" }} aria-hidden="true" />
          Banner Generator &amp; Resizer
        </h1>
        <p className="text-muted mt-2 text-sm">
          Describe yourself and get a profile banner at the exact size LinkedIn, GitHub and X expect —
          with their safe zones drawn on, so nothing important sits under your avatar or gets cropped on mobile.
        </p>
      </div>

      <div className="surface space-y-3 rounded-xl border p-5">
        <label className="text-muted block text-xs font-medium">Describe your banner</label>
        <textarea
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
          style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--foreground)" }}
          rows={3}
          placeholder="Senior software engineer, 14 years, AI-first — Next.js, TypeScript, RAG, MCP. Open to remote EU roles."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={generate}
            disabled={!prompt.trim() || generating}
            className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {generating
              ? <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Designing…</>
              : <><Wand2 size={14} aria-hidden="true" /> Generate banner</>}
          </button>

          {briefSource && (
            <span className="text-muted text-[11px]">
              {briefSource === "ai" ? "Designed by AI from your prompt" : "Built from your prompt on the server"}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((example, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPrompt(example)}
              className="text-muted rounded-full border px-2.5 py-1 text-[11px] transition hover:bg-[var(--surface-2)]"
            >
              Example {i + 1}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <div className="surface overflow-hidden rounded-xl border">
            <div className="surface-muted flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
              <p className="text-xs font-medium">
                {activePreset.platform} · {activePreset.label} — {activePreset.width} × {activePreset.height}
              </p>
              <button
                type="button"
                onClick={() => setShowSafeZones((v) => !v)}
                className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition hover:bg-[var(--surface-2)]"
              >
                <Eye size={12} aria-hidden="true" /> {showSafeZones ? "Hide" : "Show"} safe zones
              </button>
            </div>
            <div className="p-4">
              <div ref={previewRef} />
              <p className="text-muted mt-2 text-[11px]">{activePreset.note}</p>
            </div>
          </div>

          <div className="surface rounded-xl border p-5">
            <h3 className="mb-3 text-sm font-semibold">Size</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              {[...BANNER_PRESETS, CUSTOM_PRESET].map((p) => {
                const active = preset.key === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPreset(p)}
                    className="rounded-lg border px-3 py-2 text-left transition"
                    style={active
                      ? { borderColor: "var(--primary)", boxShadow: "0 0 0 1px var(--primary)" }
                      : { borderColor: "var(--border)" }}
                  >
                    <span className="block text-xs font-semibold">{p.platform}</span>
                    <span className="text-muted block text-[10px]">
                      {p.label} · {p.key === "custom" ? "your size" : `${p.width}×${p.height}`}
                    </span>
                  </button>
                );
              })}
            </div>

            {preset.key === "custom" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Width (px)" value={customWidth} onChange={setCustomWidth} min={400} max={4000} />
                <Field label="Height (px)" value={customHeight} onChange={setCustomHeight} min={120} max={2000} />
              </div>
            )}
          </div>

          <div className="surface space-y-4 rounded-xl border p-5">
            <h3 className="text-sm font-semibold">Content</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Text label="Headline" value={brief.headline} onChange={(v) => setBrief((b) => ({ ...b, headline: v }))} />
              <Text label="Subheadline" value={brief.subheadline} onChange={(v) => setBrief((b) => ({ ...b, subheadline: v }))} />
              <Text label="Tagline" value={brief.tagline} onChange={(v) => setBrief((b) => ({ ...b, tagline: v }))} />
              <Text
                label="Keyword chips (comma separated)"
                value={brief.keywords.join(", ")}
                onChange={(v) => setBrief((b) => ({
                  ...b,
                  keywords: v.split(",").map((k) => k.trim()).filter(Boolean).slice(0, 6),
                }))}
              />
            </div>

            <div>
              <p className="text-muted mb-1.5 text-xs font-medium">Style</p>
              <div className="flex flex-wrap gap-2">
                {BANNER_STYLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setBrief((b) => ({ ...b, style: s as BannerStyle }))}
                    className="rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition"
                    style={brief.style === s
                      ? { borderColor: "var(--primary)", color: "var(--primary)", background: "var(--surface-2)" }
                      : { borderColor: "var(--border)" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-muted mb-1.5 text-xs font-medium">Layout</p>
              <div className="flex gap-2">
                {BANNER_LAYOUTS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setBrief((b) => ({ ...b, layout: l as BannerLayout }))}
                    className="flex-1 rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition"
                    style={brief.layout === l
                      ? { borderColor: "var(--primary)", color: "var(--primary)", background: "var(--surface-2)" }
                      : { borderColor: "var(--border)" }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-muted mb-1.5 text-xs font-medium">Colours</p>
              <div className="flex flex-wrap gap-3">
                {([
                  ["background", "Background"],
                  ["backgroundAlt", "Gradient end"],
                  ["accent", "Accent"],
                  ["text", "Text"],
                  ["muted", "Muted"],
                ] as [keyof BannerBrief["palette"], string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-[11px]">
                    <input
                      type="color"
                      value={brief.palette[key]}
                      onChange={(e) => setBrief((b) => ({
                        ...b,
                        palette: { ...b.palette, [key]: e.target.value },
                      }))}
                      className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
                      aria-label={label}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="surface space-y-3 rounded-xl border p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Use your own image</h3>
              {photo && (
                <button
                  type="button"
                  onClick={() => { setPhoto(null); setPhotoName(""); }}
                  className="text-muted flex items-center gap-1 text-[11px] hover:underline"
                >
                  <X size={11} aria-hidden="true" /> Remove
                </button>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { pickPhoto(e.target.files); e.target.value = ""; }}
            />

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-xs font-medium transition hover:bg-[var(--surface-2)]"
            >
              {photo ? <><ImageIcon size={13} aria-hidden="true" /> {photoName}</> : <><Upload size={13} aria-hidden="true" /> Upload a background photo</>}
            </button>

            {photo && (
              <div className="grid gap-3 sm:grid-cols-4">
                <Range label="Zoom" value={photoZoom} min={1} max={2.5} step={0.01} display={`${Math.round(photoZoom * 100)}%`} onChange={setPhotoZoom} />
                <Range label="Move ←→" value={photoOffsetX} min={-40} max={40} step={1} display={`${photoOffsetX}`} onChange={setPhotoOffsetX} />
                <Range label="Move ↑↓" value={photoOffsetY} min={-40} max={40} step={1} display={`${photoOffsetY}`} onChange={setPhotoOffsetY} />
                <Range label="Shade" value={photoOverlay} min={0} max={0.9} step={0.05} display={`${Math.round(photoOverlay * 100)}%`} onChange={setPhotoOverlay} />
              </div>
            )}
            <p className="text-muted text-[11px]">
              Any photo is resized to fill the selected banner exactly — this is the resizer.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface space-y-4 rounded-xl border p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Download</h3>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={isPremium
                  ? { background: "#10b98122", color: "#047857" }
                  : { background: "#f59e0b22", color: "#d97706" }}
              >
                {isPremium ? <><Star size={9} fill="currentColor" aria-hidden="true" /> Premium</> : "Free"}
              </span>
            </div>

            {isPremium ? (
              <>
                <div>
                  <label className="text-muted mb-1 block text-xs font-medium">Format</label>
                  <div className="flex gap-2">
                    {(["image/png", "image/jpeg", "image/webp"] as ExportFormat[]).map((f) => (
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
                </div>

                {format !== "image/png" && (
                  <Range label="Quality" value={quality} min={40} max={100} step={1} display={`${quality}%`} onChange={setQuality} />
                )}

                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={retina} onChange={(e) => setRetina(e.target.checked)} />
                  Export at 2× for retina screens
                </label>
              </>
            ) : (
              <div className="rounded-lg border px-4 py-3" style={{ borderColor: "#f59e0b44", background: "#fffbeb" }}>
                <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#92400e" }}>
                  <Lock size={12} aria-hidden="true" /> PNG at exact platform size
                </p>
                <p className="mt-1 text-[11px]" style={{ color: "#b45309" }}>
                  Premium adds JPG and WebP, a quality slider, 2× retina export and every size in one click.{" "}
                  <Link href="/me" className="underline">Upgrade</Link>
                </p>
              </div>
            )}

            <div className="text-muted flex items-center justify-between text-xs">
              <span>{activePreset.width * exportScale} × {activePreset.height * exportScale} px</span>
              <span>{estimate ? formatBytes(estimate) : "Measuring…"}</span>
            </div>

            {oversize && (
              <p className="text-[11px] text-amber-600">
                Larger than {activePreset.platform}&apos;s limit — lower the quality or use JPG.
              </p>
            )}

            <button
              type="button"
              onClick={() => download(activePreset)}
              disabled={downloading}
              className="btn-primary flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {downloading
                ? <><Loader2 size={15} className="animate-spin" aria-hidden="true" /> Preparing…</>
                : <><Download size={15} aria-hidden="true" /> Download {FORMAT_LABEL[effectiveFormat]}</>}
            </button>

            {isPremium && (
              <button
                type="button"
                onClick={downloadAll}
                disabled={downloading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-xs font-medium transition hover:bg-[var(--surface-2)] disabled:opacity-60"
              >
                <Sparkles size={13} aria-hidden="true" /> Download every platform size
              </button>
            )}
          </div>

          <div className="surface rounded-xl border p-4">
            <p className="text-muted text-[11px] leading-relaxed">
              Sizes follow each platform&apos;s current guidance: LinkedIn 1584 × 396 with the avatar overlapping
              the bottom-left, GitHub 1280 × 640 for repo previews, and X 1500 × 500 with a centre-cropped
              mobile view. Turn safe zones on to see exactly where content survives.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-muted mb-1 block text-xs font-medium">{label}</label>
      <input
        type="text"
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
        style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--foreground)" }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Field({
  label, value, onChange, min, max,
}: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number;
}) {
  return (
    <div>
      <label className="text-muted mb-1 block text-xs font-medium">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
        style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--foreground)" }}
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))}
      />
    </div>
  );
}

function Range({
  label, value, min, max, step, display, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  display: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-muted mb-1 flex items-center justify-between text-xs font-medium">
        {label} <span>{display}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
