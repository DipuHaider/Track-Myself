"use client";

import { useMemo, useRef, useState } from "react";
import { FileText, Image as ImageIcon, File, X, Plus } from "lucide-react";
import Modal from "@/components/shared/Modal";
import { APPLICATION_STATUSES, FACEBOOK_PLATFORMS, PLATFORMS } from "@/constants/applicationStatus";
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

function toDateTimeStr(d?: Date | string) {
  if (!d) return "";
  const date = new Date(d);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

const CURRENCIES = [
  { code: "EUR", symbol: "€" },
  { code: "USD", symbol: "$" },
  { code: "BDT", symbol: "৳" },
] as const;

type Currency = (typeof CURRENCIES)[number]["code"];

/* ── types ───────────────────────────────────────── */

type FormData = {
  companyName: string;
  jobTitle: string;
  platform: string;
  platformDetail: string;
  applicationStatus: string;
  city: string;
  country: string;
  salaryType: "fixed" | "range";
  salaryCurrency: Currency;
  salaryFixed: string;
  salaryMin: string;
  salaryMax: string;
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
  platformDetail: "",
  applicationStatus: "Wishlist",
  city: "",
  country: "",
  salaryType: "fixed",
  salaryCurrency: "USD",
  salaryFixed: "",
  salaryMin: "",
  salaryMax: "",
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
    platformDetail: app.platformDetail ?? "",
    applicationStatus: app.applicationStatus,
    city: app.city ?? "",
    country: app.country ?? "",
    salaryType: app.salaryType ?? "fixed",
    salaryCurrency: app.salaryCurrency ?? "USD",
    salaryFixed: app.salaryFixed != null ? String(app.salaryFixed) : "",
    salaryMin: app.salaryMin != null ? String(app.salaryMin) : "",
    salaryMax: app.salaryMax != null ? String(app.salaryMax) : "",
    contactNumber: app.contactNumber ?? "",
    jobPostUrl: app.jobPostUrl ?? "",
    appliedDate: toDateTimeStr(app.appliedDate),
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

type ServerDuplicate = {
  _id: string; companyName: string; jobTitle: string;
  appliedDate?: Date; applicationStatus: string;
};

export default function ApplicationFormModal({
  open,
  onClose,
  onSaved,
  application,
  applications,
  endpoint,
  method: methodOverride,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (app: Application) => void;
  application?: Application;
  applications?: Application[];
  endpoint?: string;
  method?: "PUT" | "PATCH";
}) {
  const isEdit = !!application;
  const [form, setForm] = useState<FormData>(isEdit ? toForm(application!) : EMPTY);
  const [existingAttachments, setExistingAttachments] = useState<string[]>(
    application?.attachments ?? [],
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [serverDuplicate, setServerDuplicate] = useState<ServerDuplicate | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const session = open ? (application?._id ?? "new") : null;
  const [lastSession, setLastSession] = useState<string | null>(session);
  if (session !== lastSession) {
    setLastSession(session);
    if (open) {
      setForm(application ? toForm(application) : EMPTY);
      setExistingAttachments(application?.attachments ?? []);
      setPendingFiles([]);
      setError("");
      setServerDuplicate(null);
    }
  }

  const duplicateWarnings = useMemo(() => {
    if (!applications || !form.companyName || !form.jobTitle) return [];
    const cn = form.companyName.toLowerCase().trim();
    const jt = form.jobTitle.toLowerCase().trim();
    return applications.filter(
      (a) =>
        (!application || a._id !== application._id) &&
        a.companyName.toLowerCase().trim() === cn &&
        a.jobTitle.toLowerCase().trim() === jt,
    );
  }, [applications, form.companyName, form.jobTitle, application]);

  const set =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9+\-()\s]/g, "");
    setForm((f) => ({ ...f, contactNumber: val }));
  };

  const handlePlatformChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const platform = e.target.value;
    setForm((f) => ({
      ...f,
      platform,
      platformDetail: FACEBOOK_PLATFORMS.has(platform) ? f.platformDetail : "",
    }));
  };

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

  const buildPayload = async () => {
    const uploadedPaths: string[] = [];
    for (const file of pendingFiles) {
      const p = await uploadFile(file, form.companyName || "unknown");
      uploadedPaths.push(p);
    }
    const attachments = [...existingAttachments, ...uploadedPaths];
    return {
      companyName: form.companyName,
      jobTitle: form.jobTitle,
      platform: form.platform || undefined,
      platformDetail: form.platformDetail || undefined,
      applicationStatus: form.applicationStatus,
      city: form.city || undefined,
      country: form.country || undefined,
      salaryType: form.salaryType,
      salaryCurrency: form.salaryCurrency,
      salaryFixed: form.salaryFixed ? Number(form.salaryFixed) : undefined,
      salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
      contactNumber: form.contactNumber || undefined,
      jobPostUrl: form.jobPostUrl || undefined,
      appliedDate: form.appliedDate || undefined,
      priority: form.priority,
      notes: form.notes || undefined,
      attachments,
    };
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setServerDuplicate(null);

    try {
      const payload = await buildPayload();
      const url = endpoint ?? (isEdit ? `/api/applications/${application!._id}` : "/api/applications");
      const method = isEdit ? (methodOverride ?? "PUT") : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        const d = await res.json();
        setServerDuplicate(d.existing);
        return;
      }

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

  const saveAnyway = async () => {
    setServerDuplicate(null);
    setSaving(true);
    setError("");
    try {
      const payload = await buildPayload();
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, force: true }),
      });
      if (!res.ok) { setError("Failed to save. Please try again."); return; }
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
  const isFbPlatform = FACEBOOK_PLATFORMS.has(form.platform);
  const fbDetailLabel =
    form.platform === "Facebook Page" ? "Page URL / Name" : "Group URL / Name";
  const fbDetailPlaceholder =
    form.platform === "Facebook Page" ? "e.g. Tech Jobs BD" : "e.g. Remote Jobs Group";

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={save}>
        <div className="max-h-[65vh] space-y-3 overflow-y-auto px-5 py-4">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company Name *">
              <input
                className={inputCls}
                placeholder="e.g. Google"
                value={form.companyName}
                onChange={set("companyName")}
                required
              />
            </Field>
            <Field label="Job Title *">
              <input
                className={inputCls}
                placeholder="e.g. Software Engineer"
                value={form.jobTitle}
                onChange={set("jobTitle")}
                required
              />
            </Field>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select
                className={inputCls}
                value={form.applicationStatus}
                onChange={set("applicationStatus")}
              >
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Platform">
              <select className={inputCls} value={form.platform} onChange={handlePlatformChange}>
                <option value="">Select platform</option>
                {PLATFORMS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Facebook page/group detail */}
          {isFbPlatform && (
            <Field label={fbDetailLabel}>
              <input
                className={inputCls}
                placeholder={fbDetailPlaceholder}
                value={form.platformDetail}
                onChange={set("platformDetail")}
              />
            </Field>
          )}

          {/* Row 3 — Location: city + country */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="City">
              <input
                className={inputCls}
                placeholder="e.g. London"
                value={form.city}
                onChange={set("city")}
              />
            </Field>
            <Field label="Country">
              <input
                className={inputCls}
                placeholder="e.g. United Kingdom"
                value={form.country}
                onChange={set("country")}
              />
            </Field>
          </div>

          {/* Row 4 — Salary */}
          <Field label="Salary">
            <div className="flex items-center gap-2">
              {/* Fixed / Range toggle */}
              <div className="flex overflow-hidden rounded-md border shrink-0">
                {(["fixed", "range"] as const).map((t, i) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, salaryType: t }))}
                    className={`px-3 py-1.5 text-xs capitalize transition ${i > 0 ? "border-l" : ""} ${form.salaryType === t ? "bg-[var(--primary)] text-white" : "hover:bg-[var(--surface-2)]"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Currency icons */}
              <div className="flex overflow-hidden rounded-md border shrink-0">
                {CURRENCIES.map((c, i) => (
                  <button
                    key={c.code}
                    type="button"
                    title={c.code}
                    onClick={() => setForm((f) => ({ ...f, salaryCurrency: c.code }))}
                    className={`w-8 py-1.5 text-sm transition ${i > 0 ? "border-l" : ""} ${form.salaryCurrency === c.code ? "bg-[var(--primary)] text-white" : "hover:bg-[var(--surface-2)]"}`}
                  >
                    {c.symbol}
                  </button>
                ))}
              </div>

              {/* Amount inputs */}
              {form.salaryType === "fixed" ? (
                <input
                  type="number"
                  min="0"
                  className={`${inputCls} flex-1`}
                  placeholder="Amount"
                  value={form.salaryFixed}
                  onChange={set("salaryFixed")}
                />
              ) : (
                <>
                  <input
                    type="number"
                    min="0"
                    className={`${inputCls} flex-1`}
                    placeholder="Min"
                    value={form.salaryMin}
                    onChange={set("salaryMin")}
                  />
                  <span className="text-muted shrink-0 text-sm">—</span>
                  <input
                    type="number"
                    min="0"
                    className={`${inputCls} flex-1`}
                    placeholder="Max"
                    value={form.salaryMax}
                    onChange={set("salaryMax")}
                  />
                </>
              )}
            </div>
          </Field>

          {/* Row 5 */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact Number">
              <input
                className={inputCls}
                placeholder="+44 7700 900000"
                value={form.contactNumber}
                onChange={handleContactChange}
                inputMode="tel"
              />
            </Field>
            <Field label="Priority">
              <select className={inputCls} value={form.priority} onChange={set("priority")}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </Field>
          </div>

          {/* Row 6 */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Applied Date & Time">
              <input
                type="datetime-local"
                className={inputCls}
                value={form.appliedDate}
                onChange={set("appliedDate")}
              />
            </Field>
            <Field label="Job Post URL">
              <input
                type="url"
                className={inputCls}
                placeholder="https://..."
                value={form.jobPostUrl}
                onChange={set("jobPostUrl")}
              />
            </Field>
          </div>

          {/* Notes */}
          <Field label="Notes">
            <textarea
              className={inputCls}
              rows={2}
              placeholder="Any notes..."
              value={form.notes}
              onChange={set("notes")}
            />
          </Field>

          {/* Attachments */}
          <div className="border-t pt-3">
            <p className="mb-2 text-xs font-medium">Attachments</p>

            {existingAttachments.length > 0 && (
              <div className="mb-2 space-y-1">
                <p className="text-muted text-xs">Saved files</p>
                {existingAttachments.map((p) => (
                  <div
                    key={p}
                    className="surface-muted flex items-center gap-2 rounded-md px-3 py-1.5 text-sm"
                  >
                    <FileTypeIcon name={fileName(p)} />
                    <span className="flex-1 truncate text-xs">{fileName(p)}</span>
                    <button
                      type="button"
                      onClick={() => removeExisting(p)}
                      className="text-muted hover:text-red-500"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {pendingFiles.length > 0 && (
              <div className="mb-2 space-y-1">
                <p className="text-muted text-xs">Pending upload</p>
                {pendingFiles.map((file, i) => (
                  <div
                    key={i}
                    className="surface-muted flex items-center gap-2 rounded-md px-3 py-1.5 text-sm"
                  >
                    <FileTypeIcon name={file.name} />
                    <span className="flex-1 truncate text-xs">{file.name}</span>
                    <span className="text-muted shrink-0 text-xs">{fmtSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => removePending(i)}
                      className="text-muted hover:text-red-500"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

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

          {/* Client-side duplicate warning (live as user types) */}
          {duplicateWarnings.length > 0 && !serverDuplicate && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <strong>Possible duplicate:</strong> You already have {duplicateWarnings.length}{" "}
              application{duplicateWarnings.length > 1 ? "s" : ""} for{" "}
              <em>{form.jobTitle}</em> at <em>{form.companyName}</em>. You can still save.
            </div>
          )}

          {/* Server-confirmed 409 duplicate */}
          {serverDuplicate && (
            <div className="rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="font-medium">Duplicate confirmed by server</p>
              <p className="mt-0.5 text-xs">
                Existing: <strong>{serverDuplicate.companyName}</strong> —{" "}
                {serverDuplicate.jobTitle}
                {serverDuplicate.appliedDate &&
                  ` · applied ${new Date(serverDuplicate.appliedDate).toLocaleDateString("en-GB")}`}
                {" "}· {serverDuplicate.applicationStatus}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={saveAnyway}
                  disabled={saving}
                  className="rounded-md bg-amber-600 px-3 py-1 text-xs text-white transition hover:bg-amber-700 disabled:opacity-60"
                >
                  Save anyway
                </button>
                <button
                  type="button"
                  onClick={() => setServerDuplicate(null)}
                  className="rounded-md border px-3 py-1 text-xs transition hover:bg-[var(--surface-2)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

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
