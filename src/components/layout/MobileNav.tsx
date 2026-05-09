import Link from "next/link";

export default function MobileNav() {
  return (
    <nav className="surface border-b p-3 md:hidden">
      <div className="flex gap-2 text-sm">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/applications">Applications</Link>
        <Link href="/analytics">Analytics</Link>
      </div>
    </nav>
  );
}
