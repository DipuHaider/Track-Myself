"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { canDo } from "@/lib/permissions";

export default function MobileNav() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  return (
    <nav className="surface border-b p-3 md:hidden">
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/dashboard">Dashboard</Link>
        {canDo(role, "view:applications") && <Link href="/applications">Applications</Link>}
        {canDo(role, "view:analytics") && <Link href="/analytics">Analytics</Link>}
        {canDo(role, "view:users") && <Link href="/dashboard/users">Users</Link>}
        <Link href="/profile">Profile</Link>
        {canDo(role, "view:settings") && <Link href="/settings">Settings</Link>}
      </div>
    </nav>
  );
}
