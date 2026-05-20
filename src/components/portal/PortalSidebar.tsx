"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Home,
  LogOut,
  User,
  Briefcase,
  Wrench,
  FileText,
} from "lucide-react";

const NAV = [
  { href: "/me",              icon: LayoutDashboard, label: "Overview",     premium: false },
  { href: "/me/applications", icon: Briefcase,       label: "Applications", premium: false },
  { href: "/me/cv",           icon: FileText,        label: "CV Builder",   premium: true  },
  { href: "/tools",           icon: Wrench,          label: "Tools",        premium: false },
  { href: "/",                icon: Home,            label: "Home",         premium: false },
];

export default function PortalSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const name = session?.user?.name ?? "";
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("portal-sidebar");
      if (saved !== null) setCollapsed(saved === "1");
    } catch {}
  }, []);

  const toggle = () =>
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("portal-sidebar", next ? "1" : "0"); } catch {}
      return next;
    });

  return (
    <aside
      className="surface relative flex shrink-0 flex-col border-r transition-[width] duration-300"
      style={{ width: collapsed ? "3.5rem" : "14rem" }}
    >
      {/* Header */}
      <div className="flex h-14 items-center border-b px-3">
        {!collapsed && (
          <span className="flex-1 overflow-hidden truncate text-sm font-semibold">
            TrackMyself
          </span>
        )}
        <button
          onClick={toggle}
          className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition hover:bg-[var(--surface-2)]"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* User avatar */}
      <div className={`flex items-center gap-3 border-b px-3 py-3 ${collapsed ? "justify-center" : ""}`}>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: "var(--primary)" }}
        >
          {name[0]?.toUpperCase() ?? <User size={14} />}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs capitalize" style={{ color: "var(--muted-foreground)" }}>
              {role}
            </p>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5 p-2">
        {NAV.map(({ href, icon: Icon, label, premium }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center rounded-md px-2 py-2 text-sm transition ${
                collapsed ? "justify-center" : "gap-3"
              } ${
                active
                  ? "btn-primary font-medium"
                  : "hover:bg-[var(--surface-2)]"
              }`}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && (
                <span className="flex flex-1 items-center gap-1.5 truncate">
                  {label}
                  {premium && !active && (
                    <span className="ml-auto rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold leading-none text-amber-600">
                      PRO
                    </span>
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="border-t p-2">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          title={collapsed ? "Sign out" : undefined}
          className={`flex w-full items-center rounded-md px-2 py-2 text-sm text-red-500 transition hover:bg-red-50 ${
            collapsed ? "justify-center" : "gap-3"
          }`}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
