"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ExternalLink, FolderOpen, Loader2 } from "lucide-react";
import DocumentSection, { type SectionSpec } from "@/components/cv/DocumentSection";
import GeneratedDocuments from "@/components/cv/GeneratedDocuments";
import { useCVProfile } from "@/hooks/useCVProfile";
import type { CVFileCategory, CVFileMeta, CVPrimaryFiles } from "@/types/cv";

const DOC_ACCEPT = ".pdf,.doc,.docx";
const IMG_ACCEPT = ".png,.jpg,.jpeg,.webp";

const SECTIONS: (SectionSpec & { slot?: keyof CVPrimaryFiles })[] = [
  {
    category: "cv", slot: "cv",
    title: "CV",
    description: "Your full CV files. The starred one is used when generating documents for an application.",
    accept: DOC_ACCEPT, maxMB: 5, kind: "document", primaryLabel: "Main CV",
  },
  {
    category: "resume", slot: "resume",
    title: "Resume",
    description: "Shorter, role-focused resumes. Star the one you send most often.",
    accept: DOC_ACCEPT, maxMB: 5, kind: "document", primaryLabel: "Main Resume",
  },
  {
    category: "cover-letter", slot: "coverLetter",
    title: "Cover Letters",
    description: "Reusable cover letters and templates.",
    accept: DOC_ACCEPT, maxMB: 5, kind: "document", primaryLabel: "Main Letter",
  },
  {
    category: "certificate",
    title: "Certificates & Files",
    description: "Degrees, certifications, references, transcripts — anything an employer may ask for.",
    accept: `${DOC_ACCEPT},${IMG_ACCEPT}`, maxMB: 5, kind: "document",
  },
  {
    category: "profile-photo", slot: "profilePhoto",
    title: "Profile Picture",
    description: "35 × 45 mm portrait works best. Embedded in the Lebenslauf, Europass and Designer CVs.",
    accept: IMG_ACCEPT, maxMB: 3, kind: "image", primaryLabel: "In use", singleSlot: true,
  },
  {
    category: "cover-image", slot: "coverImage",
    title: "Cover Image",
    description: "Banner image for your portfolio or profile header.",
    accept: IMG_ACCEPT, maxMB: 6, kind: "image", primaryLabel: "In use", singleSlot: true,
  },
  {
    category: "other",
    title: "Other Files",
    description: "Anything else worth keeping with your application documents.",
    accept: `${DOC_ACCEPT},${IMG_ACCEPT}`, maxMB: 5, kind: "document",
  },
];

export default function MyDocumentsPage() {
  const { profile, applyPatch, loading } = useCVProfile();

  /* Documents the app produced are listed separately from files the user uploaded —
     they are output, not source, and the CV Builder never reads them back in. */
  const files = useMemo(
    () => profile.uploadedFiles.filter((f) => !f.generated),
    [profile.uploadedFiles],
  );
  const generated = useMemo(
    () => profile.uploadedFiles
      .filter((f) => f.generated)
      .sort((a, b) => String(b.uploadedAt ?? "").localeCompare(String(a.uploadedAt ?? ""))),
    [profile.uploadedFiles],
  );

  const byCategory = useMemo(() => {
    const map = {} as Record<CVFileCategory, CVFileMeta[]>;
    for (const spec of SECTIONS) map[spec.category] = [];
    for (const file of files) {
      const key = (file.category ?? "other") as CVFileCategory;
      (map[key] ??= []).push(file);
    }
    return map;
  }, [files]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={22} className="text-muted animate-spin" />
      </div>
    );
  }

  const totalFiles = files.length;

  return (
    <div className="max-w-3xl space-y-5 pb-12">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <FolderOpen size={20} style={{ color: "var(--primary)" }} aria-hidden="true" />
          My Documents
        </h1>
        <p className="text-muted mt-1 text-sm">
          Everything you send with an application, in one place. Starred items are the ones TrackMyself
          uses when it generates documents for a job.
        </p>
      </div>

      <div className="surface flex flex-wrap items-center justify-between gap-3 rounded-xl border px-5 py-3.5">
        <p className="text-sm">
          <strong>{totalFiles}</strong> file{totalFiles === 1 ? "" : "s"} uploaded
          {generated.length > 0 && (
            <span className="text-muted">
              {" · "}<strong>{generated.length}</strong> generated
            </span>
          )}
        </p>
        <Link
          href="/me/cv"
          className="btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold"
        >
          <ExternalLink size={13} aria-hidden="true" />
          Open CV Builder
        </Link>
      </div>

      {SECTIONS.map((spec) => (
        <DocumentSection
          key={spec.category}
          spec={spec}
          files={byCategory[spec.category] ?? []}
          primaryId={spec.slot ? profile.primary[spec.slot] : ""}
          onFilesChange={(files, mode) => {
            if (mode === "all") {
              applyPatch({ uploadedFiles: files });
              return;
            }
            const others = profile.uploadedFiles.filter(
              (f) => (f.category ?? "other") !== spec.category,
            );
            applyPatch({ uploadedFiles: [...others, ...files] });
          }}
          onPrimaryChange={(value) => {
            if (!spec.slot) return;
            applyPatch({ primary: { ...profile.primary, [spec.slot]: value } });
          }}
        />
      ))}

      <GeneratedDocuments
        files={generated}
        onDeleted={(id) => {
          applyPatch({ uploadedFiles: profile.uploadedFiles.filter((f) => f._id !== id) });
        }}
      />
    </div>
  );
}
