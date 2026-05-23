"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Briefcase, CheckCircle2, Download, ExternalLink, FileText,
  Globe, GraduationCap, Loader2, Save, ScrollText, Star,
  Trash2, Upload, User, Zap,
} from "lucide-react";
import Link from "next/link";
import { DEFAULT_CV } from "@/lib/cvDownload";
import type { CVData } from "@/lib/cvDownload";

// ── types ──────────────────────────────────────────────────────────────────

type UploadedFile = {
  _id: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt?: string;
};

type Tab = "documents" | "form" | "builder";

// ── helpers ────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border px-3 py-2 text-sm bg-transparent outline-none focus:ring-2 focus:ring-[var(--primary)] transition";
const textareaCls = `${inputCls} resize-none leading-relaxed`;

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExt(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "application/msword") return "DOC";
  return "DOCX";
}

async function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function openFileBlob(data: string, mimeType: string, name: string, download = false) {
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: mimeType });
  const url = URL.createObjectURL(blob);
  if (download) {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  } else {
    window.open(url, "_blank");
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

// ── sub-components ─────────────────────────────────────────────────────────

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="surface overflow-hidden rounded-xl border">
      <div className="surface-muted flex items-center gap-2.5 border-b px-5 py-3.5">
        <span style={{ color: "var(--primary)" }}>{icon}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <label className="mb-1 block text-xs font-medium">{label}</label>}
      {hint && <p className="text-muted mb-1.5 text-[11px] leading-relaxed">{hint}</p>}
      {children}
    </div>
  );
}

function SaveBtn({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-60"
    >
      {saved ? <><CheckCircle2 size={14} /> Saved!</> : saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save CV</>}
    </button>
  );
}

// ── Documents tab ──────────────────────────────────────────────────────────

function DocumentsTab({ mainFileId, onMainChange }: { mainFileId: string; onMainChange: (id: string) => void }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/user/cv/files")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setFiles(data); })
      .finally(() => setLoading(false));
  }, []);

  async function uploadFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      alert("File must be under 5 MB");
      return;
    }
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) {
      alert("Only PDF, DOC and DOCX files are accepted");
      return;
    }
    setUploading(true);
    try {
      const data = await readAsBase64(file);
      const res = await fetch("/api/user/cv/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, mimeType: file.type, data }),
      });
      const updated = await res.json();
      if (Array.isArray(updated)) setFiles(updated);
    } catch {
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleMarkMain(id: string) {
    setActionId(id);
    try {
      const res = await fetch(`/api/user/cv/files/${id}/main`, { method: "PATCH" });
      const { mainFileId: newMain } = await res.json();
      onMainChange(newMain);
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this file?")) return;
    setActionId(id);
    try {
      await fetch(`/api/user/cv/files/${id}`, { method: "DELETE" });
      setFiles((prev) => prev.filter((f) => f._id !== id));
      if (mainFileId === id) onMainChange("");
    } finally {
      setActionId(null);
    }
  }

  async function handleView(id: string, download = false) {
    setActionId(id);
    try {
      const res = await fetch(`/api/user/cv/files/${id}`);
      const { data, mimeType, name } = await res.json();
      openFileBlob(data, mimeType, name, download);
    } catch {
      alert("Could not load file.");
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) uploadFile(file);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 transition hover:bg-[var(--surface-2)]"
        style={{ borderColor: dragging ? "var(--primary)" : "var(--border)", background: dragging ? "var(--surface-2)" : undefined }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }}
        />
        {uploading ? (
          <><Loader2 size={24} className="animate-spin" style={{ color: "var(--primary)" }} /><p className="text-sm text-muted">Uploading…</p></>
        ) : (
          <>
            <Upload size={24} className="text-muted" />
            <p className="text-sm font-medium">Drop your CV here or <span style={{ color: "var(--primary)" }}>browse</span></p>
            <p className="text-muted text-xs">PDF, DOC, DOCX · max 5 MB</p>
          </>
        )}
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <p className="text-muted text-center text-sm py-4">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {files.map((file) => {
            const isMain = mainFileId === file._id;
            const busy = actionId === file._id;
            return (
              <div
                key={file._id}
                className="surface flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 transition"
                style={isMain ? { borderColor: "var(--primary)", boxShadow: "0 0 0 1px var(--primary)" } : {}}
              >
                <FileText size={18} style={{ color: isMain ? "var(--primary)" : undefined }} className={isMain ? "" : "text-muted"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-muted text-xs">{fileExt(file.mimeType)} · {fmtSize(file.size)}</p>
                </div>
                {isMain && (
                  <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: "var(--primary)", color: "#fff" }}>
                    <Star size={9} fill="currentColor" /> Main CV
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleView(file._id)}
                    disabled={busy}
                    title="View"
                    className="rounded-md p-1.5 text-muted transition hover:bg-[var(--surface-2)] hover:text-foreground disabled:opacity-40"
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleView(file._id, true)}
                    disabled={busy}
                    title="Download"
                    className="rounded-md p-1.5 text-muted transition hover:bg-[var(--surface-2)] hover:text-foreground disabled:opacity-40"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkMain(file._id)}
                    disabled={busy}
                    title={isMain ? "Unmark as Main CV" : "Mark as Main CV"}
                    className={`rounded-md p-1.5 transition disabled:opacity-40 ${isMain ? "text-amber-500 hover:text-muted" : "text-muted hover:text-amber-500"} hover:bg-[var(--surface-2)]`}
                  >
                    <Star size={14} fill={isMain ? "currentColor" : "none"} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(file._id)}
                    disabled={busy}
                    title="Delete"
                    className="rounded-md p-1.5 text-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {files.length > 0 && !mainFileId && (
        <p className="text-muted rounded-lg border border-dashed px-4 py-3 text-sm">
          ★ Mark one file as <strong>Main CV</strong> — it will be used when generating CV documents for your applications.
        </p>
      )}
    </div>
  );
}

// ── Form tab ───────────────────────────────────────────────────────────────

function FormTab({
  cv, saving, saved,
  onChange, onSave,
}: {
  cv: CVData;
  saving: boolean;
  saved: boolean;
  onChange: (field: keyof CVData, value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-muted text-sm">
          Used as fallback when no uploaded Main CV is set, or for generating tailored Resumes and Cover Letters.
        </p>
        <SaveBtn saving={saving} saved={saved} onClick={onSave} />
      </div>

      <Section icon={<User size={15} />} title="Personal Information">
        <div className="grid gap-4 sm:grid-cols-2">
          {([
            ["name",     "Full Name",             "Alex Morgan"],
            ["title",    "Professional Title",    "Senior Software Engineer"],
            ["email",    "Email",                 "alex@example.com"],
            ["phone",    "Phone",                 "+44 7700 900123"],
            ["location", "Location",              "London, United Kingdom"],
            ["linkedin", "LinkedIn",              "linkedin.com/in/yourprofile"],
            ["website",  "Website / Portfolio",   "yoursite.dev"],
          ] as [keyof CVData, string, string][]).map(([field, label, placeholder]) => (
            <Field key={field} label={label}>
              <input
                className={inputCls}
                value={cv[field] as string}
                onChange={(e) => onChange(field, e.target.value)}
                placeholder={placeholder}
              />
            </Field>
          ))}
          <Field label="Photo URL" hint="Direct link to a headshot (used in Europass / Designer templates)">
            <input
              className={inputCls}
              value={cv.photo ?? ""}
              onChange={(e) => onChange("photo", e.target.value)}
              placeholder="https://example.com/photo.jpg"
            />
          </Field>
        </div>
      </Section>

      <Section icon={<Zap size={15} />} title="Professional Summary">
        <textarea
          className={textareaCls}
          rows={5}
          value={cv.summary}
          onChange={(e) => onChange("summary", e.target.value)}
          placeholder="Results-driven engineer with 7+ years building scalable web applications…"
        />
      </Section>

      <Section icon={<Briefcase size={15} />} title="Work Experience">
        <p className="text-muted mb-2 text-[11px]">Each role as a block. Use • for bullets. Blank line between roles.</p>
        <textarea
          className={textareaCls}
          rows={10}
          value={cv.experience}
          onChange={(e) => onChange("experience", e.target.value)}
          placeholder={`Senior Engineer · TechCorp · 2021 – Present\n• Led platform serving 50k daily users\n\nSoftware Engineer · StartupHub · 2018 – 2021\n• Built SaaS used by 200+ companies`}
        />
      </Section>

      <Section icon={<GraduationCap size={15} />} title="Education">
        <textarea
          className={textareaCls}
          rows={5}
          value={cv.education}
          onChange={(e) => onChange("education", e.target.value)}
          placeholder={`MSc Computer Science · University of London · 2014 – 2016\n\nBSc Software Engineering · Manchester Metropolitan · 2011 – 2014`}
        />
      </Section>

      <Section icon={<Zap size={15} />} title="Skills">
        <textarea
          className={textareaCls}
          rows={3}
          value={cv.skills}
          onChange={(e) => onChange("skills", e.target.value)}
          placeholder="TypeScript, React, Node.js, PostgreSQL, Docker, AWS, CI/CD, GraphQL"
        />
      </Section>

      <Section icon={<Globe size={15} />} title="Languages">
        <input
          className={inputCls}
          value={cv.languages}
          onChange={(e) => onChange("languages", e.target.value)}
          placeholder="English (Native), Spanish (B2), French (A2)"
        />
      </Section>

      <div className="flex justify-end">
        <SaveBtn saving={saving} saved={saved} onClick={onSave} />
      </div>
    </div>
  );
}

// ── Template Builder tab ───────────────────────────────────────────────────

function BuilderTab() {
  return (
    <div className="space-y-4">
      <p className="text-muted text-sm">
        Choose from 9 professional templates (ATS, Europass, Designer), fill in your details, then download as a Word document.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "ATS Friendly",  desc: "Clean, machine-readable layouts optimised for Applicant Tracking Systems." },
          { label: "Europass",      desc: "EU standard format — widely recognised across European employers." },
          { label: "Designer",      desc: "Visually rich templates to stand out in creative and tech roles." },
        ].map(({ label, desc }) => (
          <div key={label} className="surface rounded-xl border p-4">
            <p className="mb-1 text-sm font-semibold">{label}</p>
            <p className="text-muted text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
      <Link
        href="/me/cv"
        className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
      >
        <ExternalLink size={14} />
        Open Template Builder
      </Link>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: "documents", label: "My Documents" },
  { key: "form",      label: "Build with Form" },
  { key: "builder",   label: "Template Builder" },
];

export default function MyCVPage() {
  const [activeTab, setActiveTab] = useState<Tab>("documents");
  const [cv, setCv] = useState<CVData>(DEFAULT_CV);
  const [mainFileId, setMainFileId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/user/cv")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setCv({ ...DEFAULT_CV, ...data });
          setMainFileId(data.mainFileId ?? "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = useCallback((field: keyof CVData, value: string) => {
    setCv((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/user/cv", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cv),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={22} className="animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5 pb-12">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <ScrollText size={20} style={{ color: "var(--primary)" }} />
          My CV
        </h1>
        <p className="text-muted mt-1 text-sm">
          Upload a file to use as your main CV, or build one from scratch — then generate tailored documents for every application.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 rounded-lg border p-1" style={{ background: "var(--surface-2)" }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              activeTab === key ? "surface shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "documents" && (
        <DocumentsTab mainFileId={mainFileId} onMainChange={setMainFileId} />
      )}
      {activeTab === "form" && (
        <FormTab cv={cv} saving={saving} saved={saved} onChange={handleChange} onSave={handleSave} />
      )}
      {activeTab === "builder" && <BuilderTab />}
    </div>
  );
}
