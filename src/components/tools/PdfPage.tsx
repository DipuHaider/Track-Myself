"use client";

import { useEffect, useRef } from "react";
import { renderPageTo, type PdfDoc } from "@/lib/tools/pdfjsClient";
import { attachLayers, type EditorSession } from "@/lib/tools/pdfEditor";

export default function PdfPage({
  doc,
  session,
  pageNumber,
  scale,
  rotation,
  deleted,
}: {
  doc: PdfDoc;
  session: EditorSession | null;
  pageNumber: number;
  scale: number;
  rotation: number;
  deleted: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const canvas = canvasRef.current;
    const text = textRef.current;
    const editor = editorRef.current;
    if (!canvas || !text || !editor) return;

    (async () => {
      const { viewport } = await renderPageTo(canvas, doc, pageNumber, scale);
      if (!alive) return;

      const wrap = wrapRef.current;
      if (wrap) {
        wrap.style.width = `${Math.floor(viewport.width)}px`;
        wrap.style.height = `${Math.floor(viewport.height)}px`;
        wrap.style.setProperty("--scale-factor", String(scale));
      }

      text.replaceChildren();
      editor.replaceChildren();
      if (session) {
        try {
          await attachLayers(session, pageNumber, { text, editor }, viewport as never);
        } catch (err) {
          /* Without the layers the page is still readable, just not editable, so
             this is surfaced rather than thrown. */
          console.error("pdf editor layers failed:", err);
          editor.dataset.layerError = String((err as Error)?.message ?? err).slice(0, 120);
        }
      }
    })();

    return () => { alive = false; };
  }, [doc, session, pageNumber, scale]);

  return (
    <div
      className="pdf-page relative shadow-lg"
      ref={wrapRef}
      data-page={pageNumber}
      style={{
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        opacity: deleted ? 0.25 : 1,
        outline: deleted ? "2px dashed #b91c1c" : undefined,
      }}
    >
      <canvas ref={canvasRef} className="block" />
      <div ref={textRef} className="textLayer" />
      <div ref={editorRef} className="annotationEditorLayer" />
    </div>
  );
}
