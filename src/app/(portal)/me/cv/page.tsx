"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Check, Download, FileText, Loader2, Lock,
  Save, Sparkles, Star, X,
} from "lucide-react";
import { downloadAsWord, getCVHTML, DEFAULT_CV } from "@/lib/cvDownload";
import type { CVData, TabKey } from "@/lib/cvDownload";

const CV_KEY = "trackmyself-cv";

// ── template mockups (inline, same visual as homepage builder) ─────────────

function ATSMockup({ accent, leftBar }: { accent: string; leftBar?: boolean }) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded bg-white p-2">
      <div className="mb-1.5 border-b border-gray-200 pb-1.5">
        <div className="mb-0.5 h-2.5 w-2/3 rounded bg-gray-800" />
        <div className="h-1.5 w-1/2 rounded bg-gray-300" />
        <div className="mt-0.5 h-1 w-full rounded bg-gray-200" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="mb-1.5">
          <div
            className="mb-0.5 h-1.5 w-1/3 rounded"
            style={leftBar
              ? { boxShadow: `inset 3px 0 0 ${accent}`, paddingLeft: 3 }
              : { background: accent, opacity: 0.85 }}
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
        {[0, 1, 2].map((i) => <div key={i} className="h-1 w-full rounded bg-white/20" />)}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-1.5 bg-white">
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
        <div className="h-1 w-full rounded bg-white/20" />
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

// ── data ───────────────────────────────────────────────────────────────────

type Template = { name: string; description: string; mockup: React.ReactNode };

const TABS: { key: TabKey; label: string; sub: string }[] = [
  { key: "ats",      label: "ATS Friendly", sub: "Parser-optimised"  },
  { key: "europass", label: "Europass",      sub: "EU Standard"       },
  { key: "designer", label: "Designer",      sub: "Stand out"         },
];

const TEMPLATES: Record<TabKey, Template[]> = {
  ats: [
    { name: "Classic ATS",   description: "Underlined headers — maximum parser compatibility",      mockup: <ATSMockup accent="#222" /> },
    { name: "Modern ATS",    description: "Blue left-bar sections — crisp and professional",         mockup: <ATSMockup accent="#1a56db" leftBar /> },
    { name: "Executive ATS", description: "Serif font, centred header — polished for senior roles",  mockup: <ATSMockup accent="#333" /> },
  ],
  europass: [
    { name: "Official EU",   description: "Deep blue (#003399) — the standard Europass format",       mockup: <EuropassMockup color="#003399" /> },
    { name: "Euro Modern",   description: "Bright blue — Europass structure, contemporary look",       mockup: <EuropassMockup color="#1a56db" /> },
    { name: "Euro Compact",  description: "Teal header — space-efficient for 1-page CVs",             mockup: <EuropassMockup color="#00695c" /> },
  ],
  designer: [
    { name: "Creative Sidebar", description: "Dark sidebar with indigo accents — bold, memorable",    mockup: <DesignerSidebarMockup sidebar="#1e293b" accent="#818cf8" /> },
    { name: "Bold Header",      description: "Full-width dark header with emerald accents",            mockup: <DesignerBoldMockup sidebar="#111827" accent="#10b981" /> },
    { name: "Minimal Accent",   description: "Left accent border with pink highlights — elegant",      mockup: <DesignerMinimalMockup accent="#f472b6" /> },
  ],
};

// ── field component ────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = "input", rows = 4 }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: "input" | "textarea"; rows?: number;
}) {
  const cls = "w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]";
  const style: React.CSSProperties = {
    background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--foreground)",
  };
  return (
    <div>
      <label className="text-muted mb-1 block text-xs font-medium">{label}</label>
      {type === "textarea"
        ? <textarea className={cls} style={style} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        : <input type="text" className={cls} style={style} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      }
    </div>
  );
}

// ── premium badge ──────────────────────────────────────────────────────────

function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ background: "#f59e0b22", color: "#d97706" }}>
      <Star size={9} fill="currentColor" /> Premium
    </span>
  );
}

// ── main page ──────────────────────────────────────────────────────────────

export default function CVBuilderPage() {
  const { data: session } = useSession();
  const plan = (session?.user as { plan?: string } | undefined)?.plan ?? "free";
  const isPremium = plan === "premium" || plan === "paid";

  const [tab, setTab]                       = useState<TabKey>("ats");
  const [selected, setSelected]             = useState(0);
  const [cv, setCV]                         = useState<CVData>(DEFAULT_CV);

  const [savedFlash, setSavedFlash]         = useState(false);
  const [dlFlash, setDlFlash]               = useState(false);

  /* AI adapt panel */
  const [showAdapt, setShowAdapt]           = useState(false);
  const [jobDesc, setJobDesc]               = useState("");
  const [adapting, setAdapting]             = useState(false);
  const [adaptMsg, setAdaptMsg]             = useState("");

  /* load saved CV */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CV_KEY);
      if (raw) setCV(JSON.parse(raw));
    } catch {}
  }, []);

  function set(field: keyof CVData) {
    return (value: string) => setCV((p) => ({ ...p, [field]: value }));
  }

  function handleTabChange(key: TabKey) { setTab(key); setSelected(0); }

  function handleSave() {
    try { localStorage.setItem(CV_KEY, JSON.stringify(cv)); } catch {}
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  function handleDownloadWord() {
    downloadAsWord(cv, tab, selected);
    setDlFlash(true);
    setTimeout(() => setDlFlash(false), 2500);
  }

  function handleDownloadPDF() {
    if (!isPremium) return;
    const html = getCVHTML(cv, tab, selected);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  async function handleAdapt() {
    if (!isPremium || !jobDesc.trim() || adapting) return;
    setAdapting(true);
    setAdaptMsg("");
    try {
      const res = await fetch("/api/cv/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvData: cv, jobDescription: jobDesc }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Request failed");
      }
      const adapted = await res.json() as Partial<CVData>;
      setCV((p) => ({ ...p, ...adapted }));
      setShowAdapt(false);
      setJobDesc("");
      setAdaptMsg("CV adapted to the job description.");
      setTimeout(() => setAdaptMsg(""), 4000);
    } catch (e) {
      setAdaptMsg(e instanceof Error ? e.message : "Failed. Try again.");
    } finally {
      setAdapting(false);
    }
  }

  const templates = TEMPLATES[tab];

  return (
    <div className="mx-auto max-w-4xl space-y-8">

      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "var(--primary)22", color: "var(--primary)" }}>
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">CV Builder</h1>
            <p className="text-muted text-sm">Build, save and tailor your CV for every application</p>
          </div>
        </div>
      </div>

      {/* ── Premium banner (free users) ── */}
      {!isPremium && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4"
          style={{ borderColor: "#f59e0b44", background: "#fffbeb" }}>
          <div className="flex items-center gap-3">
            <Star size={18} style={{ color: "#d97706" }} fill="#d97706" />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#92400e" }}>
                Upgrade to Premium for PDF download &amp; AI-powered CV tailoring
              </p>
              <p className="text-xs" style={{ color: "#b45309" }}>
                Free tier: Word download and all templates are available.
              </p>
            </div>
          </div>
          <Link href="/me" className="btn-primary shrink-0 rounded-lg px-4 py-2 text-xs font-semibold">
            Upgrade
          </Link>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-2">
        {TABS.map(({ key, label, sub }) => (
          <button key={key} onClick={() => handleTabChange(key)}
            className="flex flex-col items-center rounded-xl border px-5 py-2.5 text-sm font-medium transition"
            style={tab === key
              ? { background: "var(--primary)", borderColor: "var(--primary)", color: "#fff" }
              : { borderColor: "var(--border)", color: "var(--foreground)" }}>
            {label}
            <span className="mt-0.5 text-[10px] font-normal" style={{ opacity: tab === key ? 0.8 : 0.5 }}>{sub}</span>
          </button>
        ))}
      </div>

      {/* ── Template cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {templates.map((t, i) => {
          const active = selected === i;
          return (
            <button key={t.name} onClick={() => setSelected(i)}
              className="group flex flex-col overflow-hidden rounded-2xl border text-left transition hover:-translate-y-0.5 hover:shadow-md"
              style={active ? { borderColor: "var(--primary)", boxShadow: "0 0 0 2px var(--primary)" } : { borderColor: "var(--border)" }}>
              <div className="relative h-36 w-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                <div className="absolute inset-3 drop-shadow-sm">{t.mockup}</div>
                {active && (
                  <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ background: "var(--primary)" }}>
                    <Check size={11} color="#fff" strokeWidth={3} />
                  </div>
                )}
              </div>
              <div className="surface flex flex-1 flex-col gap-0.5 px-3 py-2.5">
                <p className="text-xs font-semibold">{t.name}</p>
                <p className="text-muted text-[11px] leading-relaxed">{t.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Editor ── */}
      <div className="surface rounded-2xl border p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-semibold">
            Editing — <span style={{ color: "var(--primary)" }}>{templates[selected].name}</span>
          </h2>
          <button onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-2)]">
            {savedFlash ? <><Check size={13} style={{ color: "#10b981" }} /> Saved!</> : <><Save size={13} /> Save CV</>}
          </button>
        </div>

        <div className="space-y-8">
          {/* Personal */}
          <div>
            <p className="text-muted mb-3 text-xs font-semibold uppercase tracking-wider">Personal Information</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full Name"           value={cv.name}     onChange={set("name")}     placeholder="Jane Doe" />
              <Field label="Professional Title"  value={cv.title}    onChange={set("title")}    placeholder="Senior Software Engineer" />
              <Field label="Email"               value={cv.email}    onChange={set("email")}    placeholder="jane@example.com" />
              <Field label="Phone"               value={cv.phone}    onChange={set("phone")}    placeholder="+49 123 456 7890" />
              <Field label="Location"            value={cv.location} onChange={set("location")} placeholder="Berlin, Germany" />
              <Field label="LinkedIn"            value={cv.linkedin} onChange={set("linkedin")} placeholder="linkedin.com/in/janedoe" />
              <Field label="Website (optional)"  value={cv.website}  onChange={set("website")}  placeholder="janedoe.dev" />
            </div>
          </div>

          {/* Summary */}
          <div>
            <p className="text-muted mb-3 text-xs font-semibold uppercase tracking-wider">Professional Summary</p>
            <Field label="Summary" value={cv.summary} onChange={set("summary")} type="textarea" rows={4}
              placeholder={"Results-driven engineer with 5+ years building scalable systems...\nKeep it 3–5 sentences, tailored to the role."} />
          </div>

          {/* Experience */}
          <div>
            <p className="text-muted mb-3 text-xs font-semibold uppercase tracking-wider">Work Experience</p>
            <Field label="Experience" value={cv.experience} onChange={set("experience")} type="textarea" rows={7}
              placeholder={"Senior Engineer · Acme Corp · Jan 2022 – Present\n• Led migration to microservices, cut latency by 40%\n• Mentored 4 junior engineers\n\nEngineer · StartupXYZ · 2019 – 2022\n• Built real-time dashboard serving 10k daily users"} />
          </div>

          {/* Education */}
          <div>
            <p className="text-muted mb-3 text-xs font-semibold uppercase tracking-wider">Education</p>
            <Field label="Education" value={cv.education} onChange={set("education")} type="textarea" rows={4}
              placeholder={"MSc Computer Science · TU Berlin · 2017 – 2019\n\nBSc Software Engineering · Dhaka University · 2013 – 2017"} />
          </div>

          {/* Skills + Languages */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Skills" value={cv.skills} onChange={set("skills")}
              placeholder="TypeScript, React, Node.js, Python, PostgreSQL, Docker, AWS" />
            <Field label="Languages" value={cv.languages} onChange={set("languages")}
              placeholder="English (C2), German (B2), Bengali (Native)" />
          </div>
        </div>

        {/* ── Action bar ── */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-6"
          style={{ borderColor: "var(--border)" }}>

          {/* Left: format note + adapt msg */}
          <div>
            <p className="text-muted text-xs">
              Word (.doc) opens in Microsoft Word, LibreOffice &amp; Google Docs.
            </p>
            {adaptMsg && (
              <p className="mt-1 text-xs font-medium" style={{ color: "#10b981" }}>{adaptMsg}</p>
            )}
          </div>

          {/* Right: action buttons */}
          <div className="flex flex-wrap items-center gap-2">

            {/* AI Adapt — premium */}
            <div className="relative">
              <button
                onClick={() => isPremium ? setShowAdapt(true) : undefined}
                disabled={!isPremium}
                title={!isPremium ? "Upgrade to Premium to use AI tailoring" : "Adapt CV with AI"}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition"
                style={isPremium
                  ? { borderColor: "#f59e0b", color: "#d97706", background: "#fffbeb" }
                  : { opacity: 0.5, cursor: "not-allowed", borderColor: "var(--border)" }}>
                {isPremium ? <Sparkles size={14} /> : <Lock size={14} />}
                AI Tailor
                {!isPremium && <PremiumBadge />}
              </button>
            </div>

            {/* Download PDF — premium */}
            <button
              onClick={handleDownloadPDF}
              disabled={!isPremium}
              title={!isPremium ? "Upgrade to Premium for PDF download" : "Download as PDF"}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition"
              style={isPremium
                ? { borderColor: "#6366f1", color: "#6366f1", background: "#6366f108" }
                : { opacity: 0.5, cursor: "not-allowed", borderColor: "var(--border)" }}>
              {isPremium ? <Download size={14} /> : <Lock size={14} />}
              PDF
              {!isPremium && <PremiumBadge />}
            </button>

            {/* Download Word — free */}
            <button onClick={handleDownloadWord}
              className="btn-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold">
              {dlFlash
                ? <><Check size={14} strokeWidth={2.5} /> Downloaded!</>
                : <><Download size={14} /> Word (.doc)</>}
            </button>

          </div>
        </div>
      </div>

      {/* ── AI Adapt panel (modal) ── */}
      {showAdapt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="surface w-full max-w-lg rounded-2xl border p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} style={{ color: "#d97706" }} />
                <h3 className="font-semibold">AI CV Tailor</h3>
              </div>
              <button onClick={() => { setShowAdapt(false); setJobDesc(""); setAdaptMsg(""); }}
                className="text-muted hover:text-foreground transition">
                <X size={18} />
              </button>
            </div>

            <p className="text-muted mb-4 text-sm">
              Paste the job description below. AI will rewrite your summary, rephrase your experience highlights,
              and reorder your skills to best match the role — without inventing anything.
            </p>

            <textarea
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--foreground)" }}
              rows={10}
              placeholder={"Paste the full job description here...\n\nExample:\nWe are looking for a Senior Full Stack Engineer to join our team...\n• 5+ years of experience with React and Node.js\n• Strong understanding of microservices..."}
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
            />

            {adaptMsg && (
              <p className="mt-2 text-xs text-red-500">{adaptMsg}</p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setShowAdapt(false); setJobDesc(""); }}
                className="rounded-lg border px-4 py-2 text-sm transition hover:bg-[var(--surface-2)]">
                Cancel
              </button>
              <button
                onClick={handleAdapt}
                disabled={adapting || !jobDesc.trim()}
                className="btn-primary flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-60">
                {adapting
                  ? <><Loader2 size={14} className="animate-spin" /> Adapting…</>
                  : <><Sparkles size={14} /> Tailor my CV</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
