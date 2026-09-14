"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, X } from "lucide-react";
import { downloadCVDocx } from "@/hooks/useCVProfile";
import { useDismissable } from "@/hooks/useDismissable";
import type { CVContent, CVFileMeta, CVFormat, CVVariant } from "@/types/cv";

type Spec = {
  format: CVFormat;
  variant: CVVariant;
  docType: "cv" | "resume" | "cover-letter";
  output: "docx" | "pdf";
};

type Loaded = { name: string; content: CVContent; spec: Spec; genFor: string };

/**
 * Editing a document we generated means editing the data it was printed from and
 * printing it again — not parsing the artifact back. Lossless, and it reuses the
 * same builders the document came out of.
 */
export default function DocEditModal({
  file,
  onClose,
  onSaved,
}: {
  file: CVFileMeta;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [content, setContent] = useState<CVContent | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { closing, close } = useDismissable(onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/user/cv/files/${file._id}?content=1`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body?.error ?? "Could not open that document.");
        return body as Loaded;
      })
      .then((body) => { if (alive) { setLoaded(body); setContent(body.content); } })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [file._id]);

  function field<K extends keyof CVContent>(key: K, value: CVContent[K]) {
    setContent((c) => (c ? { ...c, [key]: value } : c));
  }

  function bullet(roleIdx: number, bulletIdx: number, text: string) {
    setContent((c) => {
      if (!c) return c;
      const experience = c.experience.map((role, i) =>
        i !== roleIdx ? role : { ...role, bullets: role.bullets.map((b, j) => (j === bulletIdx ? text : b)) },
      );
      return { ...c, experience };
    });
  }

  async function rerender() {
    if (!content || !loaded) return;
    setBusy(true);
    setError("");
    try {
      await downloadCVDocx({
        ...loaded.spec,
        content,
        useSources: false,
        pretailored: true,
        appInfo: loaded.genFor
          ? {
              companyName: loaded.genFor.split("—")[0]?.trim() ?? "",
              jobTitle: loaded.genFor.split("—")[1]?.trim() ?? "",
            }
          : undefined,
      });
      onSaved();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not re-render that document.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 text-left ${closing ? "anim-backdrop-out" : "anim-backdrop"}`}
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Edit this document"
    >
      <div className={`surface flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border shadow-2xl ${closing ? "anim-panel-out" : "anim-panel"}`}>
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Edit document text</h2>
            <p className="text-muted mt-0.5 truncate text-xs">{file.name}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="shrink-0 rounded-md p-1.5 transition hover:bg-[var(--surface-2)]"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {error && <p className="anim-in border-b px-5 py-2.5 text-xs text-red-600" data-error>{error}</p>}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!content ? (
            !error && (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="text-muted animate-spin" aria-hidden="true" />
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div className="text-muted flex items-start gap-2 text-[11px] leading-relaxed">
                <AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                These are the fields this document was printed from. Saving re-renders it in the
                same format, so the layout is rebuilt rather than patched.
              </div>

              <label className="block">
                <span className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wide">Name</span>
                <input
                  data-field="name"
                  className="surface w-full rounded-md border px-2.5 py-1.5 text-sm"
                  value={content.name}
                  onChange={(e) => field("name", e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wide">Positioning</span>
                <input
                  data-field="positioning"
                  className="surface w-full rounded-md border px-2.5 py-1.5 text-sm"
                  value={content.positioning}
                  onChange={(e) => field("positioning", e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wide">Summary</span>
                <textarea
                  data-field="summary"
                  rows={4}
                  className="surface w-full rounded-md border px-2.5 py-1.5 text-sm"
                  value={content.summary}
                  onChange={(e) => field("summary", e.target.value)}
                />
              </label>

              {content.experience.map((role, i) => (
                <div key={i} className="space-y-1.5 rounded-lg border px-3 py-2.5">
                  <p className="text-xs font-semibold">
                    {[role.title, role.company, role.dates].filter(Boolean).join(" · ")}
                  </p>
                  {role.bullets.map((b, j) => (
                    <textarea
                      key={j}
                      data-bullet={`${i}-${j}`}
                      rows={2}
                      className="surface w-full rounded-md border px-2.5 py-1.5 text-xs"
                      value={b}
                      onChange={(e) => bullet(i, j, e.target.value)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-[var(--surface-2)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={rerender}
            disabled={busy || !content}
            data-rerender
            className="btn-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {busy
              ? <><Loader2 size={12} className="animate-spin" aria-hidden="true" /> Re-rendering…</>
              : <><RefreshCw size={12} aria-hidden="true" /> Save &amp; re-render</>}
          </button>
        </div>
      </div>
    </div>
  );
}
