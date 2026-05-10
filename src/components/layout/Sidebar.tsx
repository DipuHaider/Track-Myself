"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

const baseLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/applications", label: "Applications" },
  { href: "/analytics", label: "Analytics" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

export default function Sidebar() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canManageUsers = role === "admin" || role === "editor";

  return (
    <aside className="surface hidden w-56 shrink-0 flex-col border-r p-4 md:flex">
      <p className="mb-4 text-lg font-semibold">Track Myself</p>
      <nav className="flex-1 space-y-1">
        {baseLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-3 py-2 text-sm transition hover:bg-[var(--surface-2)]"
          >
            {item.label}
          </Link>
        ))}
        {canManageUsers && (
          <Link
            href="/dashboard/users"
            className="block rounded-md px-3 py-2 text-sm transition hover:bg-[var(--surface-2)]"
          >
            Users
          </Link>
        )}
      </nav>
    </aside>
  );
}
