"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  AlertCircle, ChevronDown, Download, Eye, FileText, Loader2, Lock, Sparkles, X,
} from "lucide-react";
import { isContentEmpty } from "@/lib/cv/content";
import {
  DEFAULT_CV_PROFILE, downloadCVDocx, fetchCVProfile, getCachedCVProfile, type CVProfile,
} from "@/hooks/useCVProfile";
import { canExportPdf, canUseCVFormat } from "@/lib/permissions";
import type { CVFormat, CVVariant } from "@/types/cv";

export type AppInfo = {
  companyName: string;
  jobTitle: string;
  location?: string;
  notes?: string;
  jobPostUrl?: string;
};

type DocType = "cv" | "resume" | "cover-letter";

const DOC_TYPES: { key: DocType; label: string; hint: string }[] = [
  { key: "cv",           label: "CV",           hint: "Your full CV, in the format you pick." },
  { key: "resume",       label: "Resume",       hint: "Shorter and front-loaded, tailored to this role." },
  { key: "cover-letter", label: "Cover Letter", hint: "Addressed to this company and role." },
];

const PRIMARY_SLOT: Record<DocType, "cv" | "resume" | "coverLetter"> = {
  "cv": "cv", "resume": "resume", "cover-letter": "coverLetter",
};

const FORMATS: { key: CVFormat; variant: CVVariant; label: string }[] = [
  { key: "ats", variant: "full", label: "ATS Friendly · 3 pages" },
  { key: "ats", variant: "compact", label: "ATS Compact · 2 pages" },
  { key: "europass", variant: "full", label: "Europass" },
  { key: "designer", variant: "full", label: "Designer" },
  { key: "lebenslauf", variant: "full", label: "Lebenslauf" },
];

export default function AppDocModal({
  info,
  onClose,
}: {
  info: AppInfo;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const user = session?.user as { role?: string; plan?: string } | undefined;
  const canPdf = canExportPdf(user?.role, user?.plan);

  const [profile, setProfile] = useState<CVProfile | null>(getCachedCVProfile());
  const [fetching, setFetching] = useState(!getCachedCVProfile());
  const [openSection, setOpenSection] = useState<DocType>("cv");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const [formatPref, setFormatPref] = useState<string>("ats:full");
  const [output, setOutput] = useState<"docx" | "pdf">("docx");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (getCachedCVProfile()) return;
    let alive = true;
    fetchCVProfile()
      .then((p) => { if (alive) setProfile(p); })
      .finally(() => { if (alive) setFetching(false); });
    return () => { alive = false; };
  }, []);

  const current = profile ?? DEFAULT_CV_PROFILE;
  const cvEmpty = isContentEmpty(current.content);

  const allowed = FORMATS.filter((f) => canUseCVFormat(user?.role, user?.plan, f.key, f.variant));

  /* Derived, not stored: a plan change can invalidate the preference, and falling
     back during render avoids an effect that would fight the entitlement list. */
  const format = allowed.some((f) => `${f.key}:${f.variant}` === formatPref)
    ? formatPref
    : allowed[0]
      ? `${allowed[0].key}:${allowed[0].variant}`
      : "ats:full";

  const storedId = (docType: DocType) => current.primary[PRIMARY_SLOT[docType]] ?? "";
  const storedName = (docType: DocType) =>
    current.uploadedFiles.find((f) => f._id === storedId(docType))?.name ?? "";

  async function generate(docType: DocType) {
    setBusyKey(docType);
    setError("");
    setDone("");
    const [fmt, variant] = format.split(":") as [CVFormat, CVVariant];
    try {
      const filename = await downloadCVDocx({
        docType,
        format: docType === "cv" ? fmt : "ats",
        variant: docType === "resume" ? "compact" : docType === "cv" ? variant : "full",
        output: docType === "cover-letter" && !canPdf ? "docx" : output,
        appInfo: {
          companyName: info.companyName,
          jobTitle: info.jobTitle,
          location: info.location,
          notes: info.notes,
        },
      });
      setDone(`${filename} downloaded and saved to My Documents.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate that document.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Generate documents for this application"
    >
      <div className="surface flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-xl border shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Sparkles size={15} style={{ color: "var(--primary)" }} aria-hidden="true" />
              Generate documents
            </h2>
            <p className="text-muted mt-0.5 truncate text-xs">
              {info.jobTitle} · {info.companyName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1.5 transition hover:bg-[var(--surface-2)]"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {fetching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="text-muted animate-spin" aria-hidden="true" />
            </div>
          ) : (
            <>
              {cvEmpty && (
                <div className="flex items-start gap-2 border-b px-5 py-3">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: "#d97706" }} aria-hidden="true" />
                  <p className="text-muted text-xs leading-snug">
                    Your CV is empty, so nothing can be generated yet.{" "}
                    <Link href="/me/cv" className="font-semibold underline" style={{ color: "var(--primary)" }}>
                      Build your CV
                    </Link>
                    .
                  </p>
                </div>
              )}

              {error && <p className="border-b px-5 py-2.5 text-xs text-red-600">{error}</p>}
              {done && (
                <p className="border-b px-5 py-2.5 text-xs" style={{ color: "#047857" }}>{done}</p>
              )}

              {DOC_TYPES.map(({ key: docType, label, hint }) => {
                const expanded = openSection === docType;
                const fileId = storedId(docType);
                const fileName = storedName(docType);
                const busy = busyKey === docType;

                return (
                  <div key={docType} className="border-b last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setOpenSection(expanded ? ("" as DocType) : docType)}
                      aria-expanded={expanded}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-[var(--surface-2)]"
                    >
                      <FileText size={14} className="text-muted shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{label}</span>
                        <span className="text-muted block text-[11px] leading-snug">{hint}</span>
                      </span>
                      {fileId && (
                        <span
                          className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                          style={{ background: "var(--surface-2)", color: "var(--muted-foreground)" }}
                        >
                          STORED
                        </span>
                      )}
                      <ChevronDown
                        size={14}
                        aria-hidden="true"
                        className="text-muted shrink-0 transition-transform"
                        style={{ transform: expanded ? "rotate(180deg)" : undefined }}
                      />
                    </button>

                    {expanded && (
                      <div className="space-y-3 px-5 pb-4">
                        {fileId && (
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={`/api/user/cv/files/${fileId}/raw`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition hover:bg-[var(--surface-2)]"
                            >
                              <Eye size={11} aria-hidden="true" />
                              <span className="max-w-[12rem] truncate">View {fileName || "stored file"}</span>
                            </a>
                            <a
                              href={`/api/user/cv/files/${fileId}/raw?download=1`}
                              className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition hover:bg-[var(--surface-2)]"
                            >
                              <Download size={11} aria-hidden="true" /> Download stored
                            </a>
                          </div>
                        )}

                        <div className="grid gap-2 sm:grid-cols-2">
                          {docType === "cv" && (
                            <label className="block">
                              <span className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wide">
                                Format
                              </span>
                              <select
                                value={format}
                                onChange={(e) => setFormatPref(e.target.value)}
                                className="surface w-full rounded-md border px-2 py-1.5 text-xs"
                              >
                                {allowed.map((f) => (
                                  <option key={`${f.key}:${f.variant}`} value={`${f.key}:${f.variant}`}>
                                    {f.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}

                          <label className="block">
                            <span className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wide">
                              File type
                            </span>
                            <select
                              value={output}
                              onChange={(e) => setOutput(e.target.value as "docx" | "pdf")}
                              className="surface w-full rounded-md border px-2 py-1.5 text-xs"
                            >
                              <option value="docx">Word (.docx)</option>
                              <option value="pdf" disabled={!canPdf}>
                                {canPdf ? "PDF (.pdf)" : "PDF (.pdf) — Premium"}
                              </option>
                            </select>
                          </label>
                        </div>

                        <button
                          type="button"
                          disabled={busy || cvEmpty}
                          onClick={() => generate(docType)}
                          title={cvEmpty ? "Build your CV first" : undefined}
                          className="btn-primary flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
                        >
                          {busy
                            ? <><Loader2 size={12} className="animate-spin" aria-hidden="true" /> Generating…</>
                            : cvEmpty
                              ? <><Lock size={12} aria-hidden="true" /> CV required</>
                              : <><Download size={12} aria-hidden="true" /> Generate {label}</>}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="border-t px-5 py-2.5">
          <p className="text-muted text-[11px]">
            Everything generated here is also saved to{" "}
            <Link href="/me/my-cv?tab=generated" className="underline" style={{ color: "var(--primary)" }}>
              My Documents
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
