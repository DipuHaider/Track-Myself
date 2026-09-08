"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, LogOut, Menu, UserCircle, X } from "lucide-react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import SiteSearch from "@/components/site/SiteSearch";
import UserMenu from "@/components/site/UserMenu";
import { Logo } from "@/components/shared/Logo";

const SITE_NAV = [
  { label: "Job Sites",   href: "/#job-sites"  },
  { label: "CV Builder",  href: "/#cv-builder" },
  { label: "Tools",       href: "/tools"       },
];

export default function SiteHeader() {
  const { data: session } = useSession();
  const user = session?.user as {
    role?: string; plan?: string; name?: string | null; email?: string | null; image?: string | null;
  } | undefined;
  const role = user?.role;
  const isBackendUser = role === "superadmin" || role === "admin" || role === "editor";
  const [menuOpen, setMenuOpen] = useState(false);

  const close = () => setMenuOpen(false);

  return (
    <header className="surface fixed top-0 right-0 left-0 z-50 border-b">
      {/* ── Main bar ── */}
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Logo size={30} textSize="text-base" />

        {/* Desktop nav */}
        <nav aria-label="Site navigation" className="hidden items-center gap-6 text-sm md:flex">
          {SITE_NAV.map(({ label, href }) => (
            <a key={label} href={href} className="text-muted hover:text-foreground transition">
              {label}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <SiteSearch />

          {session ? (
            <UserMenu
              name={user?.name ?? "Account"}
              email={user?.email ?? ""}
              image={user?.image ?? ""}
              role={role ?? ""}
              plan={user?.plan ?? "free"}
              isBackendUser={isBackendUser}
            />
          ) : (
            <>
              <ThemeToggle />
              <Link
                href="/login"
                className="hidden rounded-md border px-4 py-1.5 text-sm transition hover:bg-[var(--surface-2)] sm:inline-flex"
              >
                Login
              </Link>
              <Link href="/register" className="btn-primary rounded-md px-4 py-1.5 text-sm font-medium">
                Register
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="site-mobile-menu"
            className="flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-[var(--surface-2)] md:hidden"
          >
            {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* ── Mobile nav panel ── */}
      {menuOpen && (
        <div id="site-mobile-menu" className="surface border-t md:hidden">
          <nav aria-label="Mobile site navigation" className="px-6 py-4">
            <ul className="space-y-0.5" role="list">
              {SITE_NAV.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    onClick={close}
                    className="block rounded-md px-3 py-2.5 text-sm transition hover:bg-[var(--surface-2)]"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>

            <hr className="my-3" style={{ borderColor: "var(--border)" }} />

            {session ? (
              <ul className="space-y-0.5" role="list">
                <li><ThemeToggle variant="menu" onToggled={close} /></li>
                {isBackendUser && (
                  <li>
                    <Link
                      href="/dashboard"
                      onClick={close}
                      className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition hover:bg-[var(--surface-2)]"
                    >
                      <LayoutDashboard size={15} aria-hidden="true" /> Dashboard
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    href="/me"
                    onClick={close}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition hover:bg-[var(--surface-2)]"
                  >
                    <UserCircle size={15} aria-hidden="true" /> My Profile
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => { signOut({ callbackUrl: "/" }); close(); }}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-red-500 transition hover:bg-red-50"
                  >
                    <LogOut size={15} aria-hidden="true" /> Sign out
                  </button>
                </li>
              </ul>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  onClick={close}
                  className="flex-1 rounded-md border px-4 py-2 text-center text-sm transition hover:bg-[var(--surface-2)]"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={close}
                  className="btn-primary flex-1 rounded-md px-4 py-2 text-center text-sm font-medium"
                >
                  Register
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
