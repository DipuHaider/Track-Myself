import Link from "next/link";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import FaqBrowser from "@/components/site/FaqBrowser";
import { FAQ } from "@/lib/faq";
import { LEGAL } from "@/lib/legal";

export const metadata = {
  title: "FAQ",
  alternates: { canonical: "/faq" },
  description:
    "Answers about tracking applications, the CV builder, the browser tools, Premium, privacy and troubleshooting.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mb-10 border-b pb-8">
        <Link href="/" className="text-muted mb-4 inline-flex items-center gap-1.5 text-sm hover:underline">
          <ArrowLeft size={14} aria-hidden="true" /> Back to TrackMyself
        </Link>
        <h1 className="flex items-center gap-2.5 text-3xl font-bold" style={{ textWrap: "balance" }}>
          <LifeBuoy size={26} style={{ color: "var(--primary)" }} aria-hidden="true" />
          Frequently asked questions
        </h1>
        <p className="text-muted mt-3 max-w-2xl text-sm leading-relaxed">
          {FAQ.length} answers about tracking applications, building CVs, the browser tools, what
          Premium adds and what happens to your data. Search or filter by topic.
        </p>
      </header>

      <FaqBrowser />

      <section className="surface mt-12 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-6">
        <div>
          <h2 className="text-sm font-semibold">Still stuck?</h2>
          <p className="text-muted mt-1 text-sm">
            Email us and we will answer. Reading the fine print instead? See the{" "}
            <Link href="/terms" className="underline">Terms</Link> and{" "}
            <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </div>
        <a
          href={`mailto:${LEGAL.contactEmail}`}
          className="btn-primary shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold"
        >
          Contact support
        </a>
      </section>
    </>
  );
}
