"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ChevronDown, Download, Eye, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { isContentEmpty } from "@/lib/cv/content";
import {
  DEFAULT_CV_PROFILE, downloadCVDocx, fetchCVProfile,
  getCachedCVProfile, type CVProfile,
} from "@/hooks/useCVProfile";

export type AppInfo = {
  companyName: string;
  jobTitle: string;
  location?: string;
  notes?: string;
  jobPostUrl?: string;
};

type DocType = "cv" | "resume" | "cover-letter";

const DOC_TYPES: { key: DocType; label: string; hint: string }[] = [
  { key: "cv",           label: "CV",           hint: "Your Main CV file, or a generated ATS CV" },
  { key: "resume",       label: "Resume",       hint: "Two-page ATS resume, tailored to this role" },
  { key: "cover-letter", label: "Cover Letter", hint: "Addressed to this company and role" },
];

const PRIMARY_SLOT: Record<DocType, "cv" | "resume" | "coverLetter"> = {
  "cv": "cv",
  "resume": "resume",
  "cover-letter": "coverLetter",
};

export default function AppDocDropdown({ info }: { info: AppInfo }) {
  const [open, setOpen]         = useState(false);
  const [pos, setPos]           = useState({ top: 0, left: 0 });
  const [profile, setProfile]   = useState<CVProfile | null>(getCachedCVProfile());
  const [fetching, setFetching] = useState(!getCachedCVProfile());
  const [busyKey, setBusyKey]   = useState<string | null>(null);
  const [error, setError]       = useState("");

  const triggerRef  = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (getCachedCVProfile()) return;
    let alive = true;
    fetchCVProfile()
      .then((p) => { if (alive) setProfile(p); })
      .finally(() => { if (alive) setFetching(false); });
    return () => { alive = false; };
  }, []);

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

  const current = profile ?? DEFAULT_CV_PROFILE;
  const cvEmpty = isContentEmpty(current.content);

  function storedFileId(docType: DocType) {
    return current.primary[PRIMARY_SLOT[docType]] ?? "";
  }

  function storedFileName(docType: DocType) {
    const id = storedFileId(docType);
    return current.uploadedFiles.find((f) => f._id === id)?.name ?? "";
  }

  async function handleGenerate(docType: DocType) {
    setOpen(false);
    setBusyKey(`${docType}:generate`);
    setError("");
    try {
      await downloadCVDocx({
        docType,
        format: "ats",
        variant: docType === "resume" ? "compact" : "full",
        appInfo: {
          companyName: info.companyName,
          jobTitle: info.jobTitle,
          location: info.location,
          notes: info.notes,
        },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not generate that document.";
      setError(message);
      alert(message);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition hover:bg-[var(--surface-2)]"
        style={{ borderColor: "var(--border)" }}
      >
        {fetching || busyKey
          ? <Loader2 size={11} className="animate-spin" aria-hidden="true" />
          : <FileText size={11} aria-hidden="true" />}
        Docs
        <ChevronDown size={10} aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={dropdownRef}
          role="menu"
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999, minWidth: "16rem" }}
          className="surface overflow-hidden rounded-lg border shadow-xl"
        >
          {cvEmpty && (
            <div className="flex items-start gap-2 border-b px-3 py-2.5">
              <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
              <p className="text-muted text-[11px] leading-snug">
                CV not set up.{" "}
                <Link
                  href="/me/cv"
                  className="font-semibold underline"
                  style={{ color: "var(--primary)" }}
                  onClick={() => setOpen(false)}
                >
                  Build your CV
                </Link>{" "}
                for generated documents.
              </p>
            </div>
          )}

          {error && (
            <p className="border-b px-3 py-2 text-[11px] text-red-600">{error}</p>
          )}

          {DOC_TYPES.map(({ key: docType, label, hint }) => {
            const fileId = storedFileId(docType);
            const fileName = storedFileName(docType);
            const busy = busyKey === `${docType}:generate`;

            return (
              <div key={docType} className="border-b last:border-b-0">
                <div className="surface-muted px-3 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
                  <p className="text-muted text-[10px] leading-snug">{hint}</p>
                </div>

                <div className="flex flex-col py-0.5">
                  {fileId && (
                    <>
                      <a
                        role="menuitem"
                        href={`/api/user/cv/files/${fileId}/raw`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs transition hover:bg-[var(--surface-2)]"
                      >
                        <Eye size={11} aria-hidden="true" />
                        <span className="truncate">View {fileName || "stored file"}</span>
                      </a>
                      <a
                        role="menuitem"
                        href={`/api/user/cv/files/${fileId}/raw?download=1`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs transition hover:bg-[var(--surface-2)]"
                      >
                        <Download size={11} aria-hidden="true" />
                        <span className="truncate">Download stored file</span>
                      </a>
                    </>
                  )}

                  <button
                    role="menuitem"
                    type="button"
                    disabled={busy || cvEmpty}
                    onClick={() => handleGenerate(docType)}
                    title={cvEmpty ? "Build your CV first" : undefined}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs transition hover:bg-[var(--surface-2)] disabled:opacity-50"
                  >
                    {busy
                      ? <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                      : <Download size={11} aria-hidden="true" />}
                    Generate .docx
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
