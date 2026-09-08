import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LEGAL } from "@/lib/legal";

export function LegalHeader({ title, intro }: { title: string; intro: string }) {
  return (
    <header className="mb-10 border-b pb-8">
      <Link href="/" className="text-muted mb-4 inline-flex items-center gap-1.5 text-sm hover:underline">
        <ArrowLeft size={14} aria-hidden="true" /> Back to TrackMyself
      </Link>
      <h1 className="text-3xl font-bold" style={{ textWrap: "balance" }}>{title}</h1>
      <p className="text-muted mt-3 text-sm leading-relaxed">{intro}</p>
      <dl className="text-muted mt-5 flex flex-wrap gap-x-8 gap-y-1 font-mono text-[11px] uppercase tracking-wider">
        <div className="flex gap-2">
          <dt>Effective</dt>
          <dd className="text-primary">{LEGAL.effectiveDate}</dd>
        </div>
        <div className="flex gap-2">
          <dt>Updated</dt>
          <dd className="text-primary">{LEGAL.lastUpdated}</dd>
        </div>
      </dl>
    </header>
  );
}

export function Clause({
  n, title, children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b py-7 last:border-b-0">
      <h2 className="mb-3 flex items-baseline gap-3 text-lg font-semibold">
        <span className="text-muted font-mono text-xs tabular-nums">
          {String(n).padStart(2, "0")}
        </span>
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed [&_a]:underline [&_li]:leading-relaxed [&_p]:text-[var(--muted-foreground)] [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:text-[var(--muted-foreground)]">
        {children}
      </div>
    </section>
  );
}

export function LegalFooterNote() {
  return (
    <p className="text-muted mt-10 rounded-lg border border-dashed p-4 text-xs leading-relaxed">
      Questions about this document? Write to{" "}
      <a href={`mailto:${LEGAL.contactEmail}`} className="underline">{LEGAL.contactEmail}</a>.
      Read this alongside our{" "}
      <Link href="/terms" className="underline">Terms &amp; Conditions</Link> and{" "}
      <Link href="/privacy" className="underline">Privacy Policy</Link>.
    </p>
  );
}
