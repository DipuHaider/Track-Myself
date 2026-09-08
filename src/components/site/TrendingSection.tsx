import Link from "next/link";
import { ArrowRight, Copy, Ghost, Sparkles } from "lucide-react";

const PIPELINE = [
  { status: "Wishlist",            cls: "status-wishlist",  note: "Roles worth a look, before you commit an evening to the application." },
  { status: "Submitted",           cls: "status-submitted", note: "Sent. The clock starts here — this is what most spreadsheets stop tracking." },
  { status: "No Response",         cls: "status-no-resp",   note: "Silence. Flagged automatically once it passes 45 days." },
  { status: "Interview Scheduled", cls: "status-interview", note: "A date in the calendar, with the job ad and your CV attached to it." },
  { status: "Active",              cls: "status-active",    note: "Written, HR, technical, cultural fit — each round tracked separately." },
  { status: "Offer Received",      cls: "status-offer",     note: "The number that matters, next to the four that did not work out." },
  { status: "Rejected",            cls: "status-rejected",  note: "Closed, but kept. Patterns only show up across the whole history." },
];

const SIGNALS = [
  {
    icon: Ghost,
    tint: "#f59e0b",
    title: "Ghost listings, flagged",
    body: "An application sitting in Submitted or No Response for 45 days is marked automatically. You stop waiting on roles that were never going to answer.",
  },
  {
    icon: Copy,
    tint: "#e11d48",
    title: "Duplicates, caught on entry",
    body: "Applying twice to the same company and title is embarrassing and common. Matching entries are flagged before you send.",
  },
  {
    icon: Sparkles,
    tint: "#7c3aed",
    title: "One CV, every format",
    body: "Fill in your details once and export ATS, Europass, Designer and a tailored resume — as real Word files, not HTML wearing a .doc extension.",
  },
];

export default function TrendingSection() {
  return (
    <section id="trending" className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
        {/* ── Pipeline ── */}
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            The pipeline
          </p>
          <h2 className="mt-3 text-3xl font-bold" style={{ textWrap: "balance" }}>
            Ten stages, because
            <br />
            &ldquo;applied&rdquo; is not a status.
          </h2>
          <p className="text-muted mt-4 max-w-md text-sm leading-relaxed">
            A job hunt is not a to-do list. It is a pipeline with stalls, silences and
            second rounds, and the useful information lives in the gaps between stages.
          </p>

          <ol className="mt-8 space-y-0">
            {PIPELINE.map((step, i) => (
              <li
                key={step.status}
                className="grid grid-cols-[2.5rem_9.5rem_1fr] items-baseline gap-3 border-t py-3.5"
              >
                <span className="text-muted font-mono text-[11px] tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={`role-badge ${step.cls} justify-self-start whitespace-nowrap`}>
                  {step.status}
                </span>
                <span className="text-muted text-xs leading-relaxed">{step.note}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* ── What it catches ── */}
        <div className="lg:pt-14">
          <div className="space-y-4">
            {SIGNALS.map(({ icon: Icon, tint, title, body }) => (
              <article
                key={title}
                className="surface flex gap-4 rounded-xl border p-6"
                style={{ borderLeft: `3px solid ${tint}` }}
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `${tint}1a`, color: tint }}
                >
                  <Icon size={17} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="text-muted mt-1.5 text-sm leading-relaxed">{body}</p>
                </div>
              </article>
            ))}
          </div>

          <Link
            href="/register"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold transition hover:gap-2.5"
            style={{ color: "var(--primary)" }}
          >
            Track your first application
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
