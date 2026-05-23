"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Eye, FileText, ChevronDown } from "lucide-react";
import {
  downloadAppDocument,
  previewAppDocument,
  type AppInfo,
  type DocType,
} from "@/lib/cvDownload";

const DOC_TYPES: { key: DocType; label: string }[] = [
  { key: "cv",           label: "CV"           },
  { key: "resume",       label: "Resume"       },
  { key: "cover-letter", label: "Cover Letter" },
];

export default function AppDocDropdown({ info }: { info: AppInfo }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

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

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openMenu}
        className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition hover:bg-[var(--surface-2)]"
        style={{ borderColor: "var(--border)" }}
      >
        <FileText size={11} aria-hidden="true" />
        Docs
        <ChevronDown size={10} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999, minWidth: "13rem" }}
          className="surface overflow-hidden rounded-lg border shadow-xl"
        >
          {DOC_TYPES.map(({ key, label }) => (
            <div key={key} className="border-b last:border-b-0">
              <div className="surface-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                {label}
              </div>
              <div className="flex flex-col py-0.5">
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => { previewAppDocument(info, key); setOpen(false); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs transition hover:bg-[var(--surface-2)]"
                >
                  <Eye size={11} aria-hidden="true" /> View
                </button>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => { downloadAppDocument(info, key, "doc"); setOpen(false); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs transition hover:bg-[var(--surface-2)]"
                >
                  <Download size={11} aria-hidden="true" /> Download .doc
                </button>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => { downloadAppDocument(info, key, "pdf"); setOpen(false); }}
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
