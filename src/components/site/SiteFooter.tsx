import Link from "next/link";

const LINKS = [
  {
    heading: "Product",
    items: [
      { label: "Features", href: "#" },
      { label: "Trending", href: "#trending" },
      { label: "Get Started", href: "#cta" },
    ],
  },
  {
    heading: "Account",
    items: [
      { label: "Login", href: "/login" },
      { label: "Register", href: "/register" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="surface border-t">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="text-lg font-bold">
              <span style={{ color: "var(--primary)" }}>Track</span>
              <span style={{ color: "var(--accent)" }}>Myself</span>
            </Link>
            <p className="text-muted mt-3 max-w-xs text-sm">
              Your career command center. Track applications, manage interviews, and land your dream job — all in one place.
            </p>
          </div>

          {/* Link columns */}
          {LINKS.map((col) => (
            <div key={col.heading}>
              <h4 className="mb-3 text-sm font-semibold">{col.heading}</h4>
              <ul className="space-y-2">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-muted hover:text-foreground text-sm transition">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-muted mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs sm:flex-row">
          <p>© {new Date().getFullYear()} TrackMyself. All rights reserved.</p>
          <p>Built for job seekers everywhere.</p>
        </div>
      </div>
    </footer>
  );
}
