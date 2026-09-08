import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

const LINKS = [
  {
    heading: "Product",
    items: [
      { label: "How it works", href: "/#trending" },
      { label: "Job sites", href: "/#job-sites" },
      { label: "CV builder", href: "/#cv-builder" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    heading: "Tools",
    items: [
      { label: "All tools", href: "/tools" },
      { label: "Background remover", href: "/tools/bg-remover" },
      { label: "Profile image", href: "/tools/profile-image" },
      { label: "Banner generator", href: "/tools/banner-generator" },
    ],
  },
  {
    heading: "Account",
    items: [
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/register" },
    ],
  },
  {
    heading: "Legal",
    items: [
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="surface border-t">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <Logo size={28} textSize="text-base" />
            <p className="text-muted mt-3 max-w-xs text-sm">
              Your career command center. Track applications, manage interviews, and land your dream job — all in one place.
            </p>
          </div>

          {/* Link columns */}
          {LINKS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h4 className="text-muted mb-3 font-mono text-[11px] uppercase tracking-[0.14em]">{col.heading}</h4>
              <ul className="space-y-2">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-muted hover:text-foreground text-sm transition">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="text-muted mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs sm:flex-row">
          <p>© {new Date().getFullYear()} TrackMyself. All rights reserved.</p>
          <nav aria-label="Legal" className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-foreground transition">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition">Privacy</Link>
            <span>Tools run in your browser.</span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
