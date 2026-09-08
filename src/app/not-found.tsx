import Link from "next/link";
import { Compass, FileText, LifeBuoy, Wrench } from "lucide-react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

const ROUTES = [
  { href: "/", icon: Compass, label: "Home", hint: "What TrackMyself does" },
  { href: "/tools", icon: Wrench, label: "Tools", hint: "Six free browser tools" },
  { href: "/faq", icon: LifeBuoy, label: "FAQ", hint: "38 answers" },
  { href: "/me/applications", icon: FileText, label: "My Applications", hint: "Your tracker" },
];

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-28">
        <p className="text-muted font-mono text-[11px] uppercase tracking-[0.18em]">Error 404</p>
        <h1 className="mt-3 text-4xl font-bold" style={{ textWrap: "balance" }}>
          That page is not here.
        </h1>
        <p className="text-muted mt-4 max-w-lg text-sm leading-relaxed">
          The link may be out of date, or the page may have moved. Nothing has been lost — your
          applications and documents are exactly where you left them.
        </p>

        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border sm:grid-cols-2"
          style={{ background: "var(--border)" }}>
          {ROUTES.map(({ href, icon: Icon, label, hint }) => (
            <Link
              key={href}
              href={href}
              className="surface flex items-center gap-3 p-5 transition hover:bg-[var(--surface-2)]"
            >
              <Icon size={17} style={{ color: "var(--primary)" }} aria-hidden="true" />
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="text-muted block text-xs">{hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
