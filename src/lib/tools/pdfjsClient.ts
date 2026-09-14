"use client";

/**
 * The only module that touches pdf.js.
 *
 * unpdf ships the complete pdf.js browser build at its "./pdfjs" subpath — 1.68 MB
 * with no node builtins, including the annotation editor stack and saveDocument().
 * It is imported dynamically inside the handler, never at module top, so the bundle
 * cost lands only on the page that opens a PDF.
 *
 * The worker code lives in that same file (globalThis.pdfjsWorker), so pdf.js finds
 * a "fake worker" with zero configuration. That parses on the main thread, which is
 * fine for the CV-sized documents this tool edits.
 */

type PdfjsModule = typeof import("unpdf/pdfjs");

let mod: PdfjsModule | null = null;
let loading: Promise<PdfjsModule> | null = null;

export async function loadPdfjs(): Promise<PdfjsModule> {
  if (mod) return mod;
  if (loading) return loading;
  loading = import("unpdf/pdfjs").then((m) => {
    mod = m as PdfjsModule;
    loading = null;
    return mod;
  });
  return loading;
}

type LoadingTask = ReturnType<PdfjsModule["getDocument"]>;
export type PdfDoc = Awaited<LoadingTask["promise"]>;

export type LoadedPdf = {
  doc: PdfDoc;
  pageCount: number;
};

export async function openPdf(bytes: Uint8Array): Promise<LoadedPdf> {
  const pdfjs = await loadPdfjs();
  /* A copy: pdf.js transfers the buffer, which would detach the caller's view. */
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  return { doc, pageCount: doc.numPages };
}

/**
 * pdf.js refuses two concurrent render() calls on one canvas, and React re-runs
 * effects — StrictMode in development, a scale or page change in production. So
 * any render still in flight for this canvas is cancelled before starting another;
 * without it the second call throws and everything after it in the caller's async
 * block (the text and editor layers) silently never runs.
 */
const inFlight = new WeakMap<HTMLCanvasElement, { cancel: () => void }>();
const queue = new WeakMap<HTMLCanvasElement, Promise<unknown>>();

export function renderPageTo(
  canvas: HTMLCanvasElement,
  doc: LoadedPdf["doc"],
  pageNumber: number,
  scale = 1.5,
) {
  /* Cancelling alone is not enough: the task only lands in inFlight after an await,
     so two calls started in the same tick both see an empty map and both render.
     Chaining per canvas closes that window. */
  const previous = queue.get(canvas);
  const run = (async () => {
    if (previous) { try { await previous; } catch { /* cancelled or failed; carry on */ } }
    return renderOnce(canvas, doc, pageNumber, scale);
  })();
  queue.set(canvas, run);
  return run;
}

async function renderOnce(
  canvas: HTMLCanvasElement,
  doc: LoadedPdf["doc"],
  pageNumber: number,
  scale: number,
) {
  inFlight.get(canvas)?.cancel();

  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const task = page.render({ canvas, canvasContext: ctx, viewport });
  inFlight.set(canvas, task);
  try {
    await task.promise;
  } catch (err) {
    /* Cancelling is how we serialise renders, not a failure. */
    if ((err as { name?: string })?.name !== "RenderingCancelledException") throw err;
  } finally {
    if (inFlight.get(canvas) === task) inFlight.delete(canvas);
  }

  return { page, viewport };
}

/** Diagnostics for the spike: proves the subpath resolves and a page rasterises. */
export async function probePdfjs(bytes: Uint8Array) {
  const t0 = performance.now();
  const pdfjs = await loadPdfjs();
  const tLoad = performance.now() - t0;

  const t1 = performance.now();
  const { doc, pageCount } = await openPdf(bytes);
  const tParse = performance.now() - t1;

  const canvas = document.createElement("canvas");
  const t2 = performance.now();
  const { viewport } = await renderPageTo(canvas, doc, 1, 1.5);
  const tRender = performance.now() - t2;

  return {
    ok: true,
    version: pdfjs.version,
    hasGetDocument: typeof pdfjs.getDocument === "function",
    hasEditorLayer: typeof pdfjs.AnnotationEditorLayer === "function",
    hasEditorUiManager: typeof pdfjs.AnnotationEditorUIManager === "function",
    hasTextLayer: typeof pdfjs.TextLayer === "function",
    hasSaveDocument: typeof doc.saveDocument === "function",
    editorTypes: pdfjs.AnnotationEditorType,
    pageCount,
    size: { w: Math.round(viewport.width), h: Math.round(viewport.height) },
    nonBlankPixels: countInk(canvas),
    ms: { load: Math.round(tLoad), parse: Math.round(tParse), render: Math.round(tRender) },
  };
}

function countInk(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let ink = 0;
  /* Sample every 40th pixel; we only need "did anything draw", not a precise count. */
  for (let i = 0; i < data.length; i += 160) {
    if (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240) ink++;
  }
  return ink;
}
