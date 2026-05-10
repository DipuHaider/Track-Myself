"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const ThreeBanner = dynamic(() => import("@/components/site/ThreeBanner"), {
  ssr: false,
});

const STATS = [
  { n: "5,000+", label: "Applications Tracked" },
  { n: "2,400+", label: "Interviews Scheduled" },
  { n: "380+", label: "Offers Received" },
];

export default function HeroSection() {
  return (
    <section
      className="relative min-h-screen overflow-hidden pt-14"
      style={{
        background:
          "linear-gradient(135deg, #0d1b3e 0%, #1a0a2e 60%, #0d1b3e 100%)",
      }}
    >
      <ThreeBanner />

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--background)] to-transparent" />

      <div className="relative z-10 flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-6 pb-12 text-center">
        <span className="mb-5 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
          Your Career Command Center
        </span>

        <h1 className="max-w-4xl text-5xl font-bold leading-tight text-white md:text-6xl lg:text-7xl">
          Track Every Application.
          <br />
          <span style={{ color: "#a78bfa" }}>Land Your Dream Job.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base text-white/70 md:text-lg">
          Centralize your job hunt. Monitor every application, schedule interviews,
          and analyze your progress — all from one powerful dashboard.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/register"
            className="btn-primary rounded-lg px-7 py-3 text-sm font-semibold"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-white/30 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-16 flex flex-wrap justify-center gap-12">
          {STATS.map(({ n, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-bold text-white">{n}</div>
              <div className="mt-1 text-sm text-white/60">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
