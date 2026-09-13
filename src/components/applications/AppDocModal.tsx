"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  AlertCircle, ArrowLeft, ChevronDown, Download, Eye, FileText,
  Loader2, Lock, RefreshCw, Sparkles, X,
} from "lucide-react";
import { isContentEmpty } from "@/lib/cv/content";
import {
  DEFAULT_CV_PROFILE, downloadCVDocx, fetchCVProfile, getCachedCVProfile,
  subscribeCVFiles, type CVProfile,
} from "@/hooks/useCVProfile";
import { canExportPdf, canUseCVFormat } from "@/lib/permissions";
import { useDismissable } from "@/hooks/useDismissable";
import DocDiffPanel, { type DocDiff, type LeftSource } from "./DocDiffPanel";
import type { CVContent, CVFormat, CVVariant } from "@/types/cv";

export type AppInfo = {
  companyName: string;
  jobTitle: string;
  location?: string;
  notes?: string;
  jobPostUrl?: string;
  platform?: string;
  jobDescription?: string;
};

type DocType = "cv" | "resume" | "cover-letter";

type Spec = { docType: DocType; format: CVFormat; variant: CVVariant; output: "docx" | "pdf" };

type PreviewResponse = {
  tailoredContent: CVContent;
  diff: DocDiff;
  leftSource: LeftSource;
  filename: string;
  tailorMode: "ai" | "heuristic" | "none";
  tailorNote: string;
  providerLabel?: string;
  upgrade?: boolean;
};

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

  const [review, setReview] = useState<{ spec: Spec; data: PreviewResponse } | null>(null);
  const [correction, setCorrection] = useState("");

  const { closing, close } = useDismissable(onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (getCachedCVProfile()) return;
    let alive = true;
    fetchCVProfile()
      .then((p) => { if (alive) setProfile(p); })
      .finally(() => { if (alive) setFetching(false); });
    return () => { alive = false; };
  }, []);

  useEffect(
    () =>
      subscribeCVFiles((files) =>
        setProfile((prev) => (prev ? { ...prev, uploadedFiles: files } : prev)),
      ),
    [],
  );

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

  function specFor(docType: DocType): Spec {
    const [fmt, variant] = format.split(":") as [CVFormat, CVVariant];
    return {
      docType,
      format: docType === "cv" ? fmt : "ats",
      variant: docType === "resume" ? "compact" : docType === "cv" ? variant : "full",
      output: docType === "cover-letter" && !canPdf ? "docx" : output,
    };
  }

  async function runPreview(spec: Spec, note: string) {
    const res = await fetch("/api/user/cv/generate/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...spec,
        appInfo: info,
        correction: note,
        previousSummary: note ? review?.data.tailoredContent.summary ?? "" : "",
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error ?? "Could not build that document.");
    return body as PreviewResponse;
  }

  async function startReview(docType: DocType) {
    setBusyKey(docType);
    setError("");
    setDone("");
    try {
      const spec = specFor(docType);
      setReview({ spec, data: await runPreview(spec, "") });
      setCorrection("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate that document.");
    } finally {
      setBusyKey(null);
    }
  }

  async function regenerate() {
    if (!review) return;
    setBusyKey("regenerate");
    setError("");
    try {
      setReview({ spec: review.spec, data: await runPreview(review.spec, correction.trim()) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not regenerate that document.");
    } finally {
      setBusyKey(null);
    }
  }

  async function accept() {
    if (!review) return;
    setBusyKey("accept");
    setError("");
    try {
      /* Re-rendered from the exact content just reviewed — the model is never called
         a second time, so what downloads is what was on screen. */
      const filename = await downloadCVDocx({
        ...review.spec,
        appInfo: info,
        content: review.data.tailoredContent,
        useSources: false,
        pretailored: true,
        genTailor: review.data.tailorMode,
        genNote: correction.trim(),
      });
      setReview(null);
      setCorrection("");
      setDone(`${filename} downloaded and saved to My Documents.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that document.");
    } finally {
      setBusyKey(null);
    }
  }

  const reviewing = Boolean(review);
  const busy = busyKey !== null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 text-left ${closing ? "anim-backdrop-out" : "anim-backdrop"}`}
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Generate documents for this application"
    >
      <div
        className={`surface flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-xl border shadow-2xl ${
          reviewing ? "max-w-4xl" : "max-w-lg"
        } ${closing ? "anim-panel-out" : "anim-panel"}`}
      >
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="flex min-w-0 items-start gap-2">
            {reviewing && (
              <button
                type="button"
                onClick={() => { setReview(null); setError(""); }}
                aria-label="Back to options"
                className="text-muted mt-0.5 shrink-0 rounded-md p-1 transition hover:bg-[var(--surface-2)]"
              >
                <ArrowLeft size={15} aria-hidden="true" />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Sparkles size={15} style={{ color: "var(--primary)" }} aria-hidden="true" />
                {reviewing ? "Review before saving" : "Generate documents"}
              </h2>
              <p className="text-muted mt-0.5 truncate text-xs">
                {reviewing ? review!.data.filename : `${info.jobTitle} · ${info.companyName}`}
              </p>
            </div>
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

        {error && <p className="anim-in border-b px-5 py-2.5 text-xs text-red-600">{error}</p>}

        {reviewing ? (
          <>
            <DocDiffPanel
              diff={review!.data.diff}
              leftSource={review!.data.leftSource}
              tailorMode={review!.data.tailorMode}
              tailorNote={review!.data.tailorNote}
              providerLabel={review!.data.providerLabel}
              upgrade={review!.data.upgrade}
            />

            <div className="space-y-2.5 border-t px-5 py-3">
              <label className="block">
                <span className="text-muted mb-1 block text-[10px] font-semibold uppercase tracking-wide">
                  Corrections (optional)
                </span>
                <textarea
                  className="surface w-full rounded-md border px-2.5 py-1.5 text-xs"
                  rows={2}
                  maxLength={2000}
                  placeholder="e.g. lead with the payments work, and keep the summary to three sentences."
                  value={correction}
                  onChange={(e) => setCorrection(e.target.value)}
                />
              </label>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setReview(null); setCorrection(""); }}
                  disabled={busy}
                  className="rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-[var(--surface-2)] disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={regenerate}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-[var(--surface-2)] disabled:opacity-50"
                >
                  {busyKey === "regenerate"
                    ? <><Loader2 size={12} className="animate-spin" aria-hidden="true" /> Regenerating…</>
                    : <><RefreshCw size={12} aria-hidden="true" /> Regenerate</>}
                </button>
                <button
                  type="button"
                  onClick={accept}
                  disabled={busy}
                  className="btn-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {busyKey === "accept"
                    ? <><Loader2 size={12} className="animate-spin" aria-hidden="true" /> Saving…</>
                    : <><Download size={12} aria-hidden="true" /> Accept &amp; download</>}
                </button>
              </div>
              <p className="text-muted text-[11px]">
                Nothing is saved until you accept. Rejecting discards this draft entirely.
              </p>
            </div>
          </>
        ) : (
          <>
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

                  {done && (
                    <p className="anim-in border-b px-5 py-2.5 text-xs" style={{ color: "#047857" }}>{done}</p>
                  )}

                  {!info.jobDescription?.trim() && (
                    <div className="flex items-start gap-2 border-b px-5 py-3">
                      <AlertCircle size={14} className="text-muted mt-0.5 shrink-0" aria-hidden="true" />
                      <p className="text-muted text-xs leading-snug">
                        This application has no job description saved, so tailoring has little to work
                        from. Add one by editing the application.
                      </p>
                    </div>
                  )}

                  {DOC_TYPES.map(({ key: docType, label, hint }) => {
                    const expanded = openSection === docType;
                    const fileId = storedId(docType);
                    const fileName = storedName(docType);
                    const thisBusy = busyKey === docType;

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
                            className="rotates text-muted shrink-0"
                            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
                          />
                        </button>

                        <div className="disclosure" data-open={expanded}>
                          {/* inert keeps the collapsed selects and buttons out of the
                              tab order while they are still in the DOM for the animation */}
                          <div inert={!expanded}>
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
                                onClick={() => startReview(docType)}
                                title={cvEmpty ? "Build your CV first" : undefined}
                                className="btn-primary flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
                              >
                                {thisBusy
                                  ? <><Loader2 size={12} className="animate-spin" aria-hidden="true" /> Preparing…</>
                                  : cvEmpty
                                    ? <><Lock size={12} aria-hidden="true" /> CV required</>
                                    : <><Sparkles size={12} aria-hidden="true" /> Generate {label}</>}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <div className="border-t px-5 py-2.5">
              <p className="text-muted text-[11px]">
                You will see what changed before anything is saved to{" "}
                <Link href="/me/my-cv?tab=generated" className="underline" style={{ color: "var(--primary)" }}>
                  My Documents
                </Link>
                .
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
