"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Download, FileText, Highlighter, Loader2, MousePointer2, PenLine,
  RotateCw, Signature, Trash2, Type, Upload, Undo2,
} from "lucide-react";
import { openPdf, type PdfDoc } from "@/lib/tools/pdfjsClient";
import {
  applyPageOps, exportEdited, startEditing, type EditorMode, type EditorSession, type PageOp,
} from "@/lib/tools/pdfEditor";
import { downloadBlob } from "@/lib/tools/imageOps";
import PdfPage from "@/components/tools/PdfPage";

const TOOLS: { key: EditorMode; label: string; Icon: typeof Type }[] = [
  { key: "select", label: "Select", Icon: MousePointer2 },
  { key: "text", label: "Text", Icon: Type },
  { key: "highlight", label: "Highlight", Icon: Highlighter },
  { key: "draw", label: "Draw", Icon: PenLine },
  { key: "signature", label: "Sign", Icon: Signature },
];

function PdfEditor() {
  const params = useSearchParams();
  const fileId = params.get("fileId") ?? "";

  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [session, setSession] = useState<EditorSession | null>(null);
  const [name, setName] = useState("document.pdf");
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<EditorMode>("select");
  const [scale, setScale] = useState(1.25);
  const [ops, setOps] = useState<PageOp[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (bytes: Uint8Array, label: string) => {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      session?.destroy();
      const { doc: next, pageCount: n } = await openPdf(bytes);
      setDoc(next);
      setPageCount(n);
      setName(label);
      setOps([]);
      setMode("select");

      if (stageRef.current) {
        setSession(await startEditing(next, stageRef.current));
      }
    } catch (e) {
      setError(e instanceof Error ? `${e.name}: ${e.message}` : "Could not open that PDF.");
    } finally {
      setBusy(false);
    }
  }, [session]);

  /* Opened from My Documents: pull the stored file straight in. */
  useEffect(() => {
    if (!fileId || doc) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/user/cv/files/${fileId}/raw`);
        if (!res.ok) throw new Error("That document could not be opened.");
        const buf = new Uint8Array(await res.arrayBuffer());
        const cd = res.headers.get("Content-Disposition") ?? "";
        const label = decodeURIComponent(cd.match(/filename="([^"]+)"/)?.[1] ?? "document.pdf");
        if (alive) await load(buf, label);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Could not open that document.");
      }
    })();
    return () => { alive = false; };
  }, [fileId, doc, load]);

  useEffect(() => () => session?.destroy(), [session]);

  function pick(next: EditorMode) {
    setMode(next);
    session?.setMode(next);
  }

  function pageOp(op: PageOp) {
    setOps((prev) => [...prev, op]);
  }

  const rotationOf = (page: number) =>
    ops.filter((o) => o.type === "rotate" && o.page === page)
      .reduce((deg, o) => deg + (o as { by: number }).by, 0);

  const isDeleted = (page: number) => ops.some((o) => o.type === "delete" && o.page === page);

  async function exportPdf() {
    if (!doc) return;
    setBusy(true);
    setError("");
    try {
      const edited = await exportEdited(doc);
      const final = await applyPageOps(edited, ops);
      /* pdf-lib hands back a Uint8Array the Blob constructor will not take directly. */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      downloadBlob(new Blob([final as any], { type: "application/pdf" }), name.replace(/\.pdf$/i, "") + "-edited.pdf");
      setStatus(`Exported ${final.length.toLocaleString()} bytes.`);
    } catch (e) {
      setError(e instanceof Error ? `Export failed: ${e.message}` : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <div className="space-y-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <FileText size={20} style={{ color: "var(--primary)" }} aria-hidden="true" />
            PDF Editor
          </h1>
          <p className="text-muted mt-1 text-sm">
            Add text, highlight, draw or sign, then reorder pages and export. Nothing leaves your browser.
          </p>
        </div>
        {doc && (
          <button
            type="button"
            onClick={exportPdf}
            disabled={busy}
            className="btn-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export PDF
          </button>
        )}
      </div>

      {!doc && (
        <div
          onClick={() => !busy && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) f.arrayBuffer().then((b) => load(new Uint8Array(b), f.name));
          }}
          className="glass flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-14 transition hover:bg-[var(--surface-2)]"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) f.arrayBuffer().then((b) => load(new Uint8Array(b), f.name));
              e.target.value = "";
            }}
          />
          {busy ? (
            <>
              <Loader2 size={22} className="animate-spin" style={{ color: "var(--primary)" }} />
              <p className="text-muted text-sm">Opening…</p>
            </>
          ) : (
            <>
              <Upload size={20} className="text-muted" aria-hidden="true" />
              <p className="text-sm font-medium">
                Drop a PDF or <span style={{ color: "var(--primary)" }}>browse</span>
              </p>
              <p className="text-muted text-[11px]">Runs entirely on your device</p>
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600" data-error>{error}</p>}
      {status && <p className="text-xs" style={{ color: "#047857" }} data-status>{status}</p>}

      {doc && (
        <div className="glass sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2">
          <div className="flex items-center gap-1">
            {TOOLS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => pick(key)}
                aria-pressed={mode === key}
                title={label}
                data-tool={key}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition"
                style={mode === key
                  ? { background: "var(--primary)", color: "#fff" }
                  : { color: "var(--muted-foreground)" }}
              >
                <Icon size={13} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          <span className="text-muted mx-1 text-[11px]">{name} · {pageCount} page{pageCount === 1 ? "" : "s"}</span>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))}
              className="text-muted rounded-md border px-2 py-1 text-xs"
            >
              −
            </button>
            <span className="text-muted w-10 text-center text-[11px]">{Math.round(scale * 100)}%</span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)))}
              className="text-muted rounded-md border px-2 py-1 text-xs"
            >
              +
            </button>
            {ops.length > 0 && (
              <button
                type="button"
                onClick={() => setOps((p) => p.slice(0, -1))}
                title="Undo the last page change"
                className="text-muted ml-1 flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
              >
                <Undo2 size={12} /> {ops.length}
              </button>
            )}
          </div>
        </div>
      )}

      <div ref={stageRef} className={`space-y-6 ${mode === "select" ? "" : "pdf-editor-active"}`}>
        {doc && pages.map((n) => (
          <div key={n} className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <span className="text-muted text-[11px]">Page {n}</span>
              <button
                type="button"
                onClick={() => pageOp({ type: "rotate", page: n, by: 90 })}
                title="Rotate"
                data-rotate={n}
                className="text-muted rounded-md border px-1.5 py-0.5"
              >
                <RotateCw size={11} />
              </button>
              <button
                type="button"
                onClick={() => pageOp({ type: "delete", page: n })}
                title="Remove page on export"
                data-delete={n}
                className="text-muted rounded-md border px-1.5 py-0.5 hover:text-red-600"
              >
                <Trash2 size={11} />
              </button>
            </div>
            <PdfPage
              doc={doc}
              session={session}
              pageNumber={n}
              scale={scale}
              rotation={rotationOf(n)}
              deleted={isDeleted(n)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="py-16 text-center"><Loader2 className="mx-auto animate-spin" /></div>}>
      <PdfEditor />
    </Suspense>
  );
}
