"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ClipboardCopy, ScanText, X } from "lucide-react";

// ── keyword dictionaries ────────────────────────────────────────────────────

const TECH: string[] = [
  // Languages
  "javascript","typescript","python","java","go","golang","rust","php","ruby","swift",
  "kotlin","c++","c#","scala","r","matlab","perl","bash","shell","vba","cobol","fortran",
  // Frontend
  "react","vue","angular","svelte","next.js","nextjs","nuxt","gatsby","html","css",
  "sass","scss","tailwind","bootstrap","webpack","vite","jquery","redux","mobx",
  // Backend
  "node.js","nodejs","express","django","flask","fastapi","spring","laravel",".net",
  "rails","nestjs","graphql","grpc","rest api","restful","soap","websocket",
  // Cloud & DevOps
  "aws","azure","gcp","google cloud","docker","kubernetes","k8s","terraform","ansible",
  "jenkins","github actions","gitlab ci","ci/cd","devops","helm","prometheus","grafana",
  "cloudformation","pulumi","circleci","travis",
  // Databases
  "postgresql","postgres","mysql","mongodb","redis","elasticsearch","sqlite","oracle",
  "dynamodb","cassandra","neo4j","snowflake","bigquery","mariadb","mssql","firebase",
  "supabase","planetscale",
  // Data & AI
  "machine learning","deep learning","tensorflow","pytorch","pandas","numpy","scipy",
  "scikit-learn","spark","hadoop","kafka","airflow","data science","nlp","llm","openai",
  "langchain","computer vision","statistics","tableau","power bi","looker","dbt",
  // Mobile
  "react native","flutter","ios","android","xcode","swiftui","jetpack compose",
  // Tools & Practices
  "git","github","gitlab","jira","confluence","figma","postman","swagger","openapi",
  "linux","unix","microservices","serverless","agile","scrum","kanban","tdd","bdd",
  "solid","mvc","oop","functional programming","design patterns","api gateway",
];

const SOFT: string[] = [
  "communication","teamwork","leadership","problem-solving","analytical","creative",
  "detail-oriented","organised","organized","collaborative","adaptable","proactive",
  "initiative","independent","fast learner","motivated","passionate","mentoring",
  "stakeholder management","cross-functional","interpersonal","time management",
  "project management","critical thinking","attention to detail","empathy","ownership",
  "accountability","results-driven","self-starter","data-driven","strategic",
  "decision-making","conflict resolution","presentation","negotiation",
];

const STOP = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with","by","from",
  "up","about","into","through","during","is","are","was","were","be","been","being",
  "have","has","had","do","does","did","will","would","could","should","may","might",
  "shall","can","need","dare","used","ought","this","that","these","those","i","me",
  "my","we","our","you","your","it","its","he","she","they","them","their","what",
  "which","who","whom","when","where","why","how","all","both","each","few","more",
  "most","other","some","such","no","not","only","own","same","so","than","too","very",
  "just","as","if","then","because","while","although","however","therefore","thus",
  "experience","work","working","team","company","using","also","including","able",
  "ensure","must","position","role","will","new","strong","good","well","within","across",
  "skills","knowledge","understanding","ability","help","join","work","looking","seeking",
  "require","required","responsibilities","following","minimum","preferred","excellent",
  "proficient","familiarity","solid","proven","demonstrated","equivalent","related",
]);

// ── analysis ────────────────────────────────────────────────────────────────

type Analysis = {
  tech: string[];
  soft: string[];
  seniority: string;
  workType: string;
  yearsRequired: string;
  topKeywords: { word: string; count: number }[];
};

function normalise(text: string) {
  return text.toLowerCase().replace(/[''`]/g, "'");
}

function detectTech(text: string): string[] {
  const found: string[] = [];
  for (const skill of TECH) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\//g, "\\/");
    const re = new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "i");
    if (re.test(text)) found.push(skill);
  }
  return found;
}

function detectSoft(text: string): string[] {
  return SOFT.filter((s) => {
    const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "i").test(text);
  });
}

function detectSeniority(text: string): string {
  const t = text.toLowerCase();
  if (/\b(vp|vice president|director|head of|chief)\b/.test(t)) return "Executive / Director";
  if (/\b(staff|principal|distinguished)\b/.test(t))              return "Staff / Principal";
  if (/\b(lead|tech lead|team lead|senior lead)\b/.test(t))       return "Lead";
  if (/\b(senior|sr\.?)\b/.test(t))                               return "Senior";
  if (/\b(mid.?level|intermediate)\b/.test(t))                    return "Mid-level";
  if (/\b(junior|jr\.?|entry.?level|graduate|intern)\b/.test(t))  return "Junior / Entry";
  return "Not specified";
}

function detectWorkType(text: string): string {
  const t = text.toLowerCase();
  if (/\bfully remote\b|\b100%\s*remote\b/.test(t)) return "Remote";
  if (/\bhybrid\b/.test(t))                          return "Hybrid";
  if (/\bon.?site\b|\bin.office\b|\bin person\b/.test(t)) return "On-site";
  if (/\bremote\b/.test(t))                          return "Remote / Flexible";
  return "Not specified";
}

function detectYears(text: string): string {
  const matches = [
    ...text.matchAll(/(\d+)\+?\s*(?:–|-|to)\s*(\d+)\s*years?/gi),
    ...text.matchAll(/(\d+)\+\s*years?/gi),
    ...text.matchAll(/at least (\d+)\s*years?/gi),
    ...text.matchAll(/minimum (?:of )?(\d+)\s*years?/gi),
  ];
  if (matches.length === 0) return "Not specified";
  const nums = matches.flatMap((m) => m.slice(1).map(Number).filter(Boolean));
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return min === max ? `${min}+ years` : `${min}–${max}+ years`;
}

function topKeywords(text: string): { word: string; count: number }[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
  const freq: Record<string, number> = {};
  for (const w of words) freq[w] = (freq[w] ?? 0) + 1;
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word, count]) => ({ word, count }));
}

function analyse(text: string): Analysis {
  const norm = normalise(text);
  return {
    tech:          detectTech(norm),
    soft:          detectSoft(norm),
    seniority:     detectSeniority(norm),
    workType:      detectWorkType(norm),
    yearsRequired: detectYears(norm),
    topKeywords:   topKeywords(norm),
  };
}

// ── badge ────────────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: color + "18", color }}
    >
      {label}
    </span>
  );
}

// ── main page ─────────────────────────────────────────────────────────────

export default function JDAnalyzerPage() {
  const [text, setText]           = useState("");
  const [result, setResult]       = useState<Analysis | null>(null);
  const [copied, setCopied]       = useState(false);

  function handleAnalyse() {
    if (!text.trim()) return;
    setResult(analyse(text));
  }

  function handleClear() {
    setText("");
    setResult(null);
  }

  function handleCopySkills() {
    if (!result) return;
    const all = [...result.tech, ...result.soft].join(", ");
    navigator.clipboard.writeText(all).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const maxCount = result?.topKeywords[0]?.count ?? 1;

  const META = result
    ? [
        { label: result.seniority,     title: "Seniority",   color: "#8b5cf6" },
        { label: result.workType,       title: "Work type",   color: "#0ea5e9" },
        { label: result.yearsRequired,  title: "Experience",  color: "#f97316" },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Back + title */}
      <div>
        <Link href="/tools" className="text-muted mb-3 inline-flex items-center gap-1.5 text-sm hover:underline">
          <ArrowLeft size={14} /> Back to Tools
        </Link>
        <h1 className="text-2xl font-bold">Job Description Analyser</h1>
        <p className="text-muted mt-1 text-sm">
          Paste any job description — instantly extract skills, seniority, work type, and the keywords that matter most.
          Everything runs in your browser.
        </p>
      </div>

      {/* Input */}
      <div className="surface rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Job Description</label>
          {text && (
            <button onClick={handleClear} className="text-muted flex items-center gap-1 text-xs hover:text-red-500 transition">
              <X size={12} /> Clear
            </button>
          )}
        </div>
        <textarea
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
          style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--foreground)" }}
          rows={10}
          placeholder={"Paste the full job description here...\n\nExample:\nWe are looking for a Senior Backend Engineer with 5+ years of experience in Python and AWS...\n• Strong knowledge of microservices and Docker\n• Experience with PostgreSQL and Redis\n• Excellent communication skills"}
          value={text}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
        />
        <button
          onClick={handleAnalyse}
          disabled={!text.trim()}
          className="btn-primary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          <ScanText size={16} />
          Analyse JD
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-5">

          {/* Meta row */}
          <div className="grid grid-cols-3 gap-4">
            {META.map(({ label, title, color }) => (
              <div key={title} className="surface rounded-xl border p-4 text-center">
                <p className="text-muted mb-1 text-xs">{title}</p>
                <p className="text-sm font-semibold" style={{ color }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Tech skills */}
          <div className="surface rounded-xl border p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                Technical Skills
                <span className="text-muted ml-2 font-normal">({result.tech.length} found)</span>
              </h2>
              {result.tech.length > 0 && (
                <button
                  onClick={handleCopySkills}
                  className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition hover:bg-[var(--surface-2)]"
                >
                  {copied ? <><Check size={11} style={{ color: "#10b981" }} /> Copied</> : <><ClipboardCopy size={11} /> Copy all skills</>}
                </button>
              )}
            </div>
            {result.tech.length === 0 ? (
              <p className="text-muted text-sm">No specific technical skills detected.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {result.tech.map((s) => (
                  <Badge key={s} label={s} color="#6366f1" />
                ))}
              </div>
            )}
          </div>

          {/* Soft skills */}
          <div className="surface rounded-xl border p-5">
            <h2 className="mb-3 text-sm font-semibold">
              Soft Skills &amp; Traits
              <span className="text-muted ml-2 font-normal">({result.soft.length} found)</span>
            </h2>
            {result.soft.length === 0 ? (
              <p className="text-muted text-sm">No soft skills detected.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {result.soft.map((s) => (
                  <Badge key={s} label={s} color="#10b981" />
                ))}
              </div>
            )}
          </div>

          {/* Keyword frequency */}
          <div className="surface rounded-xl border p-5">
            <h2 className="mb-4 text-sm font-semibold">Top Keywords by Frequency</h2>
            <div className="space-y-2.5">
              {result.topKeywords.map(({ word, count }) => (
                <div key={word} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs font-medium capitalize">{word}</span>
                  <div className="flex-1 overflow-hidden rounded-full" style={{ background: "var(--surface-2)", height: "6px" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round((count / maxCount) * 100)}%`,
                        background: "linear-gradient(90deg, var(--primary), var(--accent))",
                      }}
                    />
                  </div>
                  <span className="text-muted w-6 shrink-0 text-right text-xs">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-xl border border-dashed p-5 text-sm space-y-1">
            <p className="font-medium">How to use these results</p>
            <ul className="text-muted mt-2 list-inside list-disc space-y-1">
              <li>Add missing technical skills to your CV if you genuinely have them.</li>
              <li>Mirror the exact keywords (e.g. &ldquo;Node.js&rdquo; not &ldquo;NodeJS&rdquo;) — ATS systems match literally.</li>
              <li>Use the top keywords in your cover letter opening paragraph.</li>
              <li>Soft skills signal what to emphasise in the interview, not just on paper.</li>
            </ul>
          </div>

        </div>
      )}
    </div>
  );
}
