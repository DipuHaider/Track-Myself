"use client";

import { useMemo, useRef, useState } from "react";
import { FileText, Image as ImageIcon, File, X, Plus } from "lucide-react";
import Modal from "@/components/shared/Modal";
import {
  APPLICATION_STATUSES, CONTACT_FIRST_METHODS, CONTACT_ROLES, DEFAULT_DOCUMENT_FORMAT, DOCUMENT_FORMATS,
  FACEBOOK_PLATFORMS, JOB_TYPES, MAX_CONTACTS, MAX_JOB_POST_URLS, PLATFORMS, PROVIDED_DOCUMENTS, SUBMISSION_DETAIL_HINTS,
  SUBMISSION_DETAIL_METHODS, SUBMISSION_METHODS, joinJobTypes, parseJobTypes,
} from "@/constants/applicationStatus";
import type { Application, ApplicationContact } from "@/types/application";
import { formatLocation, splitLocation } from "@/lib/applicationLocation";
import { SALARY_TYPES, SALARY_TYPE_LABELS, hasSalaryAmount, editableAmount, isValidAmount, parseAmount, type SalaryType } from "@/lib/salary";

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
  jobTypes: string[];
  applicationStatus: string;
  city: string;
  country: string;
  salaryType: SalaryType;
  salaryCurrency: Currency;
  salaryFixed: string;
  salaryMin: string;
  salaryMax: string;
  submissionMethod: string;
  submissionDetail: string;
  contacts: ContactRow[];
  jobPostUrls: string[];
  jobDescription: string;
  appliedDate: string;
  followUpDate: string;
  priority: string;
  notes: string;
  documents: Record<string, string>;
};

type ContactRow = { role: string; name: string; email: string; phone: string };

const EMPTY_CONTACT: ContactRow = { role: "", name: "", email: "", phone: "" };

function toContactRows(app: Application): ContactRow[] {
  const rows = (app.contacts ?? []).map((c: ApplicationContact) => ({
    role: c.role ?? "",
    name: c.name ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
  }));
  if (!rows.length && app.contactNumber) rows.push({ ...EMPTY_CONTACT, phone: app.contactNumber });
  return rows;
}

function cleanContacts(rows: ContactRow[]): ContactRow[] {
  return rows
    .map((c) => ({ role: c.role, name: c.name.trim(), email: c.email.trim(), phone: c.phone.trim() }))
    .filter((c) => c.name || c.email || c.phone);
}

const EMPTY: FormData = {
  companyName: "",
  jobTitle: "",
  platform: "",
  platformDetail: "",
  jobTypes: [],
  applicationStatus: "Wishlist",
  city: "",
  country: "",
  salaryType: "fixed",
  salaryCurrency: "USD",
  salaryFixed: "",
  salaryMin: "",
  salaryMax: "",
  submissionMethod: "",
  submissionDetail: "",
  contacts: [],
  jobPostUrls: [""],
  jobDescription: "",
  appliedDate: "",
  followUpDate: "",
  priority: "Medium",
  notes: "",
  documents: {},
};

function toForm(app: Application): FormData {
  const parsed = app.city || app.country ? null : splitLocation(app.location ?? "");
  return {
    companyName: app.companyName,
    jobTitle: app.jobTitle,
    platform: app.platform ?? "",
    platformDetail: app.platformDetail ?? "",
    jobTypes: parseJobTypes(app.jobType, app.workplaceType),
    applicationStatus: app.applicationStatus,
    city: parsed ? parsed.city : app.city ?? "",
    country: parsed ? parsed.country : app.country ?? "",
    salaryType: app.salaryType ?? "fixed",
    salaryCurrency: app.salaryCurrency ?? "USD",
    salaryFixed: editableAmount(app.salaryFixed),
    salaryMin: editableAmount(app.salaryMin),
    salaryMax: editableAmount(app.salaryMax),
    submissionMethod: app.submissionMethod ?? "",
    submissionDetail: app.submissionDetail ?? "",
    contacts: toContactRows(app),
    jobPostUrls: [app.jobPostUrl ?? "", ...(app.additionalJobPostUrls ?? [])].filter((u, i) => i === 0 || u),
    jobDescription: app.jobDescription ?? "",
    appliedDate: toDateTimeStr(app.appliedDate),
    followUpDate: toDateTimeStr(app.followUpDate).slice(0, 10),
    priority: app.priority ?? "Medium",
    notes: app.notes ?? "",
    documents: Object.fromEntries(
      (app.providedDocuments ?? []).map((d) => [d.name, d.format || DEFAULT_DOCUMENT_FORMAT]),
    ),
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

  const setJobPostUrl = (i: number, value: string) =>
    setForm((f) => ({ ...f, jobPostUrls: f.jobPostUrls.map((u, j) => (j === i ? value : u)) }));

  const addJobPostUrl = () =>
    setForm((f) => (f.jobPostUrls.length >= MAX_JOB_POST_URLS ? f : { ...f, jobPostUrls: [...f.jobPostUrls, ""] }));

  const removeJobPostUrl = (i: number) =>
    setForm((f) => ({ ...f, jobPostUrls: f.jobPostUrls.filter((_, j) => j !== i) }));

  const toggleJobType = (t: string) =>
    setForm((f) => ({
      ...f,
      jobTypes: f.jobTypes.includes(t) ? f.jobTypes.filter((x) => x !== t) : [...f.jobTypes, t],
    }));

  const setContact = (i: number, field: keyof ContactRow, raw: string) => {
    const value = field === "phone" ? raw.replace(/[^0-9+\-()\s]/g, "") : raw;
    setForm((f) => ({ ...f, contacts: f.contacts.map((c, j) => (j === i ? { ...c, [field]: value } : c)) }));
  };

  const addContact = () =>
    setForm((f) => (f.contacts.length >= MAX_CONTACTS ? f : { ...f, contacts: [...f.contacts, { ...EMPTY_CONTACT }] }));

  const toggleDocument = (name: string) =>
    setForm((f) => {
      const documents = { ...f.documents };
      if (documents[name]) delete documents[name];
      else documents[name] = DEFAULT_DOCUMENT_FORMAT;
      return { ...f, documents };
    });

  const setDocumentFormat = (name: string, format: string) =>
    setForm((f) => ({ ...f, documents: { ...f.documents, [name]: format } }));

  const removeContact = (i: number) =>
    setForm((f) => ({ ...f, contacts: f.contacts.filter((_, j) => j !== i) }));

  const handleSubmissionMethod = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const method = e.target.value;
    setForm((f) => ({
      ...f,
      submissionMethod: method,
      contacts: CONTACT_FIRST_METHODS.has(method) && f.contacts.length === 0 ? [{ ...EMPTY_CONTACT }] : f.contacts,
    }));
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
    const amounts = form.salaryType === "fixed" ? [form.salaryFixed]
      : form.salaryType === "range" ? [form.salaryMin, form.salaryMax] : [];
    if (!amounts.every(isValidAmount)) {
      throw new Error("Salary must be a number such as 70000, 70,000 or 70K.");
    }
    const uploadedPaths: string[] = [];
    for (const file of pendingFiles) {
      const p = await uploadFile(file, form.companyName || "unknown");
      uploadedPaths.push(p);
    }
    const links = [...new Set(form.jobPostUrls.map((u) => u.trim()).filter(Boolean))];
    const contacts = cleanContacts(form.contacts);
    const attachments = [...existingAttachments, ...uploadedPaths];
    return {
      companyName: form.companyName,
      jobTitle: form.jobTitle,
      platform: form.platform || undefined,
      platformDetail: form.platformDetail || undefined,
      jobType: joinJobTypes(form.jobTypes),
      workplaceType: "",
      applicationStatus: form.applicationStatus,
      city: form.city.trim(),
      country: form.country.trim(),
      location: formatLocation({ city: form.city, country: form.country }),
      salaryType: form.salaryType,
      salaryCurrency: form.salaryCurrency,
      salaryFixed: form.salaryType === "fixed" ? parseAmount(form.salaryFixed) : null,
      salaryMin: form.salaryType === "range" ? parseAmount(form.salaryMin) : null,
      salaryMax: form.salaryType === "range" ? parseAmount(form.salaryMax) : null,
      submissionMethod: form.submissionMethod || null,
      submissionDetail: SUBMISSION_DETAIL_METHODS.has(form.submissionMethod) ? form.submissionDetail.trim() : "",
      contacts,
      contactNumber: contacts.find((c) => c.phone)?.phone ?? "",
      jobPostUrl: links[0] ?? "",
      additionalJobPostUrls: links.slice(1),
      jobDescription: form.jobDescription || undefined,
      appliedDate: form.appliedDate || undefined,
      followUpDate: form.followUpDate ? new Date(`${form.followUpDate}T12:00`).toISOString() : null,
      priority: form.priority,
      notes: form.notes || undefined,
      providedDocuments: PROVIDED_DOCUMENTS
        .filter((name) => form.documents[name])
        .map((name) => ({ name, format: form.documents[name] })),
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
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to save. Please try again.");
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
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to save. Please try again.");
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

          {/* Row 3 — Job type */}
          <Field label="Job Type">
            <div className="flex flex-wrap gap-1.5">
              {JOB_TYPES.map((t) => {
                const on = form.jobTypes.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleJobType(t)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      on
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                        : "hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Row 4 — Location: city + country */}
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

          {/* Row 5 — Salary */}
          <Field label="Salary">
            <div className="flex flex-wrap items-center gap-2">
              {/* Salary type toggle */}
              <div className="flex overflow-hidden rounded-md border shrink-0">
                {SALARY_TYPES.map((t, i) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, salaryType: t }))}
                    className={`whitespace-nowrap px-3 py-1.5 text-xs transition ${i > 0 ? "border-l" : ""} ${form.salaryType === t ? "bg-[var(--primary)] text-white" : "hover:bg-[var(--surface-2)]"}`}
                  >
                    {SALARY_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>

              {/* Currency icons */}
              {hasSalaryAmount(form.salaryType) && (
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
              )}
            </div>

            {/* Amount inputs — on their own row so they get the full width */}
            {form.salaryType === "fixed" && (
              <input
                type="text"
                className={`${inputCls} mt-2 ${isValidAmount(form.salaryFixed) ? "" : "border-red-500"}`}
                placeholder="Amount, e.g. 70K"
                value={form.salaryFixed}
                onChange={set("salaryFixed")}
              />
            )}
            {form.salaryType === "range" && (
              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                <input
                  type="text"
                  aria-label="Minimum salary"
                  className={`${inputCls} ${isValidAmount(form.salaryMin) ? "" : "border-red-500"}`}
                  placeholder="Min, e.g. 70K"
                  value={form.salaryMin}
                  onChange={set("salaryMin")}
                />
                <span className="text-muted text-sm">—</span>
                <input
                  type="text"
                  aria-label="Maximum salary"
                  className={`${inputCls} ${isValidAmount(form.salaryMax) ? "" : "border-red-500"}`}
                  placeholder="Max, e.g. 90K"
                  value={form.salaryMax}
                  onChange={set("salaryMax")}
                />
              </div>
            )}
          </Field>

          {/* Row 6 — Priority + how the application was made */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <select className={inputCls} value={form.priority} onChange={set("priority")}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </Field>
            <Field label="Applied via">
              <select className={inputCls} value={form.submissionMethod} onChange={handleSubmissionMethod}>
                <option value="">—</option>
                {SUBMISSION_METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
          </div>

          {SUBMISSION_DETAIL_METHODS.has(form.submissionMethod) && (
            <Field label="Where / how">
              <input
                className={inputCls}
                maxLength={300}
                placeholder={SUBMISSION_DETAIL_HINTS[form.submissionMethod] ?? ""}
                value={form.submissionDetail}
                onChange={set("submissionDetail")}
              />
            </Field>
          )}

          {/* Row 7 — dates */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Applied Date & Time">
              <input
                type="datetime-local"
                className={inputCls}
                value={form.appliedDate}
                onChange={set("appliedDate")}
              />
            </Field>
            <Field label="Follow-up date">
              <input
                type="date"
                className={inputCls}
                value={form.followUpDate}
                onChange={set("followUpDate")}
              />
            </Field>
          </div>

          {/* Contacts — recruiter, reference person, hiring manager… */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium">Contacts</span>
              <button
                type="button"
                onClick={addContact}
                disabled={form.contacts.length >= MAX_CONTACTS}
                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition hover:bg-[var(--surface-2)] disabled:opacity-40"
              >
                <Plus size={12} /> Add contact
              </button>
            </div>
            {form.contacts.length === 0 ? (
              <p className="text-muted text-xs">
                Add the recruiter, reference person or hiring manager you dealt with directly.
              </p>
            ) : (
              <div className="space-y-2">
                {form.contacts.map((c, i) => (
                  <div key={i} className="surface-muted relative rounded-md border p-3 pr-10">
                    <button
                      type="button"
                      onClick={() => removeContact(i)}
                      title="Remove contact"
                      aria-label="Remove contact"
                      className="absolute right-2 top-2 rounded-md p-1 transition hover:bg-[var(--surface-2)]"
                    >
                      <X size={14} />
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className={inputCls}
                        aria-label="Contact role"
                        value={c.role}
                        onChange={(e) => setContact(i, "role", e.target.value)}
                      >
                        <option value="">Role</option>
                        {CONTACT_ROLES.map((role) => (
                          <option key={role}>{role}</option>
                        ))}
                      </select>
                      <input
                        className={inputCls}
                        aria-label="Contact name"
                        placeholder="Name"
                        maxLength={120}
                        value={c.name}
                        onChange={(e) => setContact(i, "name", e.target.value)}
                      />
                      <input
                        type="email"
                        className={inputCls}
                        aria-label="Contact email"
                        placeholder="Email"
                        maxLength={200}
                        value={c.email}
                        onChange={(e) => setContact(i, "email", e.target.value)}
                      />
                      <input
                        className={inputCls}
                        aria-label="Contact phone"
                        placeholder="+44 7700 900000"
                        inputMode="tel"
                        maxLength={40}
                        value={c.phone}
                        onChange={(e) => setContact(i, "phone", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Field label="Job Post URL">
            <div className="space-y-2">
              {form.jobPostUrls.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="url"
                    className={inputCls}
                    placeholder={i === 0 ? "https://..." : "Another link, e.g. the company careers page"}
                    value={url}
                    onChange={(e) => setJobPostUrl(i, e.target.value)}
                  />
                  {i === 0 ? (
                    <button
                      type="button"
                      onClick={addJobPostUrl}
                      disabled={form.jobPostUrls.length >= MAX_JOB_POST_URLS}
                      title="Add another link"
                      aria-label="Add another link"
                      className="shrink-0 rounded-md border p-2 transition hover:bg-[var(--surface-2)] disabled:opacity-40"
                    >
                      <Plus size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeJobPostUrl(i)}
                      title="Remove link"
                      aria-label="Remove link"
                      className="shrink-0 rounded-md border p-2 transition hover:bg-[var(--surface-2)]"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Field>

          {/* Job description — the text AI tailoring reads when generating for this job. */}
          <Field label="Job description">
            <textarea
              className={inputCls}
              rows={4}
              maxLength={24000}
              placeholder="Paste the job posting here. Documents generated for this application are tailored against it."
              value={form.jobDescription}
              onChange={set("jobDescription")}
            />
            <p className="text-muted mt-1 text-[11px]">
              {form.jobDescription.trim()
                ? form.jobDescription.length.toLocaleString() + " characters"
                : "Optional, but tailoring is much better with it."}
            </p>
          </Field>

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

          {/* Documents provided — what went out with this application, and in which format */}
          <div>
            <p className="mb-1 text-xs font-medium">Documents provided</p>
            <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
              {PROVIDED_DOCUMENTS.map((name) => {
                const format = form.documents[name];
                return (
                  <div key={name} className="flex items-center gap-2">
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(format)}
                        onChange={() => toggleDocument(name)}
                        className="accent-[var(--primary)]"
                      />
                      <span className="truncate">{name}</span>
                    </label>
                    <select
                      aria-label={`${name} format`}
                      value={format ?? DEFAULT_DOCUMENT_FORMAT}
                      disabled={!format}
                      onChange={(e) => setDocumentFormat(name, e.target.value)}
                      className="w-28 shrink-0 rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-40"
                    >
                      {DOCUMENT_FORMATS.map((fmt) => (
                        <option key={fmt}>{fmt}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

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
