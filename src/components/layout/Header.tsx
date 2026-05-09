"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { ROLE_LABELS, type Role } from "@/lib/permissions";

export default function Header() {
  const { data: session } = useSession();
  const user = session?.user;
  const role = user?.role as Role | undefined;

  return (
    <header className="surface flex items-center justify-between border-b px-5 py-3">
      <h1 className="text-lg font-semibold">Job Application Tracker</h1>
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            <Link href="/profile" className="flex items-center gap-2 rounded-md px-2 py-1 text-sm transition hover:bg-[var(--surface-2)]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--surface-2)" }}>
                {user.name?.charAt(0).toUpperCase()}
              </span>
              <span className="hidden sm:inline">{user.name}</span>
            </Link>
            {role && (
              <span className={`role-badge role-${role}`}>
                {ROLE_LABELS[role] ?? role}
              </span>
            )}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md border px-3 py-1.5 text-sm transition hover:opacity-90"
            >
              Sign out
            </button>
          </div>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
