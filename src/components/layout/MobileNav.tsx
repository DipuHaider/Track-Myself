"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function MobileNav() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  return (
    <nav className="surface border-b p-3 md:hidden">
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/applications">Applications</Link>
        <Link href="/analytics">Analytics</Link>
        <Link href="/profile">Profile</Link>
        {isAdmin && (
          <Link href="/admin" className="font-medium text-red-600">
            Admin
          </Link>
        )}
      </div>
    </nav>
  );
}
