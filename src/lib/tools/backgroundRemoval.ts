"use client";

import { canvasFromImage, fitWithin, loadImage, makeCanvas } from "@/lib/tools/imageOps";

export const MODEL_ID = "Xenova/modnet";
export const MODEL_LICENCE = "MODNet · Apache-2.0";

const MATTE_MAX_EDGE = 1024;

export type RemovalStage = "idle" | "loading-model" | "matting" | "compositing" | "done" | "error";

export type RemovalProgress = {
  stage: RemovalStage;
  message: string;
  percent?: number;
};

type Remover = (input: string) => Promise<unknown>;

let removerPromise: Promise<Remover> | null = null;
let modelReady = false;

export function isModelReady() {
  return modelReady;
}

export function resetRemover() {
  removerPromise = null;
  modelReady = false;
}

async function getRemover(onProgress?: (p: RemovalProgress) => void): Promise<Remover> {
  if (removerPromise) return removerPromise;

  removerPromise = (async () => {
    onProgress?.({ stage: "loading-model", message: "Downloading the matting model…", percent: 0 });

    const { pipeline, env } = await import("@huggingface/transformers");
    env.allowLocalModels = false;

    const pipe = await pipeline("background-removal", MODEL_ID, {
      dtype: "fp32",
      progress_callback: (item: { status?: string; progress?: number }) => {
        if (item?.status === "progress" && typeof item.progress === "number") {
          onProgress?.({
            stage: "loading-model",
            message: "Downloading the matting model…",
            percent: Math.round(item.progress),
          });
        }
      },
    });

    modelReady = true;
    return pipe as unknown as Remover;
  })();

  try {
    return await removerPromise;
  } catch (err) {
    removerPromise = null;
    throw err;
  }
}

function toCanvas(result: unknown): HTMLCanvasElement | null {
  const first = Array.isArray(result) ? result[0] : result;
  const raw = first as { toCanvas?: () => HTMLCanvasElement } | null;
  if (!raw?.toCanvas) return null;
  const canvas = raw.toCanvas();
  return canvas instanceof HTMLCanvasElement ? canvas : null;
}

export async function removeBackground(
  file: File,
  onProgress?: (p: RemovalProgress) => void,
): Promise<{ cutout: HTMLCanvasElement; original: HTMLCanvasElement }> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const original = canvasFromImage(image);

    const remover = await getRemover(onProgress);

    onProgress?.({ stage: "matting", message: "Separating subject from background…" });

    const matteSize = fitWithin(original.width, original.height, MATTE_MAX_EDGE);
    const matteInput = makeCanvas(matteSize.width, matteSize.height);
    const matteCtx = matteInput.getContext("2d");
    if (!matteCtx) throw new Error("Canvas unavailable");
    matteCtx.imageSmoothingQuality = "high";
    matteCtx.drawImage(original, 0, 0, matteInput.width, matteInput.height);

    const result = await remover(matteInput.toDataURL("image/png"));
    const cutoutSmall = toCanvas(result);
    if (!cutoutSmall) throw new Error("The model returned an unexpected result.");

    onProgress?.({ stage: "compositing", message: "Rebuilding at full resolution…" });

    const cutout = applyAlphaAtFullSize(original, cutoutSmall);

    onProgress?.({ stage: "done", message: "Background removed." });
    return { cutout, original };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function applyAlphaAtFullSize(original: HTMLCanvasElement, cutoutSmall: HTMLCanvasElement) {
  const alphaFull = makeCanvas(original.width, original.height);
  const alphaCtx = alphaFull.getContext("2d");
  if (!alphaCtx) throw new Error("Canvas unavailable");
  alphaCtx.imageSmoothingEnabled = true;
  alphaCtx.imageSmoothingQuality = "high";
  alphaCtx.drawImage(cutoutSmall, 0, 0, alphaFull.width, alphaFull.height);

  const out = makeCanvas(original.width, original.height);
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.drawImage(alphaFull, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.drawImage(original, 0, 0);
  ctx.globalCompositeOperation = "source-over";

  return out;
}
