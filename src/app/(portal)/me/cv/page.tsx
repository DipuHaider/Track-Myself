"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Check, Download, FileText, Loader2, Lock, Save,
  Sparkles, Star, X,
} from "lucide-react";
import {
  AddButton, Field, RepeatCard, Section, StringListEditor,
  inputCls, inputStyle, moveItem,
} from "@/components/cv/fields";
import { downloadCVDocx, useCVProfile } from "@/hooks/useCVProfile";
import ImportPanel from "@/components/cv/ImportPanel";
import { canExportPdf, canUseCVFormat, canUseLebenslauf, isPremiumUser } from "@/lib/permissions";
import type {
  CVContent, CVEducation, CVExperience, CVFormat,
  CVLanguage, CVProject, CVSkillGroup, CVVariant,
} from "@/types/cv";

type FormatCard = {
  key: CVFormat;
  variant: CVVariant;
  name: string;
  tag: string;
  description: string;
  accent: string;
  superadminOnly?: boolean;
};

const FORMATS: FormatCard[] = [
  {
    key: "ats", variant: "full", name: "ATS Friendly", tag: "Parser-optimised · 3 pages",
    description: "Single column, no tables or text boxes, real bullet characters — built to survive automated parsing. Send this by default.",
    accent: "#1a56db",
  },
  {
    key: "ats", variant: "compact", name: "ATS Compact", tag: "Parser-optimised · 2 pages",
    description: "Same content, front-loaded. Short summary, grouped skills, recent roles detailed and older ones compressed. Best for screening.",
    accent: "#0e7490",
  },
  {
    key: "europass", variant: "full", name: "Europass", tag: "EU Standard",
    description: "Official EU structure with the CEFR self-assessment grid. For public sector, universities, EURES and visa files.",
    accent: "#003399",
  },
  {
    key: "designer", variant: "full", name: "Designer", tag: "Stand out",
    description: "Dark header band, indigo accents and a sidebar for skills and languages. For creative and modern tech roles.",
    accent: "#4F46E5",
  },
  {
    key: "lebenslauf", variant: "full", name: "Lebenslauf", tag: "German convention",
    description: "Tabular German CV with photo, personal details and a signature line. Never send it alongside the ATS CV.",
    accent: "#2C3547", superadminOnly: true,
  },
];

function PremiumBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ background: "#f59e0b22", color: "#d97706" }}
    >
      <Star size={9} fill="currentColor" aria-hidden="true" /> Premium
    </span>
  );
}

export default function CVBuilderPage() {
  const { data: session } = useSession();
  const sessionUser = session?.user as { role?: string; plan?: string; email?: string } | undefined;
  const isPremium = isPremiumUser(sessionUser?.role, sessionUser?.plan);
  const showLebenslauf = canUseLebenslauf(sessionUser?.role, sessionUser?.email);
  const canPdf = canExportPdf(sessionUser?.role, sessionUser?.plan);

  const { profile, setContent, save, loading, saving, saved, error } = useCVProfile();
  const c = profile.content;

  const [busyFormat, setBusyFormat] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");

  const [showAdapt, setShowAdapt] = useState(false);
  const [jobDesc, setJobDesc] = useState("");
  const [adapting, setAdapting] = useState(false);
  const [adaptMsg, setAdaptMsg] = useState("");
  const [adaptErr, setAdaptErr] = useState("");

  function patch(update: Partial<CVContent>) {
    setContent((prev) => ({ ...prev, ...update }));
  }

  function patchContact(key: keyof CVContent["contact"], value: string) {
    setContent((prev) => ({ ...prev, contact: { ...prev.contact, [key]: value } }));
  }

  function patchPersonal(key: keyof CVContent["personal"], value: string) {
    setContent((prev) => ({ ...prev, personal: { ...prev.personal, [key]: value } }));
  }

  async function handleDownload(card: FormatCard, output: "docx" | "pdf") {
    const key = `${card.key}-${card.variant}-${output}`;
    setBusyFormat(key);
    setDownloadError("");
    try {
      await save();
      await downloadCVDocx({ format: card.key, variant: card.variant, output });
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "Could not generate that document.");
    } finally {
      setBusyFormat(null);
    }
  }

  async function handleAdapt() {
    if (!isPremium || !jobDesc.trim() || adapting) return;
    setAdapting(true);
    setAdaptErr("");
    setAdaptMsg("");
    try {
      const res = await fetch("/api/cv/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: c, jobDescription: jobDesc }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Request failed");

      const next: CVContent = {
        ...c,
        positioning: body.positioning || c.positioning,
        summary: body.summary || c.summary,
        summaryShort: body.summaryShort || c.summaryShort,
        skills: Array.isArray(body.skills) && body.skills.length ? body.skills : c.skills,
      };
      setContent(() => next);
      await save({ content: next });
      setShowAdapt(false);
      setJobDesc("");
      setAdaptMsg("Summary, positioning and skill order tailored to that job, and saved.");
      setTimeout(() => setAdaptMsg(""), 5000);
    } catch (e) {
      setAdaptErr(e instanceof Error ? e.message : "Failed. Try again.");
    } finally {
      setAdapting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={22} className="text-muted animate-spin" />
      </div>
    );
  }

  const cards = FORMATS.filter(
    (f) =>
      (!f.superadminOnly || showLebenslauf) &&
      canUseCVFormat(sessionUser?.role, sessionUser?.plan, f.key, f.variant),
  );
  const lockedFormats = FORMATS.filter(
    (f) =>
      (!f.superadminOnly || showLebenslauf) &&
      !canUseCVFormat(sessionUser?.role, sessionUser?.plan, f.key, f.variant),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "var(--primary)22", color: "var(--primary)" }}
          >
            <FileText size={20} aria-hidden="true" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              CV Builder
              {isPremium && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: "#10b98122", color: "#047857" }}
                >
                  <Star size={9} fill="currentColor" aria-hidden="true" /> Premium
                </span>
              )}
            </h1>
            <p className="text-muted text-sm">
              One set of details, every format in real Word — they cannot disagree with each other.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => save()}
          disabled={saving}
          className="btn-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {saved
            ? <><Check size={14} aria-hidden="true" /> Saved</>
            : saving
              ? <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Saving…</>
              : <><Save size={14} aria-hidden="true" /> Save CV</>}
        </button>
      </div>

      {!isPremium && (
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border px-5 py-4"
          style={{ borderColor: "#f59e0b44", background: "#fffbeb" }}
        >
          <div className="flex items-center gap-3">
            <Star size={18} style={{ color: "#d97706" }} fill="#d97706" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#92400e" }}>
                Upgrade to Premium for AI-powered CV tailoring
              </p>
              <p className="text-xs" style={{ color: "#b45309" }}>
                Every format and every Word download is free.
              </p>
            </div>
          </div>
          <Link href="/me" className="btn-primary shrink-0 rounded-lg px-4 py-2 text-xs font-semibold">
            Upgrade
          </Link>
        </div>
      )}

      {(error || downloadError) && <p className="text-sm text-red-600">{error || downloadError}</p>}
      {adaptMsg && <p className="text-sm font-medium" style={{ color: "#047857" }}>{adaptMsg}</p>}

      {/* Formats */}
      {lockedFormats.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border p-4 text-sm"
          style={{ borderColor: "#f59e0b44", background: "#f59e0b0d" }}
        >
          <Lock size={14} aria-hidden="true" style={{ color: "#b45309" }} />
          <span className="font-medium" style={{ color: "#92400e" }}>
            {lockedFormats.map((f) => f.name).join(" and ")}{" "}
            {lockedFormats.length === 1 ? "is" : "are"} on Premium.
          </span>
          <span className="text-muted">
            Your plan includes {cards.map((f) => f.name).join(" and ")} — enough to apply anywhere.
          </span>
        </div>
      )}

      <ImportPanel
        files={profile.uploadedFiles}
        isPremium={isPremium}
        onImported={(imported, from) => {
          /* fill gaps only — never overwrite what is already typed */
          setContent((prev) => ({
            ...prev,
            name: prev.name || imported.name,
            positioning: prev.positioning || imported.positioning,
            summary: prev.summary || imported.summary,
            contact: {
              ...prev.contact,
              email: prev.contact.email || imported.contact.email,
              phone: prev.contact.phone || imported.contact.phone,
              city: prev.contact.city || imported.contact.city,
              linkedin: prev.contact.linkedin || imported.contact.linkedin,
              github: prev.contact.github || imported.contact.github,
              portfolio: prev.contact.portfolio || imported.contact.portfolio,
            },
            experience: prev.experience.length ? prev.experience : imported.experience,
            education: prev.education.length ? prev.education : imported.education,
            skills: prev.skills.length ? prev.skills : imported.skills,
            languages: prev.languages.length ? prev.languages : imported.languages,
            certifications: prev.certifications.length ? prev.certifications : imported.certifications,
            awards: prev.awards.length ? prev.awards : imported.awards,
          }));
          setDownloadError("");
          void from;
        }}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const key = `${card.key}-${card.variant}`;
          const busyDocx = busyFormat === `${key}-docx`;
          const busyPdf = busyFormat === `${key}-pdf`;
          return (
            <div
              key={key}
              className="surface flex flex-col gap-2 rounded-xl border p-4"
              style={{ borderTop: `3px solid ${card.accent}` }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{card.name}</p>
                {card.superadminOnly && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                    style={{ background: "var(--surface-2)", color: "var(--muted-foreground)" }}
                  >
                    SUPERADMIN
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium" style={{ color: card.accent }}>{card.tag}</p>
              <p className="text-muted flex-1 text-[11px] leading-relaxed">{card.description}</p>
              <div className="mt-1 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleDownload(card, "docx")}
                  disabled={busyDocx || busyPdf}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition hover:bg-[var(--surface-2)] disabled:opacity-60"
                  style={{ borderColor: card.accent, color: card.accent }}
                >
                  {busyDocx
                    ? <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                    : <><Download size={12} aria-hidden="true" /> .docx</>}
                </button>

                <button
                  type="button"
                  onClick={() => (canPdf ? handleDownload(card, "pdf") : undefined)}
                  disabled={!canPdf || busyDocx || busyPdf}
                  title={canPdf ? "Download as PDF" : "PDF export is a Premium feature"}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-45"
                  style={{ borderColor: card.accent, color: card.accent }}
                >
                  {busyPdf
                    ? <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                    : canPdf
                      ? <><Download size={12} aria-hidden="true" /> .pdf</>
                      : <><Lock size={11} aria-hidden="true" /> .pdf</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI tailor */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-xs">
          Your CV saves first, then generates — what you download always matches what you see here.
        </p>
        <button
          type="button"
          onClick={() => (isPremium ? setShowAdapt(true) : undefined)}
          disabled={!isPremium}
          title={isPremium ? "Adapt this CV to a job description" : "Upgrade to Premium to use AI tailoring"}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition"
          style={isPremium
            ? { borderColor: "#f59e0b", color: "#d97706", background: "#fffbeb" }
            : { opacity: 0.5, cursor: "not-allowed", borderColor: "var(--border)" }}
        >
          {isPremium ? <Sparkles size={14} aria-hidden="true" /> : <Lock size={14} aria-hidden="true" />}
          AI Tailor
          {!isPremium && <PremiumBadge />}
        </button>
      </div>

      {/* Editor */}
      <div className="surface space-y-8 rounded-2xl border p-6">
        <Section title="Identity">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" value={c.name} onChange={(v) => patch({ name: v })} placeholder="Md Fuad Haider Dipu" />
            <Field label="Positioning" value={c.positioning} onChange={(v) => patch({ positioning: v })} placeholder="AI-First Full-Stack Developer" />
            <Field label="Grade / internal title" value={c.gradeTitle} onChange={(v) => patch({ gradeTitle: v })} placeholder="Senior Software Engineer" />
            <Field label="Signature city" value={c.signatureCity} onChange={(v) => patch({ signatureCity: v })} placeholder="Dhaka" hint="Used on the Lebenslauf signature line." />
          </div>
        </Section>

        <Section title="Contact">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="City" value={c.contact.city} onChange={(v) => patchContact("city", v)} placeholder="Dhaka, Bangladesh" />
            <Field label="Full address" value={c.contact.addressFull} onChange={(v) => patchContact("addressFull", v)} placeholder="Dhaka Cantonment, Dhaka, Bangladesh" />
            <Field label="Phone" value={c.contact.phone} onChange={(v) => patchContact("phone", v)} placeholder="+880 171 7768146" />
            <Field label="Email" value={c.contact.email} onChange={(v) => patchContact("email", v)} placeholder="you@example.com" />
            <Field label="LinkedIn" value={c.contact.linkedin} onChange={(v) => patchContact("linkedin", v)} placeholder="linkedin.com/in/you" />
            <Field label="GitHub" value={c.contact.github} onChange={(v) => patchContact("github", v)} placeholder="github.com/you" />
            <Field label="Portfolio" value={c.contact.portfolio} onChange={(v) => patchContact("portfolio", v)} placeholder="you.dev" />
            <Field label="Hugging Face" value={c.contact.huggingface} onChange={(v) => patchContact("huggingface", v)} placeholder="huggingface.co/you" />
          </div>
        </Section>

        <Section title="Personal details" hint="Europass and Lebenslauf only — never printed on the ATS CV.">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Date of birth" value={c.personal.dob} onChange={(v) => patchPersonal("dob", v)} placeholder="03/01/1988" />
            <Field label="Date of birth (long)" value={c.personal.dobLong} onChange={(v) => patchPersonal("dobLong", v)} placeholder="3 January 1988" />
            <Field label="Nationality" value={c.personal.nationality} onChange={(v) => patchPersonal("nationality", v)} placeholder="Bangladeshi" />
          </div>
          <p className="text-muted text-[11px]">
            The profile picture starred in{" "}
            <Link href="/me/my-cv" className="underline" style={{ color: "var(--primary)" }}>My Documents</Link>{" "}
            is embedded automatically in the Lebenslauf and Designer formats.
          </p>
        </Section>

        <Section title="Summary">
          <Field
            label="Full summary" type="textarea" rows={4}
            value={c.summary} onChange={(v) => patch({ summary: v })}
            placeholder="Senior software engineer with 14 years shipping production systems…"
          />
          <Field
            label="Short summary" type="textarea" rows={2}
            value={c.summaryShort} onChange={(v) => patch({ summaryShort: v })}
            hint="Used by the 2-page ATS variant. Two sentences is right."
            placeholder="Senior software engineer, 14 years, 50+ production systems shipped since 2012."
          />
          <Field
            label="Availability" type="textarea" rows={2}
            value={c.availability} onChange={(v) => patch({ availability: v })}
            placeholder="Available now for remote roles with German and EU teams."
          />
        </Section>

        <Section
          title="Skills"
          hint="One group per line of the CV — a label plus a comma-separated list."
          action={<AddButton label="Add group" onClick={() => patch({ skills: [...c.skills, { label: "", items: "" }] })} />}
        >
          {c.skills.length === 0 && <p className="text-muted text-xs">No skill groups yet.</p>}
          {c.skills.map((group: CVSkillGroup, i) => (
            <RepeatCard
              key={i} index={i} total={c.skills.length} title={group.label || `Group ${i + 1}`}
              onMove={(from, to) => patch({ skills: moveItem(c.skills, from, to) })}
              onRemove={(idx) => patch({ skills: c.skills.filter((_, x) => x !== idx) })}
            >
              <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                <Field label="Label" value={group.label} placeholder="Languages"
                  onChange={(v) => patch({ skills: c.skills.map((g, x) => (x === i ? { ...g, label: v } : g)) })} />
                <Field label="Items" value={group.items} placeholder="TypeScript, JavaScript, PHP, Python, SQL"
                  onChange={(v) => patch({ skills: c.skills.map((g, x) => (x === i ? { ...g, items: v } : g)) })} />
              </div>
            </RepeatCard>
          ))}
        </Section>

        <Section
          title="Compact skills"
          hint="Optional. Fewer, wider groups for the 2-page ATS variant. Leave empty to reuse the full list."
          action={<AddButton label="Add group" onClick={() => patch({ skillsCompact: [...c.skillsCompact, { label: "", items: "" }] })} />}
        >
          {c.skillsCompact.map((group: CVSkillGroup, i) => (
            <RepeatCard
              key={i} index={i} total={c.skillsCompact.length} title={group.label || `Group ${i + 1}`}
              onMove={(from, to) => patch({ skillsCompact: moveItem(c.skillsCompact, from, to) })}
              onRemove={(idx) => patch({ skillsCompact: c.skillsCompact.filter((_, x) => x !== idx) })}
            >
              <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                <Field label="Label" value={group.label} placeholder="Languages & AI"
                  onChange={(v) => patch({ skillsCompact: c.skillsCompact.map((g, x) => (x === i ? { ...g, label: v } : g)) })} />
                <Field label="Items" value={group.items} placeholder="TypeScript, Python · LLM integration, RAG"
                  onChange={(v) => patch({ skillsCompact: c.skillsCompact.map((g, x) => (x === i ? { ...g, items: v } : g)) })} />
              </div>
            </RepeatCard>
          ))}
        </Section>

        <Section
          title="Experience"
          hint="Most recent first. The compact and Lebenslauf formats trim older roles automatically."
          action={<AddButton label="Add role" onClick={() => patch({
            experience: [...c.experience, { company: "", location: "", title: "", grade: "", dates: "", bullets: [] }],
          })} />}
        >
          {c.experience.length === 0 && <p className="text-muted text-xs">No roles yet.</p>}
          {c.experience.map((job: CVExperience, i) => (
            <RepeatCard
              key={i} index={i} total={c.experience.length}
              title={job.title || job.company || `Role ${i + 1}`}
              onMove={(from, to) => patch({ experience: moveItem(c.experience, from, to) })}
              onRemove={(idx) => patch({ experience: c.experience.filter((_, x) => x !== idx) })}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Job title" value={job.title} placeholder="Senior Software Engineer"
                  onChange={(v) => patch({ experience: c.experience.map((j, x) => (x === i ? { ...j, title: v } : j)) })} />
                <Field label="Company" value={job.company} placeholder="Bashundhara Group"
                  onChange={(v) => patch({ experience: c.experience.map((j, x) => (x === i ? { ...j, company: v } : j)) })} />
                <Field label="Location" value={job.location} placeholder="Dhaka, Bangladesh"
                  onChange={(v) => patch({ experience: c.experience.map((j, x) => (x === i ? { ...j, location: v } : j)) })} />
                <Field label="Dates" value={job.dates} placeholder="Apr 2025 – Present"
                  onChange={(v) => patch({ experience: c.experience.map((j, x) => (x === i ? { ...j, dates: v } : j)) })} />
                <Field label="Grade (optional)" value={job.grade} placeholder="Internal grade: Assistant Manager"
                  onChange={(v) => patch({ experience: c.experience.map((j, x) => (x === i ? { ...j, grade: v } : j)) })} />
              </div>
              <div>
                <p className="text-muted mb-1.5 text-xs font-medium">Bullets</p>
                <StringListEditor
                  items={job.bullets}
                  placeholder="Built a distributable WordPress plugin on a provider-agnostic LLM layer…"
                  addLabel="Add bullet"
                  onChange={(bullets) => patch({ experience: c.experience.map((j, x) => (x === i ? { ...j, bullets } : j)) })}
                />
              </div>
            </RepeatCard>
          ))}
        </Section>

        <Section
          title="Projects"
          hint="Printed on the 3-page ATS, Europass and Designer formats."
          action={<AddButton label="Add project" onClick={() => patch({
            projects: [...c.projects, { name: "", stack: "", text: "" }],
          })} />}
        >
          {c.projects.map((project: CVProject, i) => (
            <RepeatCard
              key={i} index={i} total={c.projects.length} title={project.name || `Project ${i + 1}`}
              onMove={(from, to) => patch({ projects: moveItem(c.projects, from, to) })}
              onRemove={(idx) => patch({ projects: c.projects.filter((_, x) => x !== idx) })}
            >
              <Field label="Name" value={project.name} placeholder="MCP GitHub Issue Tracker"
                onChange={(v) => patch({ projects: c.projects.map((pr, x) => (x === i ? { ...pr, name: v } : pr)) })} />
              <Field label="Stack" value={project.stack} placeholder="TypeScript, Node.js, MCP SDK, Docker"
                onChange={(v) => patch({ projects: c.projects.map((pr, x) => (x === i ? { ...pr, stack: v } : pr)) })} />
              <Field label="Description" type="textarea" rows={3} value={project.text}
                placeholder="Model Context Protocol server exposing GitHub issue data to AI agents…"
                onChange={(v) => patch({ projects: c.projects.map((pr, x) => (x === i ? { ...pr, text: v } : pr)) })} />
            </RepeatCard>
          ))}
        </Section>

        <Section
          title="Education"
          action={<AddButton label="Add entry" onClick={() => patch({
            education: [...c.education, { degree: "", school: "", dates: "", note: "" }],
          })} />}
        >
          {c.education.map((e: CVEducation, i) => (
            <RepeatCard
              key={i} index={i} total={c.education.length} title={e.degree || `Entry ${i + 1}`}
              onMove={(from, to) => patch({ education: moveItem(c.education, from, to) })}
              onRemove={(idx) => patch({ education: c.education.filter((_, x) => x !== idx) })}
            >
              <Field label="Degree" value={e.degree} placeholder="B.Sc., Computer Science and Engineering"
                onChange={(v) => patch({ education: c.education.map((ed, x) => (x === i ? { ...ed, degree: v } : ed)) })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Institution" value={e.school} placeholder="American International University-Bangladesh"
                  onChange={(v) => patch({ education: c.education.map((ed, x) => (x === i ? { ...ed, school: v } : ed)) })} />
                <Field label="Dates" value={e.dates} placeholder="2008 – 2012"
                  onChange={(v) => patch({ education: c.education.map((ed, x) => (x === i ? { ...ed, dates: v } : ed)) })} />
              </div>
              <Field label="Note (optional)" value={e.note} placeholder="Recognised in anabin"
                onChange={(v) => patch({ education: c.education.map((ed, x) => (x === i ? { ...ed, note: v } : ed)) })} />
            </RepeatCard>
          ))}
        </Section>

        <Section title="Certifications">
          <StringListEditor
            items={c.certifications}
            placeholder="IELTS — Overall Band 6.5 — IDP Education (2025)"
            addLabel="Add certification"
            onChange={(certifications) => patch({ certifications })}
          />
        </Section>

        <Section title="Awards">
          <StringListEditor
            items={c.awards}
            placeholder="Champion — ideaTHON, iDEA Project, Bangladesh Computer Council"
            addLabel="Add award"
            onChange={(awards) => patch({ awards })}
          />
        </Section>

        <Section
          title="Languages"
          hint="CEFR columns are read literally on Europass. Leave them blank to reuse the level text."
          action={<AddButton label="Add language" onClick={() => patch({
            languages: [...c.languages, {
              name: "", level: "", mother: false,
              cefr: { listening: "", reading: "", spokenInteraction: "", spokenProduction: "", writing: "" },
            }],
          })} />}
        >
          {c.languages.map((lang: CVLanguage, i) => (
            <RepeatCard
              key={i} index={i} total={c.languages.length} title={lang.name || `Language ${i + 1}`}
              onMove={(from, to) => patch({ languages: moveItem(c.languages, from, to) })}
              onRemove={(idx) => patch({ languages: c.languages.filter((_, x) => x !== idx) })}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Language" value={lang.name} placeholder="English"
                  onChange={(v) => patch({ languages: c.languages.map((l, x) => (x === i ? { ...l, name: v } : l)) })} />
                <Field label="Level" value={lang.level} placeholder="Professional working proficiency — IELTS 6.5 (CEFR B2)"
                  onChange={(v) => patch({ languages: c.languages.map((l, x) => (x === i ? { ...l, level: v } : l)) })} />
              </div>

              <label className="text-muted flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={lang.mother}
                  onChange={(e) => patch({
                    languages: c.languages.map((l, x) => (x === i ? { ...l, mother: e.target.checked } : l)),
                  })}
                />
                Mother tongue — listed above the CEFR grid on Europass
              </label>

              {!lang.mother && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {([
                    ["listening", "Listening"],
                    ["reading", "Reading"],
                    ["spokenInteraction", "Spoken int."],
                    ["spokenProduction", "Spoken prod."],
                    ["writing", "Writing"],
                  ] as [keyof CVLanguage["cefr"], string][]).map(([key, label]) => (
                    <div key={key}>
                      <label className="text-muted mb-1 block text-[11px] font-medium">{label}</label>
                      <input
                        type="text"
                        className={inputCls}
                        style={inputStyle}
                        value={lang.cefr[key]}
                        placeholder="B2"
                        onChange={(e) => patch({
                          languages: c.languages.map((l, x) =>
                            x === i ? { ...l, cefr: { ...l.cefr, [key]: e.target.value } } : l),
                        })}
                      />
                    </div>
                  ))}
                </div>
              )}
            </RepeatCard>
          ))}
        </Section>

        <div className="flex justify-end border-t pt-6" style={{ borderColor: "var(--border)" }}>
          <button
            type="button"
            onClick={() => save()}
            disabled={saving}
            className="btn-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {saved
              ? <><Check size={14} aria-hidden="true" /> Saved</>
              : saving
                ? <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Saving…</>
                : <><Save size={14} aria-hidden="true" /> Save CV</>}
          </button>
        </div>
      </div>

      {/* AI adapt modal */}
      {showAdapt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="surface max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} style={{ color: "#d97706" }} aria-hidden="true" />
                <h3 className="font-semibold">AI CV Tailor</h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowAdapt(false); setJobDesc(""); setAdaptErr(""); }}
                className="text-muted transition hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-muted mb-4 text-sm">
              Paste the job description. AI rewrites your summary, sharpens your positioning line, and reorders
              your skill groups so the closest match comes first. Your roles and bullets are never rewritten.
            </p>

            <textarea
              className={`${inputCls} leading-relaxed`}
              rows={10}
              style={{ ...inputStyle, maxHeight: "40dvh" }}
              placeholder="Paste the full job description here…"
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
            />

            {adaptErr && <p className="mt-2 text-xs text-red-500">{adaptErr}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowAdapt(false); setJobDesc(""); }}
                className="rounded-lg border px-4 py-2 text-sm transition hover:bg-[var(--surface-2)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdapt}
                disabled={adapting || !jobDesc.trim()}
                className="btn-primary flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {adapting
                  ? <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Adapting…</>
                  : <><Sparkles size={14} aria-hidden="true" /> Tailor my CV</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
