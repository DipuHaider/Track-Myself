"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { useTheme } from "@/hooks/useTheme";

const PipelineCanvas = dynamic(() => import("@/components/site/PipelineCanvas"), {
  ssr: false,
});

const PREVIEW_ROWS = [
  { company: "Bashundhara Group", role: "Senior Software Engineer", status: "Offer Received",      cls: "status-offer",     day: "12 Sep" },
  { company: "Zalando",           role: "Full-Stack Engineer",       status: "Active - Technical", cls: "status-active",    day: "09 Sep" },
  { company: "Delivery Hero",     role: "Platform Engineer",         status: "Interview Scheduled",cls: "status-interview", day: "04 Sep" },
  { company: "N26",               role: "Frontend Engineer",         status: "Submitted",          cls: "status-submitted", day: "28 Aug" },
  { company: "Trivago",           role: "Software Engineer",         status: "No Response",        cls: "status-no-resp",   day: "11 Aug" },
];

const FACTS = [
  { value: "10", label: "pipeline stages" },
  { value: "5",  label: "CV documents, one source" },
  { value: "6",  label: "browser tools" },
  { value: "0",  label: "files sent to a server" },
];

export default function HeroSection() {
  const dark = useTheme() === "dark";

  return (
    <section className="hero-surface relative overflow-hidden pt-14">
      <PipelineCanvas />

      <p className="pointer-events-none absolute bottom-4 right-6 z-10 hidden font-mono text-[10px] uppercase tracking-wider hero-faint lg:block">
        Hold to charge · release on empty space to seed, on a cell to divide it
      </p>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-24 h-[34rem] w-[34rem] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, var(--hero-glow) 0%, transparent 70%)",
          opacity: "var(--hero-glow-opacity)",
        }}
      />
      <div className="relative z-10 mx-auto grid max-w-6xl gap-14 px-6 pb-24 pt-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12">
        {/* ── Thesis ── */}
        <div>
          <Logo size={34} textSize="text-base" href={null} lit={dark} onDark={dark} />

          <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.18em] hero-dimmer">
            Job application tracker
          </p>

          <h1
            className="mt-5 text-[2.6rem] font-bold leading-[1.05] hero-text sm:text-5xl lg:text-[3.4rem]"
            style={{ textWrap: "balance" }}
          >
            Know exactly where
            <br />
            every application stands.
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed hero-dim">
            Most job hunts fall apart in the follow-up — a spreadsheet nobody updates, a
            company you already applied to, an interview you forgot to prepare for.
            TrackMyself keeps the whole pipeline in one place and tells you what needs
            attention today.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="btn-primary flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold"
            >
              Start tracking — free
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href="/tools"
              className="hero-ghost-btn rounded-lg px-6 py-3 text-sm font-semibold transition"
            >
              Try the tools first
            </Link>
          </div>

          <p className="hero-dimmer mt-4 flex items-center gap-1.5 text-xs">
            <Check size={12} aria-hidden="true" />
            No card required. The browser tools work without an account.
          </p>

          <dl className="mt-10 grid max-w-lg grid-cols-2 gap-x-8 gap-y-5 hero-line border-t pt-7 sm:grid-cols-4">
            {FACTS.map(({ value, label }) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span className="hero-text font-mono text-2xl font-semibold tabular-nums">{value}</span>
                  <span className="hero-dimmer mt-1 block text-[11px] leading-snug">{label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ── Product preview ── */}
        <div className="relative">
          <div className="hero-card overflow-hidden rounded-xl border shadow-2xl">
            <div className="hero-line flex items-center justify-between border-b px-4 py-3">
              <p className="hero-text text-sm font-semibold">My Applications</p>
              <span className="hero-dimmer font-mono text-[11px] tabular-nums">5 tracked</span>
            </div>

            <table className="w-full text-left text-sm">
              <caption className="sr-only">Example of the application tracker</caption>
              <tbody>
                {PREVIEW_ROWS.map((row) => (
                  <tr key={row.company} className="hero-line-soft border-t">
                    <td className="px-4 py-3">
                      <p className="hero-text font-medium leading-tight">{row.company}</p>
                      <p className="hero-dimmer text-xs leading-tight">{row.role}</p>
                    </td>
                    <td className="px-2 py-3">
                      <span className={`role-badge ${row.cls} whitespace-nowrap`}>{row.status}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 hero-dimmer text-right font-mono text-[11px] tabular-nums">
                      {row.day}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="hero-line hero-strip flex items-center gap-2 border-t px-4 py-2.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#f59e0b" }} />
              <p className="hero-dim text-[11px]">
                Trivago has been quiet for 45 days — flagged as a possible ghost listing.
              </p>
            </div>
          </div>

          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-wider hero-faint">
            Example data
          </p>
        </div>
      </div>
    </section>
  );
}
