"use client";

import { makeCanvas } from "@/lib/tools/imageOps";
import type { BannerPreset } from "@/lib/tools/bannerPresets";

export const BANNER_STYLES = ["gradient", "mesh", "grid", "dots", "waves", "solid"] as const;
export type BannerStyle = (typeof BANNER_STYLES)[number];

export const BANNER_LAYOUTS = ["left", "center", "split"] as const;
export type BannerLayout = (typeof BANNER_LAYOUTS)[number];

export type BannerPalette = {
  background: string;
  backgroundAlt: string;
  accent: string;
  text: string;
  muted: string;
};

export type BannerBrief = {
  headline: string;
  subheadline: string;
  tagline: string;
  keywords: string[];
  palette: BannerPalette;
  style: BannerStyle;
  layout: BannerLayout;
};

export const DEFAULT_BRIEF: BannerBrief = {
  headline: "",
  subheadline: "",
  tagline: "",
  keywords: [],
  palette: {
    background: "#0b1220",
    backgroundAlt: "#1e293b",
    accent: "#3b82f6",
    text: "#f8fafc",
    muted: "#94a3b8",
  },
  style: "gradient",
  layout: "left",
};

const FONT_STACK = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif";

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const value = parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  brief: BannerBrief,
) {
  const { palette, style } = brief;

  if (style === "solid") {
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, palette.background);
    gradient.addColorStop(1, palette.backgroundAlt);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  if (style === "mesh") {
    const blobs = [
      { x: width * 0.82, y: height * 0.2, r: height * 0.9, color: palette.accent, a: 0.42 },
      { x: width * 0.62, y: height * 1.05, r: height * 0.8, color: palette.accent, a: 0.22 },
      { x: width * 0.98, y: height * 0.9, r: height * 0.7, color: palette.muted, a: 0.18 },
    ];
    for (const blob of blobs) {
      const radial = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
      radial.addColorStop(0, withAlpha(blob.color, blob.a));
      radial.addColorStop(1, withAlpha(blob.color, 0));
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);
    }
  }

  if (style === "grid") {
    const step = Math.max(28, Math.round(height / 10));
    ctx.strokeStyle = withAlpha(palette.muted, 0.16);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = step; x < width; x += step) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
    }
    for (let y = step; y < height; y += step) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
    }
    ctx.stroke();
  }

  if (style === "dots") {
    const step = Math.max(26, Math.round(height / 12));
    const radius = Math.max(1.5, step / 16);
    ctx.fillStyle = withAlpha(palette.muted, 0.28);
    for (let y = step; y < height; y += step) {
      for (let x = step; x < width; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (style === "waves") {
    const amplitude = height * 0.16;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, height * (0.55 + i * 0.14));
      for (let x = 0; x <= width; x += 12) {
        const y =
          height * (0.55 + i * 0.14) +
          Math.sin((x / width) * Math.PI * 2 + i * 0.9) * amplitude * (1 - i * 0.22);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = withAlpha(i === 0 ? palette.accent : palette.muted, 0.14 - i * 0.035);
      ctx.fill();
    }
  }

  if (style === "gradient") {
    const glow = ctx.createRadialGradient(
      width * 0.85, height * 0.1, 0,
      width * 0.85, height * 0.1, height * 1.2,
    );
    glow.addColorStop(0, withAlpha(palette.accent, 0.35));
    glow.addColorStop(1, withAlpha(palette.accent, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  weight: number,
  minSize: number,
) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${FONT_STACK}`;
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 1;
    ctx.font = `${weight} ${size}px ${FONT_STACK}`;
  }
  return size;
}

function drawKeywordChips(
  ctx: CanvasRenderingContext2D,
  keywords: string[],
  x: number,
  y: number,
  maxWidth: number,
  scale: number,
  palette: BannerPalette,
) {
  if (!keywords.length) return y;

  const fontSize = Math.round(15 * scale);
  const padX = Math.round(14 * scale);
  const height = Math.round(fontSize * 2.1);
  const gap = Math.round(10 * scale);

  ctx.font = `600 ${fontSize}px ${FONT_STACK}`;
  ctx.textBaseline = "middle";

  let cursor = x;
  for (const word of keywords.slice(0, 6)) {
    const textWidth = ctx.measureText(word).width;
    const chipWidth = textWidth + padX * 2;
    if (cursor + chipWidth > x + maxWidth) break;

    const radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(cursor + radius, y);
    ctx.lineTo(cursor + chipWidth - radius, y);
    ctx.quadraticCurveTo(cursor + chipWidth, y, cursor + chipWidth, y + radius);
    ctx.quadraticCurveTo(cursor + chipWidth, y + height, cursor + chipWidth - radius, y + height);
    ctx.lineTo(cursor + radius, y + height);
    ctx.quadraticCurveTo(cursor, y + height, cursor, y + radius);
    ctx.quadraticCurveTo(cursor, y, cursor + radius, y);
    ctx.closePath();

    ctx.fillStyle = withAlpha(palette.accent, 0.18);
    ctx.fill();
    ctx.strokeStyle = withAlpha(palette.accent, 0.55);
    ctx.lineWidth = Math.max(1, scale);
    ctx.stroke();

    ctx.fillStyle = palette.text;
    ctx.fillText(word, cursor + padX, y + height / 2);

    cursor += chipWidth + gap;
  }

  return y + height;
}

export type RenderOptions = {
  preset: BannerPreset;
  brief: BannerBrief;
  scale?: number;
  photo?: HTMLCanvasElement | HTMLImageElement | null;
  photoZoom?: number;
  photoOffsetX?: number;
  photoOffsetY?: number;
  photoOverlay?: number;
};

export function renderBanner({
  preset, brief, scale = 1, photo = null,
  photoZoom = 1, photoOffsetX = 0, photoOffsetY = 0, photoOverlay = 0.45,
}: RenderOptions) {
  const width = Math.round(preset.width * scale);
  const height = Math.round(preset.height * scale);
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const unit = height / 396;

  if (photo) {
    const sourceWidth = "naturalWidth" in photo ? photo.naturalWidth : photo.width;
    const sourceHeight = "naturalHeight" in photo ? photo.naturalHeight : photo.height;
    const cover = Math.max(width / sourceWidth, height / sourceHeight) * photoZoom;
    const drawWidth = sourceWidth * cover;
    const drawHeight = sourceHeight * cover;
    ctx.drawImage(
      photo,
      (width - drawWidth) / 2 + (photoOffsetX / 100) * width,
      (height - drawHeight) / 2 + (photoOffsetY / 100) * height,
      drawWidth,
      drawHeight,
    );

    if (photoOverlay > 0) {
      const shade = ctx.createLinearGradient(0, 0, width, 0);
      shade.addColorStop(0, withAlpha(brief.palette.background, Math.min(0.95, photoOverlay + 0.3)));
      shade.addColorStop(1, withAlpha(brief.palette.background, Math.max(0, photoOverlay - 0.25)));
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    drawBackground(ctx, width, height, brief);
  }

  const { palette, layout } = brief;
  const avoid = preset.safeZones.find((z) => z.kind === "avoid");

  const marginX = Math.round(64 * unit);
  const marginY = Math.round(52 * unit);

  let textLeft = marginX;
  let textWidth = width - marginX * 2;
  let align: CanvasTextAlign = "left";

  if (layout === "center") {
    align = "center";
    textLeft = width / 2;
    textWidth = width * 0.78;
  } else if (layout === "split") {
    textLeft = Math.round(width * 0.52);
    textWidth = width - textLeft - marginX;
  } else if (avoid) {
    textLeft = Math.round((avoid.x + avoid.width) * scale) + Math.round(40 * unit);
    textWidth = width - textLeft - marginX;
  }

  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";

  const headline = brief.headline.trim();
  const sub = brief.subheadline.trim();
  const tagline = brief.tagline.trim();

  const blockHeights: number[] = [];
  const headlineSize = headline ? fitText(ctx, headline, textWidth, Math.round(64 * unit), 800, Math.round(26 * unit)) : 0;
  if (headline) blockHeights.push(headlineSize * 1.12);
  const subSize = sub ? fitText(ctx, sub, textWidth, Math.round(30 * unit), 500, Math.round(15 * unit)) : 0;
  if (sub) blockHeights.push(subSize * 1.5);
  const taglineSize = tagline ? fitText(ctx, tagline, textWidth, Math.round(21 * unit), 400, Math.round(12 * unit)) : 0;
  if (tagline) blockHeights.push(taglineSize * 1.6);
  const chipsHeight = brief.keywords.length ? Math.round(15 * unit * 2.1) + Math.round(18 * unit) : 0;
  if (chipsHeight) blockHeights.push(chipsHeight);

  const totalHeight = blockHeights.reduce((a, b) => a + b, 0);
  let cursorY = Math.max(marginY + headlineSize, (height - totalHeight) / 2 + headlineSize);

  if (headline) {
    ctx.fillStyle = palette.text;
    ctx.font = `800 ${headlineSize}px ${FONT_STACK}`;
    ctx.fillText(headline, textLeft, cursorY);

    const underlineY = cursorY + Math.round(headlineSize * 0.22);
    const underlineWidth = Math.min(ctx.measureText(headline).width, textWidth);
    ctx.fillStyle = palette.accent;
    ctx.fillRect(
      align === "center" ? textLeft - underlineWidth / 2 : textLeft,
      underlineY,
      underlineWidth,
      Math.max(2, Math.round(4 * unit)),
    );

    cursorY += headlineSize * 0.9;
  }

  if (sub) {
    cursorY += subSize * 1.1;
    ctx.fillStyle = palette.text;
    ctx.font = `500 ${subSize}px ${FONT_STACK}`;
    ctx.fillText(sub, textLeft, cursorY);
  }

  if (tagline) {
    cursorY += taglineSize * 1.7;
    ctx.fillStyle = palette.muted;
    ctx.font = `400 ${taglineSize}px ${FONT_STACK}`;
    ctx.fillText(tagline, textLeft, cursorY);
  }

  if (brief.keywords.length) {
    ctx.textAlign = "left";
    const chipsX = align === "center"
      ? textLeft - Math.min(textWidth, 520 * unit) / 2
      : textLeft;
    drawKeywordChips(
      ctx,
      brief.keywords,
      chipsX,
      cursorY + Math.round(22 * unit),
      textWidth,
      unit,
      palette,
    );
  }

  return canvas;
}

export function drawSafeZones(
  ctx: CanvasRenderingContext2D,
  preset: BannerPreset,
  scale: number,
) {
  for (const zone of preset.safeZones) {
    const x = zone.x * scale;
    const y = zone.y * scale;
    const w = zone.width * scale;
    const h = zone.height * scale;

    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 2;

    if (zone.kind === "avoid") {
      ctx.fillStyle = "rgba(239, 68, 68, 0.18)";
      ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
      ctx.fillRect(x, y, w, h);
    } else {
      ctx.strokeStyle = "rgba(16, 185, 129, 0.95)";
    }

    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }
}
