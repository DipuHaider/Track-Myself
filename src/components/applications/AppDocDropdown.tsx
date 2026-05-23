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

// ── types ──────────────────────────────────────────────────────────────────

type UploadedFileMeta = {
  _id: string;
  name: string;
  mimeType: string;
  size: number;
};

type CVProfile = CVData & {
  mainFileId?: string;
  uploadedFiles?: UploadedFileMeta[];
};

// ── module-level cache (shared across all dropdown instances on the page) ──

let cachedProfile: CVProfile | null = null;

// ── helpers ────────────────────────────────────────────────────────────────

const DOC_TYPES: { key: DocType; label: string }[] = [
  { key: "cv",           label: "CV"           },
  { key: "resume",       label: "Resume"       },
  { key: "cover-letter", label: "Cover Letter" },
];

async function fetchFileAndOpen(id: string, download: boolean) {
  const res = await fetch(`/api/user/cv/files/${id}`);
  if (!res.ok) throw new Error("Failed to load file");
  const { data, mimeType, name } = await res.json();
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: mimeType });
  const url = URL.createObjectURL(blob);
  if (download) {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  } else {
    window.open(url, "_blank");
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

// ── component ──────────────────────────────────────────────────────────────

export default function AppDocDropdown({ info }: { info: AppInfo }) {
  const [open, setOpen]       = useState(false);
  const [pos, setPos]         = useState({ top: 0, left: 0 });
  const [profile, setProfile] = useState<CVProfile | null>(cachedProfile);
  const [fetching, setFetching] = useState(!cachedProfile);
  const [busyKey, setBusyKey]   = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (cachedProfile) return;
    fetch("/api/user/cv")
      .then((r) => r.json())
      .then((data) => {
        const p: CVProfile = { ...DEFAULT_CV, ...(data?.error ? {} : data) };
        cachedProfile = p;
        setProfile(p);
      })
      .catch(() => {
        cachedProfile = { ...DEFAULT_CV };
        setProfile({ ...DEFAULT_CV });
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

  const cv: CVData = { ...DEFAULT_CV, ...(profile ?? {}) };
  const mainFileId = profile?.mainFileId ?? "";
  const mainFileMeta = profile?.uploadedFiles?.find((f) => f._id === mainFileId);
  const cvEmpty = !cv.name && !cv.email && !cv.experience;

  async function handleAction(docType: DocType, action: "view" | "doc" | "pdf") {
    setOpen(false);
    const key = `${docType}:${action}`;
    setBusyKey(key);

    try {
      if (docType === "cv" && mainFileId) {
        const isPdf = mainFileMeta?.mimeType === "application/pdf";
        if (action === "view") {
          await fetchFileAndOpen(mainFileId, false);
        } else if (action === "pdf" && isPdf) {
          await fetchFileAndOpen(mainFileId, true);
        } else if (action === "doc" && !isPdf) {
          await fetchFileAndOpen(mainFileId, true);
        } else {
          // Format mismatch — generate from form data
          downloadAppDocument(info, cv, docType, action === "doc" ? "doc" : "pdf");
        }
        return;
      }
      // Resume + Cover Letter always generate from form data
      if (action === "view") {
        previewAppDocument(info, cv, docType);
      } else {
        downloadAppDocument(info, cv, docType, action === "doc" ? "doc" : "pdf");
      }
    } catch {
      alert("Could not load file. Please try again.");
    } finally {
      setBusyKey(null);
    }
  }

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
          {cvEmpty && !mainFileId && (
            <div className="flex items-start gap-2 border-b px-3 py-2.5">
              <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
              <p className="text-[11px] leading-snug text-muted">
                CV not set up.{" "}
                <Link
                  href="/me/my-cv"
                  className="font-semibold underline"
                  style={{ color: "var(--primary)" }}
                  onClick={() => setOpen(false)}
                >
                  Add your CV
                </Link>{" "}
                for best results.
              </p>
            </div>
          )}

          {mainFileId && (
            <div className="flex items-center gap-1.5 border-b px-3 py-2 text-[10px] font-semibold" style={{ color: "var(--primary)" }}>
              <FileText size={11} />
              CV uses: {mainFileMeta?.name ?? "uploaded file"}
            </div>
          )}

          {DOC_TYPES.map(({ key, label }) => (
            <div key={key} className="border-b last:border-b-0">
              <div className="surface-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                {label}
              </div>
              <div className="flex flex-col py-0.5">
                {(["view", "doc", "pdf"] as const).map((action) => {
                  const bk = `${key}:${action}`;
                  const isBusy = busyKey === bk;
                  const labels = { view: "View", doc: "Download .doc", pdf: "Download .pdf" };
                  return (
                    <button
                      key={action}
                      role="menuitem"
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleAction(key, action)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs transition hover:bg-[var(--surface-2)] disabled:opacity-50"
                    >
                      {isBusy ? (
                        <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                      ) : action === "view" ? (
                        <Eye size={11} aria-hidden="true" />
                      ) : (
                        <Download size={11} aria-hidden="true" />
                      )}
                      {labels[action]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
