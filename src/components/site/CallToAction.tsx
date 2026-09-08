import Link from "next/link";
import { ArrowRight } from "lucide-react";

const INCLUDED = [
  ["Unlimited applications", "No cap, no per-record pricing."],
  ["Interview stages", "Written, HR, technical and cultural rounds tracked separately."],
  ["Ghost & duplicate flags", "Automatic after 45 days, or on a matching company and title."],
  ["CV builder", "ATS, Europass and Designer, exported as real Word documents."],
  ["Document library", "CVs, resumes, cover letters, certificates and a profile photo."],
  ["Six browser tools", "Available without an account at all."],
];

export default function CallToAction() {
  return (
    <section id="cta" className="mx-auto max-w-6xl px-6 py-24">
      <div className="surface overflow-hidden rounded-2xl border">
        <div className="grid lg:grid-cols-[1fr_1fr]">
          {/* Offer */}
          <div className="p-9 lg:p-12">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              Free tier
            </p>
            <h2 className="mt-3 text-3xl font-bold" style={{ textWrap: "balance" }}>
              Start with the whole tracker.
            </h2>
            <p className="text-muted mt-4 max-w-md text-sm leading-relaxed">
              Everything below is on the free plan. Premium adds AI CV tailoring, full-resolution
              exports and every image format — the tracking itself is never limited.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="btn-primary flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold"
              >
                Create a free account
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="rounded-lg border px-6 py-3 text-sm font-semibold transition hover:bg-[var(--surface-2)]"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* What's included */}
          <div className="surface-muted border-t p-9 lg:border-l lg:border-t-0 lg:p-12">
            <dl className="space-y-4">
              {INCLUDED.map(([term, detail]) => (
                <div key={term} className="grid grid-cols-[1.1rem_1fr] gap-3 border-b pb-4 last:border-b-0 last:pb-0">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-1.5 w-1.5 rounded-full justify-self-center"
                    style={{ background: "var(--primary)" }}
                  />
                  <div>
                    <dt className="text-sm font-medium">{term}</dt>
                    <dd className="text-muted mt-0.5 text-xs leading-relaxed">{detail}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
