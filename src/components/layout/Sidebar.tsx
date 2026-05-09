import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/applications", label: "Applications" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export default function Sidebar() {
  return (
    <aside className="surface hidden w-56 shrink-0 border-r p-4 md:block">
      <p className="mb-4 text-lg font-semibold">Track Myself</p>
      <nav className="space-y-2">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-3 py-2 transition hover:bg-[var(--surface-2)]"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
