"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Image as ImageIcon, File, X, Plus } from "lucide-react";
import Modal from "@/components/shared/Modal";
import { APPLICATION_STATUSES, PLATFORMS } from "@/constants/applicationStatus";
import type { Application } from "@/types/application";

/* ── helpers ─────────────────────────────────────── */

function fileExt(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function FileTypeIcon({ name }: { name: string }) {
  const ext = fileExt(name);
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext))
    return <ImageIcon size={14} className="shrink-0 text-blue-500" />;
  if (["pdf"].includes(ext))
    return <FileText size={14} className="shrink-0 text-red-500" />;
  return <File size={14} className="shrink-0 text-muted" />;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function toDateStr(d?: Date | string) {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

function fileName(p: string) {
  return p.split("/").pop() ?? p;
}

async function uploadFile(file: File, companyName: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("companyName", companyName);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error(`Upload failed: ${file.name}`);
  const data = await res.json();
  return data.path as string;
}

/* ── types ───────────────────────────────────────── */

type FormData = {
  companyName: string;
  jobTitle: string;
  platform: string;
  applicationStatus: string;
  location: string;
  salary: string;
  contactNumber: string;
  jobPostUrl: string;
  appliedDate: string;
  priority: string;
  notes: string;
};

const EMPTY: FormData = {
  companyName: "",
  jobTitle: "",
  platform: "",
  applicationStatus: "Wishlist",
  location: "",
  salary: "",
  contactNumber: "",
  jobPostUrl: "",
  appliedDate: "",
  priority: "Medium",
  notes: "",
};

function toForm(app: Application): FormData {
  return {
    companyName: app.companyName,
    jobTitle: app.jobTitle,
    platform: app.platform ?? "",
    applicationStatus: app.applicationStatus,
    location: app.location ?? app.country ?? "",
    salary: app.salary ?? "",
    contactNumber: app.contactNumber ?? "",
    jobPostUrl: app.jobPostUrl ?? "",
    appliedDate: toDateStr(app.appliedDate),
    priority: app.priority ?? "Medium",
    notes: app.notes ?? "",
  };
}

const inputCls =
  "w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium">{label}</label>
      {children}
    </div>
  );
}

/* ── component ───────────────────────────────────── */

export default function ApplicationFormModal({
  open,
  onClose,
  onSaved,
  application,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (app: Application) => void;
  application?: Application;
}) {
  const isEdit = !!application;
  const [form, setForm] = useState<FormData>(isEdit ? toForm(application!) : EMPTY);
  const [existingAttachments, setExistingAttachments] = useState<string[]>(
    application?.attachments ?? [],
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(application ? toForm(application) : EMPTY);
      setExistingAttachments(application?.attachments ?? []);
      setPendingFiles([]);
      setError("");
    }
  }, [open, application]);

  const set =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const reset = () => {
    setForm(application ? toForm(application) : EMPTY);
    setExistingAttachments(application?.attachments ?? []);
    setPendingFiles([]);
    setError("");
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    setPendingFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      return [...prev, ...incoming.filter((f) => !existingNames.has(f.name))];
    });
    e.target.value = "";
  };

  const removePending = (i: number) =>
    setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));

  const removeExisting = (path: string) =>
    setExistingAttachments((prev) => prev.filter((p) => p !== path));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      // Upload pending files
      const uploadedPaths: string[] = [];
      for (const file of pendingFiles) {
        const p = await uploadFile(file, form.companyName || "unknown");
        uploadedPaths.push(p);
      }

      const attachments = [...existingAttachments, ...uploadedPaths];
      const payload = {
        ...form,
        location: form.location || undefined,
        contactNumber: form.contactNumber || undefined,
        jobPostUrl: form.jobPostUrl || undefined,
        platform: form.platform || undefined,
        appliedDate: form.appliedDate || undefined,
        attachments,
      };

      const url = isEdit ? `/api/applications/${application!._id}` : "/api/applications";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setError("Failed to save. Please try again.");
        return;
      }

      const saved = await res.json();
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit ? "Edit Application" : "New Job Application";

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={save}>
        <div className="max-h-[65vh] space-y-3 overflow-y-auto px-5 py-4">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company Name *">
              <input className={inputCls} placeholder="e.g. Google" value={form.companyName} onChange={set("companyName")} required />
            </Field>
            <Field label="Job Title *">
              <input className={inputCls} placeholder="e.g. Software Engineer" value={form.jobTitle} onChange={set("jobTitle")} required />
            </Field>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select className={inputCls} value={form.applicationStatus} onChange={set("applicationStatus")}>
                {APPLICATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Platform">
              <select className={inputCls} value={form.platform} onChange={set("platform")}>
                <option value="">Select platform</option>
                {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location">
              <input className={inputCls} placeholder="e.g. London, UK" value={form.location} onChange={set("location")} />
            </Field>
            <Field label="Salary">
              <input className={inputCls} placeholder="e.g. £50,000/yr" value={form.salary} onChange={set("salary")} />
            </Field>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact Number">
              <input className={inputCls} placeholder="+44 7700 900000" value={form.contactNumber} onChange={set("contactNumber")} />
            </Field>
            <Field label="Priority">
              <select className={inputCls} value={form.priority} onChange={set("priority")}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </Field>
          </div>

          {/* Row 5 */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Applied Date">
              <input type="date" className={inputCls} value={form.appliedDate} onChange={set("appliedDate")} />
            </Field>
            <Field label="Job Post URL">
              <input type="url" className={inputCls} placeholder="https://..." value={form.jobPostUrl} onChange={set("jobPostUrl")} />
            </Field>
          </div>

          {/* Notes */}
          <Field label="Notes">
            <textarea className={inputCls} rows={2} placeholder="Any notes..." value={form.notes} onChange={set("notes")} />
          </Field>

          {/* Attachments */}
          <div className="border-t pt-3">
            <p className="mb-2 text-xs font-medium">Attachments</p>

            {/* Existing attachments (edit mode) */}
            {existingAttachments.length > 0 && (
              <div className="mb-2 space-y-1">
                <p className="text-muted text-xs">Saved files</p>
                {existingAttachments.map((p) => (
                  <div key={p} className="surface-muted flex items-center gap-2 rounded-md px-3 py-1.5 text-sm">
                    <FileTypeIcon name={fileName(p)} />
                    <span className="flex-1 truncate text-xs">{fileName(p)}</span>
                    <button type="button" onClick={() => removeExisting(p)} className="text-muted hover:text-red-500">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Pending files */}
            {pendingFiles.length > 0 && (
              <div className="mb-2 space-y-1">
                <p className="text-muted text-xs">Pending upload</p>
                {pendingFiles.map((file, i) => (
                  <div key={i} className="surface-muted flex items-center gap-2 rounded-md px-3 py-1.5 text-sm">
                    <FileTypeIcon name={file.name} />
                    <span className="flex-1 truncate text-xs">{file.name}</span>
                    <span className="text-muted shrink-0 text-xs">{fmtSize(file.size)}</span>
                    <button type="button" onClick={() => removePending(i)} className="text-muted hover:text-red-500">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* File picker trigger */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition hover:bg-[var(--surface-2)]"
            >
              <Plus size={14} />
              Add files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept="image/*,.pdf,.xlsx,.xls,.doc,.docx,.csv,.txt,.pptx,.ppt"
              onChange={handleFileAdd}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
          <button
            type="button"
            onClick={reset}
            className="rounded-md border px-4 py-2 text-sm transition hover:bg-[var(--surface-2)]"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary rounded-md px-4 py-2 text-sm disabled:opacity-60"
          >
            {saving ? "Saving…" : isEdit ? "Update Application" : "Save Application"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
