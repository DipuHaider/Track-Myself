import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { authOptions } from "@/lib/auth";
import ThemeToggle from "@/components/layout/ThemeToggle";

const adminLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions as any);
  const role = (session as { user?: { role?: string } } | null)?.user?.role;
  if (role !== "admin") redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r p-4" style={{ background: "var(--surface)" }}>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
          Admin Panel
        </p>
        <p className="mb-5 text-lg font-bold text-primary">Track Myself</p>
        <nav className="flex-1 space-y-1">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-md px-3 py-2 text-sm transition hover:bg-[var(--surface-2)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t pt-4">
          <Link
            href="/dashboard"
            className="block rounded-md px-3 py-2 text-sm transition hover:bg-[var(--surface-2)]"
          >
            ← Back to App
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="surface flex items-center justify-between border-b px-5 py-3">
          <h1 className="text-lg font-semibold">Admin Panel</h1>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
