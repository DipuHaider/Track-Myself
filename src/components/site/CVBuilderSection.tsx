"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Download, FileText, Loader2 } from "lucide-react";
import type { CVFormat, CVVariant } from "@/types/cv";

// ── template definitions ────────────────────────────────────────────────────

type SampleCV = {
  name: string; title: string; email: string; phone: string;
  location: string; linkedin: string; website: string;
  summary: string; experience: string; education: string;
  skills: string; languages: string;
};

const EMPTY_CV: SampleCV = {
  name: "", title: "", email: "", phone: "",
  location: "", linkedin: "", website: "",
  summary: "", experience: "", education: "",
  skills: "", languages: "",
};

function ATSMockup({ accent, leftBar }: { accent: string; leftBar?: boolean }) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded bg-white p-2">
      <div className="mb-1.5 border-b border-gray-200 pb-1.5">
        <div className="mb-0.5 h-2.5 w-2/3 rounded" style={{ background: "#222" }} />
        <div className="h-1.5 w-1/2 rounded bg-gray-300" />
        <div className="mt-0.5 h-1 w-full rounded bg-gray-200" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="mb-1.5">
          <div
            className="mb-0.5 h-1.5 w-1/3 rounded"
            style={leftBar
              ? { borderLeft: `3px solid ${accent}`, paddingLeft: 3, background: "transparent", boxShadow: `inset 3px 0 0 ${accent}` }
              : { background: accent, opacity: 0.85 }
            }
          />
          <div className="h-1 w-full rounded bg-gray-200" />
          <div className="mt-0.5 h-1 w-5/6 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

function EuropassMockup({ color }: { color: string }) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded bg-white">
      <div className="px-2 py-1.5" style={{ background: color }}>
        <div className="mb-0.5 h-2.5 w-2/3 rounded bg-white" />
        <div className="h-1 w-1/2 rounded" style={{ background: "rgba(255,255,255,0.5)" }} />
      </div>
      <div className="px-2 py-0.5" style={{ background: color + "28" }}>
        <div className="h-1 w-full rounded bg-gray-300" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className="mb-0.5 h-1.5 w-1/3 rounded" style={{ background: color }} />
            <div className="h-1 w-full rounded bg-gray-200" />
            <div className="mt-0.5 h-1 w-4/5 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DesignerSidebarMockup({ sidebar, accent }: { sidebar: string; accent: string }) {
  return (
    <div className="flex h-full w-full overflow-hidden rounded">
      <div className="flex w-[35%] flex-col gap-1 p-1.5" style={{ background: sidebar }}>
        <div className="h-2 w-4/5 rounded" style={{ background: accent }} />
        <div className="h-1 w-3/4 rounded bg-white/30" />
        <div className="mt-1 h-px bg-white/20" />
        <div className="h-1 w-full rounded bg-white/20" />
        <div className="h-1 w-3/4 rounded bg-white/20" />
        <div className="h-1 w-full rounded bg-white/20" />
        <div className="mt-1 h-1 w-full rounded bg-white/20" />
        <div className="h-1 w-4/5 rounded bg-white/20" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-1.5" style={{ background: "#fff" }}>
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className="mb-0.5 h-1.5 w-1/3 rounded" style={{ background: accent }} />
            <div className="h-1 w-full rounded bg-gray-200" />
            <div className="mt-0.5 h-1 w-5/6 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DesignerBoldMockup({ sidebar, accent }: { sidebar: string; accent: string }) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded bg-white">
      <div className="px-2 py-2" style={{ background: sidebar }}>
        <div className="mb-0.5 h-2.5 w-2/3 rounded bg-white" />
        <div className="mb-1 h-1.5 w-1/2 rounded" style={{ background: accent }} />
        <div className="h-1 w-full rounded" style={{ background: "rgba(255,255,255,0.2)" }} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className="mb-0.5 h-1.5 w-1/3 rounded" style={{ background: accent }} />
            <div className="h-1 w-full rounded bg-gray-200" />
            <div className="mt-0.5 h-1 w-4/5 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DesignerMinimalMockup({ accent }: { accent: string }) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded bg-white p-2">
      <div className="mb-1.5 border-l-[3px] pl-1.5" style={{ borderColor: accent }}>
        <div className="mb-0.5 h-2.5 w-2/3 rounded bg-gray-800" />
        <div className="h-1.5 w-1/2 rounded" style={{ background: accent + "99" }} />
        <div className="mt-0.5 h-1 w-full rounded bg-gray-200" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="mb-1.5">
          <div className="mb-0.5 h-1.5 w-1/3 rounded" style={{ background: accent }} />
          <div className="h-1 w-full rounded bg-gray-200" />
          <div className="mt-0.5 h-1 w-5/6 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

// ── editor helpers ──────────────────────────────────────────────────────────

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "input" | "textarea";
  rows?: number;
};

function Field({ label, value, onChange, placeholder, type = "input", rows = 4 }: FieldProps) {
  const shared = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    placeholder,
    className:
      "w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]",
    style: {
      background: "var(--surface-2)",
      borderColor: "var(--border)",
      color: "var(--foreground)",
    } as React.CSSProperties,
  };

  return (
    <div>
      <label className="text-muted mb-1 block text-xs font-medium">{label}</label>
      {type === "textarea" ? (
        <textarea {...shared} rows={rows} />
      ) : (
        <input {...shared} type="text" />
      )}
    </div>
  );
}

type FormatCard = {
  key: CVFormat;
  variant: CVVariant;
  name: string;
  badge: string;
  description: string;
  mockup: React.ReactNode;
};

const FORMATS: FormatCard[] = [
  {
    key: "ats", variant: "full", name: "ATS Friendly", badge: "3 pages",
    description: "Single column, no tables — built to survive automated parsing. The safe default.",
    mockup: <ATSMockup accent="#222" />,
  },
  {
    key: "ats", variant: "compact", name: "ATS Compact", badge: "2 pages",
    description: "Same CV, front-loaded. Short summary, grouped skills, recent roles first.",
    mockup: <ATSMockup accent="#1a56db" leftBar />,
  },
  {
    key: "europass", variant: "full", name: "Europass", badge: "EU standard",
    description: "Official EU structure with the CEFR language grid. For public sector and visa files.",
    mockup: <EuropassMockup color="#003399" />,
  },
  {
    key: "designer", variant: "full", name: "Designer", badge: "Stand out",
    description: "Dark header band, indigo accents, sidebar for skills. For creative and tech roles.",
    mockup: <DesignerSidebarMockup sidebar="#1e293b" accent="#818cf8" />,
  },
];

export default function CVBuilderSection() {
  const [selected, setSelected] = useState(0);
  const [cv, setCV] = useState<SampleCV>(EMPTY_CV);
  const [downloaded, setDownloaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const format = FORMATS[selected];

  function set(field: keyof SampleCV) {
    return (value: string) => setCV((prev) => ({ ...prev, [field]: value }));
  }

  async function handleDownload() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/cv/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cv, format: format.key, variant: format.variant }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? "Could not generate that document.");
        return;
      }

      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = match ? decodeURIComponent(match[1]) : "CV.pdf";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2500);
    } catch {
      setError("Could not generate that document. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="cv-builder" className="mx-auto max-w-6xl px-6 py-20">
      {/* Heading */}
      <div className="mb-10 text-center">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
          style={{ color: "var(--primary)", borderColor: "var(--primary)" }}
        >
          <FileText size={11} aria-hidden="true" />
          Free CV Builder
        </span>
        <h2 className="mt-3 text-3xl font-bold">Build Your CV</h2>
        <p className="text-muted mt-2 text-sm">
          Pick a format, fill in your details, download a print-ready PDF
        </p>
      </div>

      {/* Format cards */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FORMATS.map((t, i) => {
          const active = selected === i;
          return (
            <button
              key={`${t.key}-${t.variant}`}
              type="button"
              onClick={() => setSelected(i)}
              aria-pressed={active}
              className="group flex flex-col overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 hover:shadow-lg"
              style={
                active
                  ? { borderColor: "var(--primary)", boxShadow: "0 0 0 2px var(--primary)" }
                  : { borderColor: "var(--border)" }
              }
            >
              <div className="relative h-40 w-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                <div className="absolute inset-3 drop-shadow-md">{t.mockup}</div>
                {active && (
                  <div
                    className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ background: "var(--primary)" }}
                  >
                    <Check size={11} color="#fff" strokeWidth={3} aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="surface flex flex-1 flex-col gap-1 px-4 py-3">
                <p className="flex items-center justify-between gap-2 text-sm font-semibold">
                  {t.name}
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                    style={{ background: "var(--surface-2)", color: "var(--muted-foreground)" }}
                  >
                    {t.badge}
                  </span>
                </p>
                <p className="text-muted text-xs leading-relaxed">{t.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Editor */}
      <div className="surface rounded-2xl border p-6">
        <h3 className="mb-6 text-base font-semibold">
          Edit your details &mdash;{" "}
          <span style={{ color: "var(--primary)" }}>{format.name}</span>
        </h3>

        <div className="space-y-8">
          <div>
            <p className="text-muted mb-3 text-xs font-semibold uppercase tracking-wider">Personal Information</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full Name" value={cv.name} onChange={set("name")} placeholder="Jane Doe" />
              <Field label="Professional Title" value={cv.title} onChange={set("title")} placeholder="Senior Software Engineer" />
              <Field label="Email" value={cv.email} onChange={set("email")} placeholder="jane@example.com" />
              <Field label="Phone" value={cv.phone} onChange={set("phone")} placeholder="+49 123 456 7890" />
              <Field label="Location" value={cv.location} onChange={set("location")} placeholder="Berlin, Germany" />
              <Field label="LinkedIn" value={cv.linkedin} onChange={set("linkedin")} placeholder="linkedin.com/in/janedoe" />
              <Field label="Website (optional)" value={cv.website} onChange={set("website")} placeholder="janedoe.dev" />
            </div>
          </div>

          <div>
            <p className="text-muted mb-3 text-xs font-semibold uppercase tracking-wider">Professional Summary</p>
            <Field
              label="Summary"
              value={cv.summary}
              onChange={set("summary")}
              placeholder={"Results-driven engineer with 5+ years building scalable systems…\n\nKeep it 3–5 sentences, tailored to the role."}
              type="textarea"
              rows={4}
            />
          </div>

          <div>
            <p className="text-muted mb-3 text-xs font-semibold uppercase tracking-wider">Work Experience</p>
            <Field
              label="Experience"
              value={cv.experience}
              onChange={set("experience")}
              placeholder={"Senior Engineer · Acme Corp · Jan 2022 – Present\n• Led migration of monolith to microservices, reducing latency by 40%\n• Mentored 4 junior engineers\n\nEngineer · StartupXYZ · 2019 – 2022\n• Built real-time dashboard used by 10k daily users"}
              type="textarea"
              rows={7}
            />
            <p className="text-muted mt-1.5 text-[11px]">
              One role per block, separated by a blank line. Start each achievement with • or -.
            </p>
          </div>

          <div>
            <p className="text-muted mb-3 text-xs font-semibold uppercase tracking-wider">Education</p>
            <Field
              label="Education"
              value={cv.education}
              onChange={set("education")}
              placeholder={"MSc Computer Science · TU Berlin · 2017 – 2019\nThesis: Distributed Systems in Edge Computing\n\nBSc Software Engineering · Dhaka University · 2013 – 2017"}
              type="textarea"
              rows={4}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Skills"
              value={cv.skills}
              onChange={set("skills")}
              placeholder="Languages: TypeScript, Python, SQL"
            />
            <Field
              label="Languages"
              value={cv.languages}
              onChange={set("languages")}
              placeholder="English (C2), German (B2), Bengali (Native)"
            />
          </div>
        </div>

        <div
          className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-6"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <p className="text-muted text-xs">
              Downloads as a <strong>.pdf</strong> — ready to send.{" "}
              <Link href="/register" className="underline underline-offset-2" style={{ color: "var(--primary)" }}>
                Create a free account
              </Link>{" "}
              for editable Word versions.
            </p>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={busy}
            className="btn-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60"
          >
            {downloaded ? (
              <>
                <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                Downloaded!
              </>
            ) : busy ? (
              <>
                <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                Generating…
              </>
            ) : (
              <>
                <Download size={15} aria-hidden="true" />
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
