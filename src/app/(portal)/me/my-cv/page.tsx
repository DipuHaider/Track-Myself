"use client";

import { useEffect, useState } from "react";
import {
  Briefcase, CheckCircle2, Globe, GraduationCap,
  Save, ScrollText, User, Zap,
} from "lucide-react";
import { DEFAULT_CV } from "@/lib/cvDownload";
import type { CVData } from "@/lib/cvDownload";

const inputCls =
  "w-full rounded-lg border px-3 py-2 text-sm bg-transparent outline-none focus:ring-2 focus:ring-[var(--primary)] transition";
const textareaCls = `${inputCls} resize-none leading-relaxed`;

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
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

function Field({
  label,
  hint,
  children,
}: {
  label?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {label && <label className="mb-1 block text-xs font-medium">{label}</label>}
      {hint && <p className="text-muted mb-1.5 text-[11px] leading-relaxed">{hint}</p>}
      {children}
    </div>
  );
}

function SaveButton({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-60"
    >
      {saved ? (
        <><CheckCircle2 size={14} /> Saved!</>
      ) : saving ? (
        <><Save size={14} /> Saving…</>
      ) : (
        <><Save size={14} /> Save CV</>
      )}
    </button>
  );
}

export default function MyCVPage() {
  const [cv, setCv] = useState<CVData>(DEFAULT_CV);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/user/cv")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setCv({ ...DEFAULT_CV, ...data });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function set(field: keyof CVData, value: string) {
    setCv((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

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
        <p className="text-muted text-sm">Loading your CV…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <ScrollText size={20} style={{ color: "var(--primary)" }} />
            My CV
          </h1>
          <p className="text-muted mt-1 text-sm">
            Your master CV profile — used to generate tailored documents for each job application.
          </p>
        </div>
        <SaveButton saving={saving} saved={saved} onClick={handleSave} />
      </div>

      {/* Personal Information */}
      <Section icon={<User size={15} />} title="Personal Information">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name">
            <input
              className={inputCls}
              value={cv.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Alex Morgan"
            />
          </Field>
          <Field label="Professional Title">
            <input
              className={inputCls}
              value={cv.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Senior Software Engineer"
            />
          </Field>
          <Field label="Email">
            <input
              className={inputCls}
              type="email"
              value={cv.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="alex@example.com"
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputCls}
              value={cv.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+44 7700 900123"
            />
          </Field>
          <Field label="Location">
            <input
              className={inputCls}
              value={cv.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="London, United Kingdom"
            />
          </Field>
          <Field label="LinkedIn">
            <input
              className={inputCls}
              value={cv.linkedin}
              onChange={(e) => set("linkedin", e.target.value)}
              placeholder="linkedin.com/in/yourprofile"
            />
          </Field>
          <Field label="Website / Portfolio">
            <input
              className={inputCls}
              value={cv.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="yoursite.dev"
            />
          </Field>
          <Field label="Photo URL" hint="Direct link to a headshot — used in Europass and Designer templates.">
            <input
              className={inputCls}
              value={cv.photo ?? ""}
              onChange={(e) => set("photo", e.target.value)}
              placeholder="https://example.com/photo.jpg"
            />
          </Field>
        </div>
      </Section>

      {/* Professional Summary */}
      <Section icon={<Zap size={15} />} title="Professional Summary">
        <Field hint="2–4 sentences summarising your career, strengths, and goals.">
          <textarea
            className={textareaCls}
            rows={5}
            value={cv.summary}
            onChange={(e) => set("summary", e.target.value)}
            placeholder="Results-driven engineer with 7+ years building scalable web applications and leading cross-functional teams…"
          />
        </Field>
      </Section>

      {/* Work Experience */}
      <Section icon={<Briefcase size={15} />} title="Work Experience">
        <Field hint="Enter each role as a block. Start bullet points with • for best formatting in exported documents. Leave a blank line between roles.">
          <textarea
            className={textareaCls}
            rows={10}
            value={cv.experience}
            onChange={(e) => set("experience", e.target.value)}
            placeholder={`Senior Engineer · TechCorp · 2021 – Present\n• Led development of a platform serving 50k daily users\n• Reduced API latency by 40% via Redis caching\n\nSoftware Engineer · StartupHub · 2018 – 2021\n• Built React/Node.js SaaS used by 200+ companies`}
          />
        </Field>
      </Section>

      {/* Education */}
      <Section icon={<GraduationCap size={15} />} title="Education">
        <Field hint="Degree, institution, years — one qualification per block, blank line between them.">
          <textarea
            className={textareaCls}
            rows={5}
            value={cv.education}
            onChange={(e) => set("education", e.target.value)}
            placeholder={`MSc Computer Science · University of London · 2014 – 2016\n\nBSc Software Engineering · Manchester Metropolitan · 2011 – 2014`}
          />
        </Field>
      </Section>

      {/* Skills */}
      <Section icon={<Zap size={15} />} title="Skills">
        <Field hint="Comma-separated list of your key technologies and skills.">
          <textarea
            className={textareaCls}
            rows={3}
            value={cv.skills}
            onChange={(e) => set("skills", e.target.value)}
            placeholder="TypeScript, React, Node.js, PostgreSQL, Docker, AWS, CI/CD, GraphQL"
          />
        </Field>
      </Section>

      {/* Languages */}
      <Section icon={<Globe size={15} />} title="Languages">
        <Field hint="Languages and proficiency levels, comma-separated.">
          <input
            className={inputCls}
            value={cv.languages}
            onChange={(e) => set("languages", e.target.value)}
            placeholder="English (Native), Spanish (B2), French (A2)"
          />
        </Field>
      </Section>

      {/* Footer save */}
      <div className="flex justify-end">
        <SaveButton saving={saving} saved={saved} onClick={handleSave} />
      </div>
    </div>
  );
}
