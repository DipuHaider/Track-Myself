"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Circle, Loader2, RotateCcw, Shield, Sparkles,
  Square, SquareRoundCorner, Upload, Wand2, X,
} from "lucide-react";
import ExportPanel from "@/components/tools/ExportPanel";
import { usePremium } from "@/hooks/usePremium";
import { MODEL_LICENCE, removeBackground, type RemovalProgress } from "@/lib/tools/backgroundRemoval";
import {
  NEUTRAL_ADJUSTMENTS, autoAdjustments, baseName, canvasFromImage,
  composeProfile, loadImage,
  type Adjustments, type ProfileShape,
} from "@/lib/tools/imageOps";

type Preset = { key: string; label: string; hint: string; size: number; shape: ProfileShape };

const PRESETS: Preset[] = [
  { key: "linkedin", label: "LinkedIn",  hint: "400 × 400 · circle mask",  size: 400, shape: "circle" },
  { key: "github",   label: "GitHub",    hint: "460 × 460 · rounded",      size: 460, shape: "rounded" },
  { key: "cv",       label: "CV / Europass", hint: "413 × 531 · 35×45 mm", size: 413, shape: "square" },
  { key: "square",   label: "Universal", hint: "1024 × 1024",              size: 1024, shape: "circle" },
];

const SHAPES: { value: ProfileShape; label: string; icon: React.ReactNode }[] = [
  { value: "circle",  label: "Circle",  icon: <Circle size={15} /> },
  { value: "rounded", label: "Rounded", icon: <SquareRoundCorner size={15} /> },
  { value: "square",  label: "Square",  icon: <Square size={15} /> },
];

const BACKGROUNDS = [
  { label: "Transparent", value: null },
  { label: "White",       value: "#ffffff" },
  { label: "Studio grey", value: "#eef1f5" },
  { label: "Navy",        value: "#1e293b" },
  { label: "Brand blue",  value: "#2a78d6" },
  { label: "Sand",        value: "#efe6da" },
];

const CHECKERBOARD =
  "repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 18px 18px";

export default function ProfileImagePage() {
  const { isPremium } = usePremium();

  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState<HTMLCanvasElement | null>(null);
  const [removedBg, setRemovedBg] = useState(true);
  const [progress, setProgress] = useState<RemovalProgress | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const [preset, setPreset] = useState<Preset>(PRESETS[0]);
  const [shape, setShape] = useState<ProfileShape>("circle");
  const [background, setBackground] = useState<string | null>("#eef1f5");
  const [custom, setCustom] = useState("#2a78d6");
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [adjustments, setAdjustments] = useState<Adjustments>(NEUTRAL_ADJUSTMENTS);
  const [autoApplied, setAutoApplied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const presetHeight = preset.key === "cv" ? 531 : preset.size;

  const load = useCallback(async (next: File, cutBackground: boolean) => {
    setError("");
    setSubject(null);
    setFile(next);
    setAutoApplied(false);

    try {
      if (cutBackground) {
        const { cutout } = await removeBackground(next, setProgress);
        setSubject(cutout);
        setAdjustments(autoAdjustments(cutout));
      } else {
        const url = URL.createObjectURL(next);
        try {
          const canvas = canvasFromImage(await loadImage(url));
          setSubject(canvas);
          setAdjustments(autoAdjustments(canvas));
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      setAutoApplied(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process that image.");
    } finally {
      setProgress(null);
    }
  }, []);

  const output = useMemo(
    () => (subject
      ? composeProfile(subject, {
          size: { width: preset.size, height: presetHeight },
          zoom, offsetX, offsetY, background, shape, adjustments,
        })
      : null),
    [subject, preset.size, presetHeight, zoom, offsetX, offsetY, background, shape, adjustments],
  );

  useEffect(() => {
    const host = previewRef.current;
    if (!host) return;

    host.innerHTML = "";
    if (!subject) return;

    const view = composeProfile(subject, {
      size: { width: 320, height: Math.round((presetHeight / preset.size) * 320) },
      zoom, offsetX, offsetY, background, shape, adjustments,
    });
    view.style.maxWidth = "100%";
    host.appendChild(view);
  }, [subject, preset.size, presetHeight, zoom, offsetX, offsetY, background, shape, adjustments]);

  function onPick(files: FileList | null) {
    const next = files?.[0];
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    load(next, removedBg);
  }

  function reset() {
    setFile(null);
    setSubject(null);
    setError("");
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setAdjustments(NEUTRAL_ADJUSTMENTS);
    if (previewRef.current) previewRef.current.innerHTML = "";
  }

  const busy = Boolean(progress);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/tools" className="text-muted mb-3 inline-flex items-center gap-1.5 text-sm hover:underline">
          <ArrowLeft size={14} aria-hidden="true" /> All tools
        </Link>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Sparkles size={26} style={{ color: "#0ea5e9" }} aria-hidden="true" />
          Profile Image Generator
        </h1>
        <p className="text-muted mt-2 text-sm">
          Turn any photo into a clean headshot: background removed, lighting corrected, cropped to the
          shape and size each platform expects. Nothing leaves your browser.
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
            Drop a headshot here or <span style={{ color: "var(--primary)" }}>browse</span>
          </p>
          <p className="text-muted text-xs">A front-facing photo with your shoulders in frame works best</p>
        </div>
      )}

      {error && <p className="surface rounded-lg border p-4 text-sm text-red-600">{error}</p>}

      {file && (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-4">
            <div className="surface overflow-hidden rounded-xl border">
              <div className="surface-muted flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
                <p className="truncate text-xs font-medium">{file.name}</p>
                <button
                  type="button"
                  onClick={reset}
                  className="text-muted rounded-md p-1.5 transition hover:bg-[var(--surface-2)]"
                  aria-label="Start over"
                >
                  <X size={14} />
                </button>
              </div>

              <div
                className="flex min-h-[360px] items-center justify-center p-6"
                style={{ background: CHECKERBOARD }}
              >
                {busy ? (
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
                  </div>
                ) : (
                  <div ref={previewRef} className="flex justify-center" />
                )}
              </div>
            </div>

            {subject && (
              <>
                <div className="surface rounded-xl border p-5">
                  <h3 className="mb-3 text-sm font-semibold">Where is it going?</h3>
                  <div className="grid gap-2 sm:grid-cols-4">
                    {PRESETS.map((p) => {
                      const active = preset.key === p.key;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => { setPreset(p); setShape(p.shape); }}
                          className="rounded-lg border px-3 py-2 text-left transition"
                          style={active
                            ? { borderColor: "var(--primary)", boxShadow: "0 0 0 1px var(--primary)" }
                            : { borderColor: "var(--border)" }}
                        >
                          <span className="block text-xs font-semibold">{p.label}</span>
                          <span className="text-muted block text-[10px]">{p.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="surface space-y-4 rounded-xl border p-5">
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Shape</h3>
                    <div className="flex gap-2">
                      {SHAPES.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setShape(s.value)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition"
                          style={shape === s.value
                            ? { borderColor: "var(--primary)", color: "var(--primary)", background: "var(--surface-2)" }
                            : { borderColor: "var(--border)" }}
                        >
                          {s.icon} {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Background</h3>
                    <div className="flex flex-wrap gap-2">
                      {BACKGROUNDS.map((b) => (
                        <button
                          key={b.label}
                          type="button"
                          onClick={() => setBackground(b.value)}
                          className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition"
                          style={background === b.value
                            ? { borderColor: "var(--primary)", boxShadow: "0 0 0 1px var(--primary)" }
                            : { borderColor: "var(--border)" }}
                        >
                          <span
                            aria-hidden="true"
                            className="h-3.5 w-3.5 rounded-full border"
                            style={{ background: b.value ?? CHECKERBOARD, borderColor: "var(--border)" }}
                          />
                          {b.label}
                        </button>
                      ))}
                      <label
                        className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium"
                        style={{ borderColor: background === custom ? "var(--primary)" : "var(--border)" }}
                      >
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
                    {!removedBg && (
                      <p className="text-muted mt-2 text-[11px]">
                        Background colours need the cut-out — turn background removal back on to use them.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <Slider label="Zoom" value={zoom} min={1} max={2.5} step={0.01}
                      display={`${Math.round(zoom * 100)}%`} onChange={setZoom} />
                    <Slider label="Move ←→" value={offsetX} min={-40} max={40} step={1}
                      display={`${offsetX}`} onChange={setOffsetX} />
                    <Slider label="Move ↑↓" value={offsetY} min={-40} max={40} step={1}
                      display={`${offsetY}`} onChange={setOffsetY} />
                  </div>
                </div>

                <div className="surface space-y-4 rounded-xl border p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">Lighting</h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAdjustments(autoAdjustments(subject))}
                        className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-2)]"
                      >
                        <Wand2 size={12} aria-hidden="true" /> Auto-correct
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustments(NEUTRAL_ADJUSTMENTS)}
                        className="text-muted flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-2)]"
                      >
                        <RotateCcw size={12} aria-hidden="true" /> Reset
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <Slider label="Brightness" value={adjustments.brightness} min={-50} max={50} step={1}
                      display={`${adjustments.brightness}`}
                      onChange={(v) => setAdjustments((a) => ({ ...a, brightness: v }))} />
                    <Slider label="Contrast" value={adjustments.contrast} min={-50} max={50} step={1}
                      display={`${adjustments.contrast}`}
                      onChange={(v) => setAdjustments((a) => ({ ...a, contrast: v }))} />
                    <Slider label="Saturation" value={adjustments.saturation} min={-50} max={50} step={1}
                      display={`${adjustments.saturation}`}
                      onChange={(v) => setAdjustments((a) => ({ ...a, saturation: v }))} />
                  </div>

                  {autoApplied && (
                    <p className="text-muted text-[11px]">
                      Lighting was measured from your photo and corrected automatically — adjust anything you like.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="space-y-4">
            <ExportPanel
              canvas={output}
              baseFileName={baseName(file.name)}
              isPremium={isPremium}
              hasTransparency={background === null}
              suffix={`_${preset.key}`}
            />

            <div className="surface rounded-xl border p-4">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={removedBg}
                  onChange={(e) => {
                    setRemovedBg(e.target.checked);
                    if (file) load(file, e.target.checked);
                  }}
                />
                Remove the background
              </label>
              <p className="text-muted mt-2 flex items-start gap-2 text-[11px] leading-relaxed">
                <Shield size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>Runs on your device with {MODEL_LICENCE}.</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Slider({
  label, value, min, max, step, display, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
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
