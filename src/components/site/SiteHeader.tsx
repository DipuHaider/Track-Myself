"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, LogOut, UserCircle } from "lucide-react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import SiteSearch from "@/components/site/SiteSearch";

export default function SiteHeader() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isBackendUser = role === "admin" || role === "editor";
  const isFrontendUser = role === "general" || role === "premium";

  return (
    <header className="surface fixed top-0 right-0 left-0 z-50 border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-lg font-bold" style={{ color: "var(--primary)" }}>
            Track<span style={{ color: "var(--accent)" }}>Myself</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <a href="#trending" className="text-muted hover:text-foreground transition">
            Trending
          </a>
          <a href="#cta" className="text-muted hover:text-foreground transition">
            Get Started
          </a>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Search — shown to logged-in users, before theme toggle */}
          <SiteSearch />

          <ThemeToggle />

          {session ? (
            <>
              {isBackendUser && (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-2)]"
                >
                  <LayoutDashboard size={13} />
                  <span className="hidden sm:block">Dashboard</span>
                </Link>
              )}

              {isFrontendUser && (
                <Link
                  href="/me"
                  className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--surface-2)]"
                >
                  <UserCircle size={13} />
                  <span className="hidden sm:block">My Profile</span>
                </Link>
              )}

              <div className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: "var(--primary)" }}
                >
                  {session.user?.name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <span className="hidden text-sm md:block">{session.user?.name}</span>
              </div>

              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-muted hover:text-red-500 transition"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md border px-4 py-1.5 text-sm transition hover:bg-[var(--surface-2)]"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="btn-primary rounded-md px-4 py-1.5 text-sm font-medium"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
