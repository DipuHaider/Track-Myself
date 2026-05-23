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

type UploadedFileMeta = { _id: string; name: string; mimeType: string; size: number };

type CVProfile = CVData & {
  mainFileId?: string;
  uploadedFiles?: UploadedFileMeta[];
};

// ── module-level profile cache ──────────────────────────────────────────────

let cachedProfile: CVProfile | null = null;

// ── helpers ────────────────────────────────────────────────────────────────

const DOC_TYPES: { key: DocType; label: string }[] = [
  { key: "cv",           label: "CV"           },
  { key: "resume",       label: "Resume"       },
  { key: "cover-letter", label: "Cover Letter" },
];

function base64ToBlob(b64: string, mimeType: string): Blob {
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mimeType });
}

function triggerAnchorDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Opens the window IMMEDIATELY (in user-gesture context), THEN loads data into it.
// This avoids popup-blocker issues that occur when window.open() is called after await.
async function openUploadedFile(
  id: string,
  mode: "view" | "download",
  fallbackName = "document",
) {
  // For view: pre-open the window NOW (still in user-gesture context, before any await).
  let preWin: Window | null = null;
  if (mode === "view") {
    preWin = window.open("about:blank", "_blank");
    if (preWin) {
      preWin.document.write(
        "<html><body style='font-family:sans-serif;padding:2rem;color:#888'>Loading document…</body></html>",
      );
      preWin.document.close();
    }
  }

  let res: Response;
  try {
    res = await fetch(`/api/user/cv/files/${id}`);
  } catch {
    preWin?.close();
    throw new Error("Network error — could not load file.");
  }

  if (!res.ok) {
    preWin?.close();
    throw new Error("File not found. It may have been deleted.");
  }

  const json = await res.json();
  if (!json.data) {
    preWin?.close();
    throw new Error("File data is empty — please re-upload.");
  }

  const blob = base64ToBlob(json.data, json.mimeType);
  const url = URL.createObjectURL(blob);
  const name: string = json.name ?? fallbackName;

  if (mode === "view" && preWin) {
    preWin.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
  } else {
    triggerAnchorDownload(url, name);
  }
}

// ── component ──────────────────────────────────────────────────────────────

export default function AppDocDropdown({ info }: { info: AppInfo }) {
  const [open, setOpen]         = useState(false);
  const [pos, setPos]           = useState({ top: 0, left: 0 });
  const [profile, setProfile]   = useState<CVProfile | null>(cachedProfile);
  const [fetching, setFetching] = useState(!cachedProfile);
  const [busyKey, setBusyKey]   = useState<string | null>(null);

  const triggerRef  = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch CV profile once (shared cache across all instances on page).
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

  // Close on outside click (not using capture phase to avoid racing with button handlers).
  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("scroll", () => setOpen(false), { capture: true, passive: true, once: true });
    window.addEventListener("resize", () => setOpen(false), { once: true });
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  function openMenu(e: React.MouseEvent) {
    e.stopPropagation();
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left });
    setOpen((v) => !v);
  }

  const cv: CVData = { ...DEFAULT_CV, ...(profile ?? {}) };
  const mainFileId  = profile?.mainFileId ?? "";
  const mainFileMeta = profile?.uploadedFiles?.find((f) => f._id === mainFileId);
  const cvEmpty     = !cv.name && !cv.email && !cv.experience;

  async function handleAction(docType: DocType, action: "view" | "doc" | "pdf") {
    // Close dropdown first; action runs independently via async closure.
    setOpen(false);
    const bk = `${docType}:${action}`;
    setBusyKey(bk);

    try {
      // ── CV with uploaded main file ──────────────────────────────────────
      if (docType === "cv" && mainFileId) {
        const isPdf = mainFileMeta?.mimeType === "application/pdf";
        const isDoc = !isPdf; // DOC or DOCX

        if (action === "view") {
          // Pre-opens the window before await — avoids popup block.
          await openUploadedFile(mainFileId, "view", mainFileMeta?.name);
          return;
        }
        if (action === "pdf" && isPdf) {
          await openUploadedFile(mainFileId, "download", mainFileMeta?.name);
          return;
        }
        if (action === "doc" && isDoc) {
          await openUploadedFile(mainFileId, "download", mainFileMeta?.name);
          return;
        }
        // Format mismatch (e.g. main is PDF, user wants .doc) — generate from form.
        downloadAppDocument(info, cv, docType, action === "doc" ? "doc" : "pdf");
        return;
      }

      // ── Resume & Cover Letter — always generated from form + app data ──
      if (action === "view") {
        // Synchronous path — window.open is still in user-gesture context here.
        previewAppDocument(info, cv, docType);
      } else {
        downloadAppDocument(info, cv, docType, action === "doc" ? "doc" : "pdf");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      // eslint-disable-next-line no-alert
      alert(msg);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition hover:bg-[var(--surface-2)]"
        style={{ borderColor: "var(--border)" }}
      >
        {fetching
          ? <Loader2 size={11} className="animate-spin" aria-hidden="true" />
          : <FileText size={11} aria-hidden="true" />}
        Docs
        <ChevronDown size={10} aria-hidden="true" />
      </button>

      {/* Dropdown portal (fixed-position to escape table overflow-auto clip) */}
      {open && (
        <div
          ref={dropdownRef}
          role="menu"
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999, minWidth: "14rem" }}
          className="surface overflow-hidden rounded-lg border shadow-xl"
        >
          {/* No-CV warning */}
          {cvEmpty && !mainFileId && (
            <div className="flex items-start gap-2 border-b px-3 py-2.5">
              <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-500" />
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

          {/* Main file indicator */}
          {mainFileId && (
            <div
              className="flex items-center gap-1.5 border-b px-3 py-2 text-[10px] font-semibold truncate"
              style={{ color: "var(--primary)" }}
            >
              <FileText size={11} aria-hidden="true" />
              CV uses: {mainFileMeta?.name ?? "uploaded file"}
            </div>
          )}

          {/* Doc type rows */}
          {DOC_TYPES.map(({ key: docType, label }) => (
            <div key={docType} className="border-b last:border-b-0">
              <div className="surface-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                {label}
              </div>
              <div className="flex flex-col py-0.5">
                {(["view", "doc", "pdf"] as const).map((action) => {
                  const bk    = `${docType}:${action}`;
                  const isBusy = busyKey === bk;
                  return (
                    <button
                      key={action}
                      role="menuitem"
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleAction(docType, action)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs transition hover:bg-[var(--surface-2)] disabled:opacity-50"
                    >
                      {isBusy
                        ? <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                        : action === "view"
                          ? <Eye size={11} aria-hidden="true" />
                          : <Download size={11} aria-hidden="true" />}
                      {{ view: "View", doc: "Download .doc", pdf: "Download .pdf" }[action]}
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
