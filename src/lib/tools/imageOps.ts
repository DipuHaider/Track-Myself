"use client";

export type ExportFormat = "image/png" | "image/jpeg" | "image/webp";
export type ProfileShape = "circle" | "rounded" | "square";

export const FORMAT_LABEL: Record<ExportFormat, string> = {
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/webp": "WebP",
};

export const FORMAT_EXT: Record<ExportFormat, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const FREE_MAX_EDGE = 1024;

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = src;
  });
}

export function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

export function fitWithin(width: number, height: number, maxEdge: number) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function resizeCanvas(source: HTMLCanvasElement, width: number, height: number) {
  const out = makeCanvas(width, height);
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, out.width, out.height);
  return out;
}

export function canvasFromImage(img: HTMLImageElement) {
  const canvas = makeCanvas(img.naturalWidth, img.naturalHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, 0, 0);
  return canvas;
}

export function withBackground(source: HTMLCanvasElement, background: string | null) {
  if (!background) return source;
  const out = makeCanvas(source.width, source.height);
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(source, 0, 0);
  return out;
}

export type Adjustments = {
  brightness: number;
  contrast: number;
  saturation: number;
};

export const NEUTRAL_ADJUSTMENTS: Adjustments = { brightness: 0, contrast: 0, saturation: 0 };

export function applyAdjustments(source: HTMLCanvasElement, adj: Adjustments) {
  if (adj.brightness === 0 && adj.contrast === 0 && adj.saturation === 0) return source;

  const out = makeCanvas(source.width, source.height);
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.filter = [
    `brightness(${1 + adj.brightness / 100})`,
    `contrast(${1 + adj.contrast / 100})`,
    `saturate(${1 + adj.saturation / 100})`,
  ].join(" ");
  ctx.drawImage(source, 0, 0);
  ctx.filter = "none";
  return out;
}

export function autoAdjustments(source: HTMLCanvasElement): Adjustments {
  const sample = resizeCanvas(source, ...Object.values(fitWithin(source.width, source.height, 160)) as [number, number]);
  const ctx = sample.getContext("2d", { willReadFrequently: true });
  if (!ctx) return NEUTRAL_ADJUSTMENTS;

  const { data } = ctx.getImageData(0, 0, sample.width, sample.height);

  let sum = 0;
  let sumSq = 0;
  let counted = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 24) continue;
    const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    sum += luma;
    sumSq += luma * luma;
    counted++;
  }

  if (!counted) return NEUTRAL_ADJUSTMENTS;

  const mean = sum / counted;
  const variance = Math.max(0, sumSq / counted - mean * mean);
  const stdDev = Math.sqrt(variance);

  const brightness = clamp(Math.round(((128 - mean) / 128) * 55), -35, 45);
  const contrast = clamp(Math.round(((52 - stdDev) / 52) * 45), -20, 40);
  const saturation = brightness > 12 ? 6 : 0;

  return { brightness, contrast, saturation };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function shapePath(
  ctx: CanvasRenderingContext2D,
  shape: ProfileShape,
  width: number,
  height: number,
) {
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
  } else if (shape === "rounded") {
    const r = Math.min(width, height) * 0.18;
    ctx.moveTo(r, 0);
    ctx.lineTo(width - r, 0);
    ctx.quadraticCurveTo(width, 0, width, r);
    ctx.lineTo(width, height - r);
    ctx.quadraticCurveTo(width, height, width - r, height);
    ctx.lineTo(r, height);
    ctx.quadraticCurveTo(0, height, 0, height - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
  } else {
    ctx.rect(0, 0, width, height);
  }
  ctx.closePath();
}

export type ComposeOptions = {
  size: { width: number; height: number };
  zoom: number;
  offsetX: number;
  offsetY: number;
  background: string | null;
  shape: ProfileShape;
  adjustments: Adjustments;
};

export function composeProfile(subject: HTMLCanvasElement, options: ComposeOptions) {
  const { size, zoom, offsetX, offsetY, background, shape, adjustments } = options;

  const out = makeCanvas(size.width, size.height);
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.save();
  shapePath(ctx, shape, out.width, out.height);
  ctx.clip();

  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, out.width, out.height);
  }

  const cover = Math.max(out.width / subject.width, out.height / subject.height) * zoom;
  const drawWidth = subject.width * cover;
  const drawHeight = subject.height * cover;
  const dx = (out.width - drawWidth) / 2 + (offsetX / 100) * out.width;
  const dy = (out.height - drawHeight) / 2 + (offsetY / 100) * out.height;

  ctx.filter = [
    `brightness(${1 + adjustments.brightness / 100})`,
    `contrast(${1 + adjustments.contrast / 100})`,
    `saturate(${1 + adjustments.saturation / 100})`,
  ].join(" ");
  ctx.drawImage(subject, dx, dy, drawWidth, drawHeight);
  ctx.filter = "none";
  ctx.restore();

  return out;
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ExportFormat,
  quality: number,
): Promise<Blob> {
  const flattened = format === "image/jpeg" ? withBackground(canvas, "#ffffff") : canvas;
  return new Promise((resolve, reject) => {
    flattened.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode that image."))),
      format,
      quality / 100,
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function baseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]+/g, "_").slice(0, 48) || "image";
}
