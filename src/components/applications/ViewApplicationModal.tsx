"use client";

import { FileText, Image as ImageIcon, File, ExternalLink } from "lucide-react";
import Modal from "@/components/shared/Modal";
import StatusBadge from "@/components/applications/StatusBadge";
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
          <Row label="Location" value={application.location ?? application.country} />
          <Row label="Salary" value={application.salary} />
          <Row label="Platform" value={application.platform} />
          <Row label="Priority" value={application.priority} />
          <Row label="Contact Number" value={application.contactNumber} />
          <Row label="Applied" value={formatDateTime(application.appliedDate)} />
          <Row label="Follow Up" value={formatDateTime(application.followUpDate)} />
          <Row label="Response Status" value={application.responseStatus} />
        </div>

        {application.jobPostUrl && (
          <div className="mt-4">
            <p className="text-muted text-xs">Job Post</p>
            <a
              href={application.jobPostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Open listing <ExternalLink size={12} />
            </a>
          </div>
        )}

        {application.notes && (
          <div className="mt-4">
            <p className="text-muted text-xs">Notes</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm">{application.notes}</p>
          </div>
        )}

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
