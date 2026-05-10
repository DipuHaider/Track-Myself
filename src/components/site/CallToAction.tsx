import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";

const FEATURES = [
  "Track unlimited applications",
  "Schedule & manage interviews",
  "Analytics & progress insights",
  "Attach CVs and documents",
];

export default function CallToAction() {
  return (
    <section id="cta" className="relative overflow-hidden py-24">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #0d1b3e 0%, #1a0a2e 50%, #0d1b3e 100%)",
        }}
      />
      {/* Decorative blobs */}
      <div
        className="absolute -top-20 -left-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--primary)" }}
      />
      <div
        className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--accent)" }}
      />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <span className="inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80">
          Free to Get Started
        </span>
        <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">
          Take Control of Your
          <br />
          <span style={{ color: "#a78bfa" }}>Job Search Today</span>
        </h2>
        <p className="mt-4 text-base text-white/70 md:text-lg">
          Stop losing track of where you applied. TrackMyself keeps everything
          organized so you can focus on what matters — getting hired.
        </p>

        {/* Feature list */}
        <ul className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-3 text-sm text-white/80">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <CheckCircle size={15} className="shrink-0" style={{ color: "#a78bfa" }} />
              {f}
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/register"
            className="btn-primary flex items-center gap-2 rounded-lg px-7 py-3 text-sm font-semibold"
          >
            Create Free Account
            <ArrowRight size={15} />
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-white/30 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            I already have an account
          </Link>
        </div>
      </div>
    </section>
  );
}
