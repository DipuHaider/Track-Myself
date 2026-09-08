"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

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
  return (
    <section className="relative overflow-hidden pt-14" style={{ background: "#0a0f1e" }}>
      <PipelineCanvas />

      <p className="pointer-events-none absolute bottom-4 right-6 z-10 hidden font-mono text-[10px] uppercase tracking-wider text-white/25 lg:block">
        Click empty space to seed · click a cell to divide it
      </p>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-24 h-[34rem] w-[34rem] rounded-full opacity-[0.18] blur-3xl"
        style={{ background: "radial-gradient(circle, #4169e1 0%, transparent 70%)" }}
      />
      <div className="relative z-10 mx-auto grid max-w-6xl gap-14 px-6 pb-24 pt-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12">
        {/* ── Thesis ── */}
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">
            Job application tracker
          </p>

          <h1
            className="mt-5 text-[2.6rem] font-bold leading-[1.05] text-white sm:text-5xl lg:text-[3.4rem]"
            style={{ textWrap: "balance" }}
          >
            Know exactly where
            <br />
            every application stands.
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/60">
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
              className="rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              Try the tools first
            </Link>
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-xs text-white/40">
            <Check size={12} aria-hidden="true" />
            No card required. The browser tools work without an account.
          </p>

          <dl className="mt-10 grid max-w-lg grid-cols-2 gap-x-8 gap-y-5 border-t border-white/10 pt-7 sm:grid-cols-4">
            {FACTS.map(({ value, label }) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span className="font-mono text-2xl font-semibold text-white tabular-nums">{value}</span>
                  <span className="mt-1 block text-[11px] leading-snug text-white/45">{label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ── Product preview ── */}
        <div className="relative">
          <div
            className="overflow-hidden rounded-xl border shadow-2xl"
            style={{
              background: "rgba(255,255,255,0.08)",
              borderColor: "rgba(255,255,255,0.14)",
              backdropFilter: "blur(18px) saturate(1.4)",
              WebkitBackdropFilter: "blur(18px) saturate(1.4)",
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-semibold text-white">My Applications</p>
              <span className="font-mono text-[11px] text-white/45 tabular-nums">5 tracked</span>
            </div>

            <table className="w-full text-left text-sm">
              <caption className="sr-only">Example of the application tracker</caption>
              <tbody>
                {PREVIEW_ROWS.map((row) => (
                  <tr key={row.company} className="border-t border-white/[0.07]">
                    <td className="px-4 py-3">
                      <p className="font-medium leading-tight text-white">{row.company}</p>
                      <p className="text-xs leading-tight text-white/45">{row.role}</p>
                    </td>
                    <td className="px-2 py-3">
                      <span className={`role-badge ${row.cls} whitespace-nowrap`}>{row.status}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-[11px] tabular-nums text-white/40">
                      {row.day}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center gap-2 border-t border-white/10 bg-white/[0.04] px-4 py-2.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#f59e0b" }} />
              <p className="text-[11px] text-white/50">
                Trivago has been quiet for 45 days — flagged as a possible ghost listing.
              </p>
            </div>
          </div>

          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-wider text-white/30">
            Example data
          </p>
        </div>
      </div>
    </section>
  );
}
