"use client";

import { FileText, Image as ImageIcon, File, ExternalLink, Mail, Phone } from "lucide-react";
import { postingAge } from "@/lib/applicationFlags";
import Modal from "@/components/shared/Modal";
import GapAnalysisSection from "@/components/applications/GapAnalysisSection";
import StatusBadge from "@/components/applications/StatusBadge";
import { joinJobTypes, parseJobTypes } from "@/constants/applicationStatus";
import { formatLocation } from "@/lib/applicationLocation";
import { formatSalary } from "@/lib/salary";
import type { Application } from "@/types/application";

function fileExt(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function FileTypeIcon({ name }: { name: string }) {
  const ext = fileExt(name);
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext))
    return <ImageIcon size={14} className="shrink-0 text-blue-500" />;
  if (ext === "pdf") return <FileText size={14} className="shrink-0 text-red-500" />;
  return <File size={14} className="shrink-0 text-muted" />;
}

function fileName(p: string) {
  return p.split("/").pop() ?? p;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-muted text-xs">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

function formatDateTime(d?: Date | string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* Shows what was observed, not a computed certainty. An approximate date came
   from text like "7 months ago", so the original phrase is shown rather than a
   false-precision date. Rows with no value are hidden by Row itself. */
function postedLabel(app: Application): string {
  const age = postingAge(app);
  if (!age.known) return "";
  /* The phrase the posting itself used, where there is one, plus the derived
     reading. "7 months ago · older posting" is more honest than a date we
     inferred from those words. */
  return app.postedAgeText ? `${app.postedAgeText} · ${age.label}` : age.label;
}

function formatDate(d?: Date | string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}

function linkLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function ViewApplicationModal({
  open,
  onClose,
  application,
}: {
  open: boolean;
  onClose: () => void;
  application: Application | null;
}) {
  if (!application) return null;

  const att = application.attachments ?? [];
  const contacts = (application.contacts ?? []).filter((c) => c.name || c.email || c.phone);
  const appliedVia = [application.submissionMethod, application.submissionDetail].filter(Boolean).join(" — ");
  const links = [application.jobPostUrl, ...(application.additionalJobPostUrls ?? [])]
    .filter((u): u is string => Boolean(u && /^https?:\/\//i.test(u)));

  return (
    <Modal open={open} onClose={onClose} title="Application Details">
      <div className="max-h-[75vh] overflow-y-auto px-5 py-4">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xl font-semibold">{application.companyName}</p>
            <p className="text-muted text-sm">{application.jobTitle}</p>
          </div>
          <StatusBadge status={application.applicationStatus} />
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Row label="Location" value={formatLocation(application)} />
          <Row label="Salary" value={formatSalary(application)} />
          <Row label="Platform" value={application.platform} />
          <Row label="Job Type" value={joinJobTypes(parseJobTypes(application.jobType, application.workplaceType))} />
          <Row label="Posted" value={postedLabel(application)} />
          <Row label="Priority" value={application.priority} />
          {!contacts.length && <Row label="Contact Number" value={application.contactNumber} />}
          <Row label="Applied via" value={appliedVia} />
          <Row label="Applied" value={formatDateTime(application.appliedDate)} />
          <Row label="Follow Up" value={formatDate(application.followUpDate)} />
          <Row label="Response Status" value={application.responseStatus} />
        </div>

        {contacts.length > 0 && (
          <div className="mt-4">
            <p className="text-muted text-xs">{contacts.length > 1 ? "Contacts" : "Contact"}</p>
            <ul className="mt-1 space-y-2">
              {contacts.map((c, i) => (
                <li key={i} className="text-sm">
                  <p className="font-medium">
                    {[c.name, c.role].filter(Boolean).join(" · ") || "Contact"}
                  </p>
                  <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1">
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                        <Mail size={12} /> {c.email}
                      </a>
                    )}
                    {c.phone && (
                      <a href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                        <Phone size={12} /> {c.phone}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {links.length > 0 && (
          <div className="mt-4">
            <p className="text-muted text-xs">{links.length > 1 ? "Job Post Links" : "Job Post"}</p>
            <div className="mt-0.5 flex flex-col items-start gap-1">
              {links.map((url, i) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  {i === 0 ? "Open listing" : linkLabel(url)} <ExternalLink size={12} />
                </a>
              ))}
            </div>
          </div>
        )}

        {application.notes && (
          <div className="mt-4">
            <p className="text-muted text-xs">Notes</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm">{application.notes}</p>
          </div>
        )}

        <GapAnalysisSection applicationId={application._id} />

        {/* Attachments */}
        {att.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <p className="mb-2 text-xs font-medium">Attachments ({att.length})</p>
            <div className="space-y-1">
              {att.map((p) => (
                <a
                  key={p}
                  href={p}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="surface-muted flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:opacity-80 transition"
                >
                  <FileTypeIcon name={fileName(p)} />
                  <span className="flex-1 truncate text-xs">{fileName(p)}</span>
                  <ExternalLink size={12} className="text-muted shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 border-t pt-3">
          <p className="text-muted text-xs">
            Created: {formatDateTime(application.createdAt)} · Updated: {formatDateTime(application.updatedAt)}
          </p>
        </div>
      </div>

      <div className="flex justify-end border-t px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border px-4 py-2 text-sm transition hover:bg-[var(--surface-2)]"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
