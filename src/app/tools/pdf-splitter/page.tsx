"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileText, Scissors, Upload, X } from "lucide-react";

interface PdfState {
  file: File;
  pageCount: number;
}

function parseRange(input: string, max: number): number[] | null {
  const pages = new Set<number>();
  const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      const n = parseInt(part, 10);
      if (n < 1 || n > max) return null;
      pages.add(n);
    } else if (/^\d+-\d+$/.test(part)) {
      const [a, b] = part.split("-").map(Number);
      if (a < 1 || b > max || a > b) return null;
      for (let i = a; i <= b; i++) pages.add(i);
    } else {
      return null;
    }
  }
  return pages.size > 0 ? Array.from(pages).sort((a, b) => a - b) : null;
}

async function extractPages(file: File, pages: number[]): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib");
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, pages.map((p) => p - 1));
  copied.forEach((p) => out.addPage(p));
  const outBytes = await out.save();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Blob([outBytes as any], { type: "application/pdf" });
}

async function splitAll(file: File, pageCount: number): Promise<{ name: string; blob: Blob }[]> {
  const { PDFDocument } = await import("pdf-lib");
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes);
  const results: { name: string; blob: Blob }[] = [];
  const base = file.name.replace(/\.pdf$/i, "");
  for (let i = 0; i < pageCount; i++) {
    const out = await PDFDocument.create();
    const [copied] = await out.copyPages(src, [i]);
    out.addPage(copied);
    const b = await out.save();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    results.push({ name: `${base}-page-${i + 1}.pdf`, blob: new Blob([b as any], { type: "application/pdf" }) });
  }
  return results;
}

export default function PdfSplitterPage() {
  const [pdf, setPdf] = useState<PdfState | null>(null);
  const [range, setRange] = useState("");
  const [mode, setMode] = useState<"range" | "split">("range");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    setError("");
    setRange("");
    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setPdf({ file, pageCount: doc.getPageCount() });
    } catch {
      setError("Could not read the PDF. Make sure it is not password-protected.");
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) loadFile(file);
    },
    [loadFile],
  );

  const handleExtract = async () => {
    if (!pdf) return;
    setError("");
    if (mode === "range") {
      const pages = parseRange(range, pdf.pageCount);
      if (!pages) {
        setError(`Invalid range. Use numbers 1–${pdf.pageCount}, e.g. "1-3, 5, 8-10".`);
        return;
      }
      setProcessing(true);
      try {
        const blob = await extractPages(pdf.file, pages);
        const base = pdf.file.name.replace(/\.pdf$/i, "");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${base}-pages-${range.replace(/\s/g, "")}.pdf`;
        a.click();
      } catch {
        setError("Failed to process the PDF.");
      } finally {
        setProcessing(false);
      }
    } else {
      setProcessing(true);
      try {
        const files = await splitAll(pdf.file, pdf.pageCount);
        for (const f of files) {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(f.blob);
          a.download = f.name;
          a.click();
          await new Promise((r) => setTimeout(r, 150));
        }
      } catch {
        setError("Failed to split the PDF.");
      } finally {
        setProcessing(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Back + title */}
      <div>
        <Link
          href="/tools"
          className="text-muted mb-3 inline-flex items-center gap-1.5 text-sm hover:underline"
        >
          <ArrowLeft size={14} /> Back to Tools
        </Link>
        <h1 className="text-2xl font-bold">PDF Splitter</h1>
        <p className="text-muted mt-1 text-sm">
          Extract pages from a PDF file — everything runs in your browser, nothing is uploaded.
        </p>
      </div>

      {/* Drop zone */}
      {!pdf && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-16 text-center transition ${
            dragging
              ? "border-[var(--primary)] bg-[var(--primary)]/5"
              : "border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--surface-2)]"
          }`}
        >
          <Upload size={32} className="text-muted" />
          <div>
            <p className="font-medium">Drop a PDF here or click to upload</p>
            <p className="text-muted mt-1 text-sm">PDF files only</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])}
          />
        </div>
      )}

      {/* File loaded */}
      {pdf && (
        <>
          {/* File info */}
          <div className="surface flex items-center gap-4 rounded-xl border p-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "#10b98120", color: "#10b981" }}
            >
              <FileText size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{pdf.file.name}</p>
              <p className="text-muted text-sm mt-0.5">
                {pdf.pageCount} page{pdf.pageCount !== 1 ? "s" : ""} ·{" "}
                {(pdf.file.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setPdf(null); setRange(""); setError(""); }}
              className="rounded-md p-1.5 text-muted transition hover:bg-red-50 hover:text-red-500"
              title="Remove file"
            >
              <X size={16} />
            </button>
          </div>

          {/* Mode selector */}
          <div className="surface rounded-xl border p-5 space-y-5">
            <div className="flex rounded-lg border overflow-hidden text-sm w-fit">
              {(["range", "split"] as const).map((m, i) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-4 py-2 transition ${i > 0 ? "border-l" : ""} ${
                    mode === m ? "bg-[var(--primary)] text-white" : "hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {m === "range" ? "Extract pages" : "Split every page"}
                </button>
              ))}
            </div>

            {mode === "range" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Page range{" "}
                  <span className="text-muted font-normal">(1 – {pdf.pageCount})</span>
                </label>
                <input
                  type="text"
                  value={range}
                  onChange={(e) => { setRange(e.target.value); setError(""); }}
                  placeholder={`e.g. 1-3, 5, 8-${Math.min(10, pdf.pageCount)}`}
                  className="surface w-full max-w-sm rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
                <p className="text-muted text-xs">
                  Separate pages or ranges with commas: <code className="rounded bg-[var(--surface-2)] px-1">1-3, 5, 8-10</code>
                </p>
              </div>
            ) : (
              <p className="text-muted text-sm">
                Each page will be exported as a separate PDF file.{" "}
                <span className="font-medium text-foreground">
                  {pdf.pageCount} file{pdf.pageCount !== 1 ? "s" : ""} will be downloaded.
                </span>
              </p>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="button"
              onClick={handleExtract}
              disabled={processing || (mode === "range" && !range.trim())}
              className="btn-primary inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {processing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing…
                </>
              ) : (
                <>
                  {mode === "range" ? <Download size={16} /> : <Scissors size={16} />}
                  {mode === "range" ? "Download extracted PDF" : `Download ${pdf.pageCount} PDFs`}
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* Tips */}
      <div className="rounded-xl border border-dashed p-5 text-sm text-muted space-y-1">
        <p className="font-medium text-foreground">Tips</p>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>Password-protected PDFs are not supported.</li>
          <li>Large PDFs (&gt;50 MB) may take a moment to process.</li>
          <li>Use <strong>Split every page</strong> to get individual PDFs for all pages.</li>
        </ul>
      </div>
    </div>
  );
}
