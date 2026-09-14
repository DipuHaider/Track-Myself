"use client";

import { useRef, useState } from "react";
import { AlertCircle, Copy, Download, FileText, Loader2, Upload } from "lucide-react";
import { openDocx, type DocxParagraph, type DocxSession } from "@/lib/tools/docxEditor";
import { downloadBlob } from "@/lib/tools/imageOps";

function styleHint(p: DocxParagraph) {
  const bits = [
    p.style && p.style !== "Normal" ? p.style : "",
    p.listItem ? "list" : "",
    p.inTable ? "table" : "",
    p.bold ? "bold" : "",
    p.italic ? "italic" : "",
    p.sizeHalfPt ? `${p.sizeHalfPt / 2}pt` : "",
  ].filter(Boolean);
  return bits.join(" · ");
}

export default function DocxEditorPage() {
  const [session, setSession] = useState<DocxSession | null>(null);
  const [paras, setParas] = useState<DocxParagraph[]>([]);
  const [name, setName] = useState("document.docx");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [onlyText, setOnlyText] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  async function open(file: File) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const s = await openDocx(await file.arrayBuffer());
      setSession(s);
      setParas(s.paragraphs);
      setName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open that document.");
    } finally {
      setBusy(false);
    }
  }

  function edit(index: number, text: string) {
    if (!session) return;
    session.setText(index, text);
    setParas(session.paragraphs);
  }

  async function save() {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      const blob = await session.toBlob();
      downloadBlob(blob, name.replace(/\.docx$/i, "") + "-edited.docx");
      setStatus(`Saved ${Math.round(blob.size / 1024)} KB with styles and images untouched.`);
    } catch (e) {
      setError(e instanceof Error ? `Save failed: ${e.message}` : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  const shown = onlyText ? paras.filter((p) => p.text.trim()) : paras;

  return (
    <div className="space-y-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <FileText size={20} style={{ color: "var(--primary)" }} aria-hidden="true" />
            Word Text Editor
          </h1>
          <p className="text-muted mt-1 text-sm">
            Fix the wording in a .docx without Word. Nothing leaves your browser.
          </p>
        </div>
        {session && (
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="btn-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Save .docx
          </button>
        )}
      </div>

      {!session && (
        <div
          onClick={() => !busy && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) open(f);
          }}
          className="glass flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-14 transition hover:bg-[var(--surface-2)]"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) open(f);
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
                Drop a .docx or <span style={{ color: "var(--primary)" }}>browse</span>
              </p>
              <p className="text-muted text-[11px]">Legacy .doc is not supported — save it as .docx first</p>
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600" data-error>{error}</p>}
      {status && <p className="text-xs" style={{ color: "#047857" }} data-status>{status}</p>}

      {session && (
        <>
          <div className="glass flex flex-wrap items-start gap-2 rounded-xl px-4 py-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: "#d97706" }} aria-hidden="true" />
            <p className="text-muted flex-1 text-[11px] leading-relaxed">
              This edits paragraph text. Styles, headings, lists, tables, images, headers and
              footers are repacked exactly as they were — but formatting that changed
              <em> inside</em> a paragraph (one bold word mid-sentence) takes on the formatting
              of the paragraph&apos;s first run.
            </p>
            <label className="text-muted flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px]">
              <input type="checkbox" checked={onlyText} onChange={(e) => setOnlyText(e.target.checked)} />
              Hide empty paragraphs
            </label>
          </div>

          <p className="text-muted text-[11px]" data-meta>
            {name} · {paras.length} paragraphs · {shown.length} with text
          </p>

          <div className="glass space-y-2 rounded-xl p-4">
            {shown.map((p) => (
              <div key={p.index} className="flex items-start gap-2" data-para={p.index}>
                <span className="text-muted w-8 shrink-0 pt-2 text-right text-[10px] tabular-nums">
                  {p.index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <textarea
                    value={p.text}
                    onChange={(e) => edit(p.index, e.target.value)}
                    rows={Math.min(6, Math.max(1, Math.ceil(p.text.length / 95)))}
                    className="surface w-full rounded-md border px-2.5 py-1.5 text-xs"
                    style={{
                      fontWeight: p.bold ? 700 : 400,
                      fontStyle: p.italic ? "italic" : "normal",
                    }}
                  />
                  {styleHint(p) && (
                    <p className="text-muted mt-0.5 text-[10px]">{styleHint(p)}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { session.duplicate(p.index); setParas(session.paragraphs); }}
                  title="Add an empty paragraph below, keeping this one's style"
                  className="text-muted mt-1 shrink-0 rounded-md border p-1.5 transition hover:bg-[var(--surface-2)]"
                >
                  <Copy size={12} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
