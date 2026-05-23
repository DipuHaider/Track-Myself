"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ChevronDown, Download, Eye, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  DEFAULT_CV,
  downloadAppDocument,
  previewAppDocument,
  type AppInfo,
  type CVData,
  type DocType,
} from "@/lib/cvDownload";

const DOC_TYPES: { key: DocType; label: string }[] = [
  { key: "cv",           label: "CV"           },
  { key: "resume",       label: "Resume"       },
  { key: "cover-letter", label: "Cover Letter" },
];

let cachedCV: CVData | null = null;

export default function AppDocDropdown({ info }: { info: AppInfo }) {
  const [open, setOpen]   = useState(false);
  const [pos, setPos]     = useState({ top: 0, left: 0 });
  const [cv, setCv]       = useState<CVData | null>(cachedCV);
  const [fetching, setFetching] = useState(!cachedCV);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (cachedCV) return;
    fetch("/api/user/cv")
      .then((r) => r.json())
      .then((data) => {
        const merged = { ...DEFAULT_CV, ...(data?.error ? {} : data) };
        cachedCV = merged;
        setCv(merged);
      })
      .catch(() => {
        cachedCV = DEFAULT_CV;
        setCv(DEFAULT_CV);
      })
      .finally(() => setFetching(false));
  }, []);

  function openMenu(e: React.MouseEvent) {
    e.stopPropagation();
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close, { capture: true });
    document.addEventListener("scroll", close, { capture: true, passive: true });
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("click", close, { capture: true });
      document.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const effectiveCv = cv ?? DEFAULT_CV;
  const cvEmpty = !effectiveCv.name && !effectiveCv.email && !effectiveCv.experience;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openMenu}
        className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition hover:bg-[var(--surface-2)]"
        style={{ borderColor: "var(--border)" }}
      >
        {fetching ? (
          <Loader2 size={11} className="animate-spin" aria-hidden="true" />
        ) : (
          <FileText size={11} aria-hidden="true" />
        )}
        Docs
        <ChevronDown size={10} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999, minWidth: "14rem" }}
          className="surface overflow-hidden rounded-lg border shadow-xl"
        >
          {cvEmpty && (
            <div className="flex items-start gap-2 border-b px-3 py-2.5">
              <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
              <p className="text-[11px] leading-snug text-muted">
                Your CV is empty.{" "}
                <Link
                  href="/me/my-cv"
                  className="font-semibold underline"
                  style={{ color: "var(--primary)" }}
                  onClick={() => setOpen(false)}
                >
                  Set it up
                </Link>{" "}
                for best results.
              </p>
            </div>
          )}

          {DOC_TYPES.map(({ key, label }) => (
            <div key={key} className="border-b last:border-b-0">
              <div className="surface-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                {label}
              </div>
              <div className="flex flex-col py-0.5">
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => { previewAppDocument(info, effectiveCv, key); setOpen(false); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs transition hover:bg-[var(--surface-2)]"
                >
                  <Eye size={11} aria-hidden="true" /> View
                </button>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => { downloadAppDocument(info, effectiveCv, key, "doc"); setOpen(false); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs transition hover:bg-[var(--surface-2)]"
                >
                  <Download size={11} aria-hidden="true" /> Download .doc
                </button>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => { downloadAppDocument(info, effectiveCv, key, "pdf"); setOpen(false); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs transition hover:bg-[var(--surface-2)]"
                >
                  <Download size={11} aria-hidden="true" /> Download .pdf
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
