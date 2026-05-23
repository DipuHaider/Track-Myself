"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, BarChart2, FolderOpen, Users,
  UserCircle, Settings, LogOut,
} from "lucide-react";
import { canDo, ROLE_LABELS, type Role, type DashboardAction } from "@/lib/permissions";
import { Logo } from "@/components/shared/Logo";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  action?: DashboardAction;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",       label: "Dashboard",    icon: <LayoutDashboard size={16} />, exact: true },
  { href: "/applications",    label: "Applications", icon: <FolderOpen size={16} />,      action: "view:applications" },
  { href: "/analytics",       label: "Analytics",    icon: <BarChart2 size={16} />,        action: "view:analytics" },
  { href: "/dashboard/users", label: "Users",        icon: <Users size={16} />,            action: "view:users" },
  { href: "/profile",         label: "My Profile",   icon: <UserCircle size={16} /> },
  { href: "/settings",        label: "Settings",     icon: <Settings size={16} />,         action: "view:settings" },
];

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const displayName = session?.user?.name ?? "User";

  const visibleLinks = NAV_ITEMS.filter(
    (item) => !item.action || canDo(role, item.action),
  );

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <aside className="surface hidden w-56 shrink-0 flex-col border-r p-4 md:flex">
      {/* Branding */}
      <div className="mb-3">
        <Logo size={26} textSize="text-sm" />
      </div>

      {/* Current user pill */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <span className={`role-badge role-${role} text-[10px]`}>
          {ROLE_LABELS[role as Role] ?? role}
        </span>
        <span className="text-muted truncate text-xs">{displayName}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {visibleLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
              isActive(item)
                ? "bg-[var(--primary)] font-medium text-white"
                : "hover:bg-[var(--surface-2)]"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Sign out */}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="text-muted mt-4 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition hover:bg-[var(--surface-2)] hover:text-red-600"
      >
        <LogOut size={16} />
        Sign out
      </button>
    </aside>
  );
}
