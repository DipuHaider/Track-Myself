"use client";

import { loadPdfjs, type PdfDoc } from "./pdfjsClient";

/**
 * The editing layer, kept out of the React component so the component stays
 * about rendering and this stays about pdf.js.
 *
 * Typed text goes through pdf.js's own annotation editor and is serialised by
 * saveDocument(), which embeds whatever fonts the glyphs need — that is why this
 * does not draw text with pdf-lib, whose drawText is limited to the standard 14
 * WinAnsi faces and throws on anything outside Latin-1.
 *
 * pdf-lib is still used, but only for page geometry: rotate, delete, reorder.
 */

export type EditorMode = "select" | "text" | "highlight" | "draw" | "signature";

type UIManager = {
  updateMode: (mode: number) => void;
  destroy?: () => void;
  onPageChanging?: (p: unknown) => void;
};

export type EditorSession = {
  doc: PdfDoc;
  uiManager: UIManager;
  modeFor: (mode: EditorMode) => number;
  setMode: (mode: EditorMode) => void;
  destroy: () => void;
};

/**
 * pdf.js's UIManager expects a viewer EventBus. The full one lives in the web/
 * layer that unpdf does not ship, and the manager only ever calls on/off/dispatch
 * on it, so a minimal pub/sub is enough to drive it standalone.
 */
function makeEventBus() {
  const listeners = new Map<string, Set<(e: unknown) => void>>();
  const bus = {
    on(name: string, fn: (e: unknown) => void) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(fn);
    },
    off(name: string, fn: (e: unknown) => void) {
      listeners.get(name)?.delete(fn);
    },
    dispatch(name: string, payload: unknown) {
      for (const fn of listeners.get(name) ?? []) {
        try { fn(payload); } catch { /* a listener must not break the editor */ }
      }
    },
  };
  return { ...bus, _on: bus.on, _off: bus.off };
}

export async function startEditing(doc: PdfDoc, container: HTMLElement): Promise<EditorSession> {
  const pdfjs = await loadPdfjs();
  const T = pdfjs.AnnotationEditorType as unknown as Record<string, number>;

  const modeFor = (mode: EditorMode) => {
    if (mode === "text") return T.FREETEXT;
    if (mode === "highlight") return T.HIGHLIGHT;
    if (mode === "draw") return T.INK;
    if (mode === "signature") return T.SIGNATURE ?? T.STAMP;
    return T.NONE;
  };

  const eventBus = makeEventBus();

  /* Sixteen positional arguments of viewer internals. Everything this tool does
     not have a viewer component for is passed as null, which the manager tolerates;
     the ones that matter are container, viewer, eventBus and pdfDocument. */
  const Manager = pdfjs.AnnotationEditorUIManager as unknown as new (...args: unknown[]) => UIManager;
  const uiManager = new Manager(
    container, container, null, null, null, null,
    eventBus, doc,
    null, null, false, false, false, null, null, false,
  );

  return {
    doc,
    uiManager,
    modeFor,
    setMode: (mode: EditorMode) => uiManager.updateMode(modeFor(mode)),
    destroy: () => { try { uiManager.destroy?.(); } catch { /* already gone */ } },
  };
}

export async function attachLayers(
  session: EditorSession,
  pageNumber: number,
  host: { text: HTMLDivElement; editor: HTMLDivElement },
  viewport: { width: number; height: number; rawDims?: unknown; clone: (o: unknown) => unknown },
) {
  const pdfjs = await loadPdfjs();
  const page = await session.doc.getPage(pageNumber);

  pdfjs.setLayerDimensions(host.text, viewport as never);
  pdfjs.setLayerDimensions(host.editor, viewport as never);

  const textLayer = new pdfjs.TextLayer({
    textContentSource: page.streamTextContent(),
    container: host.text,
    viewport: viewport as never,
  });
  await textLayer.render();

  const Layer = pdfjs.AnnotationEditorLayer as unknown as new (opts: unknown) => {
    render: (opts: unknown) => void;
    destroy?: () => void;
  };
  /* AnnotationEditorLayer expects the viewer's TextLayerBuilder — an object with a
     .div it can attach listeners to — not the core TextLayer instance. Passing the
     instance made disable() blow up on undefined.addEventListener. */
  const layer = new Layer({
    uiManager: session.uiManager,
    div: host.editor,
    accessibilityManager: null,
    annotationLayer: null,
    drawLayer: null,
    textLayer: { div: host.text },
    viewport,
    l10n: { get: async (k: string) => k, translate: async () => {} },
    structTreeLayer: null,
    pageIndex: pageNumber - 1,
  });
  layer.render({ viewport });

  return { textLayer, layer };
}

/** Serialises the editor's annotations into a new PDF, fonts embedded by pdf.js. */
export async function exportEdited(doc: PdfDoc): Promise<Uint8Array> {
  return doc.saveDocument();
}

export type PageOp = { type: "rotate"; page: number; by: 90 | -90 } | { type: "delete"; page: number } | { type: "move"; page: number; to: number };

/**
 * Page geometry, applied after pdf.js has written the annotations — pdf-lib must
 * run last so its output is what ships.
 */
export async function applyPageOps(bytes: Uint8Array, ops: PageOp[]): Promise<Uint8Array> {
  if (!ops.length) return bytes;
  const { PDFDocument, degrees } = await import("pdf-lib");
  const src = await PDFDocument.load(bytes);

  let order = src.getPageIndices();

  for (const op of ops) {
    const idx = order.indexOf(op.page - 1);
    if (idx < 0) continue;

    if (op.type === "rotate") {
      const page = src.getPage(op.page - 1);
      page.setRotation(degrees((page.getRotation().angle + op.by + 360) % 360));
    } else if (op.type === "delete") {
      order = order.filter((p) => p !== op.page - 1);
    } else if (op.type === "move") {
      const [moved] = order.splice(idx, 1);
      order.splice(Math.max(0, Math.min(order.length, op.to)), 0, moved);
    }
  }

  if (order.length === src.getPageCount() && order.every((p, i) => p === i)) {
    return src.save();
  }

  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, order);
  for (const p of copied) out.addPage(p);
  return out.save();
}
