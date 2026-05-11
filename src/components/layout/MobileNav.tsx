"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function MobileNav() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canManageUsers = role === "superadmin" || role === "admin" || role === "editor";

  return (
    <nav className="surface border-b p-3 md:hidden">
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/applications">Applications</Link>
        <Link href="/analytics">Analytics</Link>
        <Link href="/profile">Profile</Link>
        {canManageUsers && (
          <Link href="/dashboard/users">Users</Link>
        )}
      </div>
    </nav>
  );
}
