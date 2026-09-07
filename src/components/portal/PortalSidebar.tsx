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
  ScrollText,
  FolderOpen,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { isPremiumUser } from "@/lib/permissions";

const NAV = [
  { href: "/me",              icon: LayoutDashboard, label: "Overview",     mobileLabel: "Home",    premium: false, hideMobile: false, exact: true  },
  { href: "/me/applications", icon: Briefcase,       label: "Applications", mobileLabel: "Apps",    premium: false, hideMobile: false, exact: false },
  { href: "/me/my-cv",        icon: FolderOpen,      label: "My Documents", mobileLabel: "Docs",    premium: false, hideMobile: false, exact: false },
  { href: "/me/cv",           icon: FileText,        label: "CV Builder",   mobileLabel: "Builder", premium: true,  hideMobile: false, exact: false },
  { href: "/tools",           icon: Wrench,          label: "Tools",        mobileLabel: "Tools",   premium: false, hideMobile: false, exact: false },
  { href: "/",                icon: Home,            label: "Home",         mobileLabel: "Home",    premium: false, hideMobile: true,  exact: true  },
];

export default function PortalSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const name = session?.user?.name ?? "";
  const sessionUser = session?.user as { role?: string; plan?: string } | undefined;
  const role = sessionUser?.role ?? "";
  const isPremium = isPremiumUser(role, sessionUser?.plan);

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
    <>
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside
        aria-label="Portal navigation"
        className="surface relative hidden shrink-0 flex-col border-r transition-[width] duration-300 md:flex"
        style={{ width: collapsed ? "3.5rem" : "14rem" }}
      >
        {/* Header */}
        <div className="flex h-14 items-center border-b px-3">
          {!collapsed && (
            <span className="flex-1 overflow-hidden">
              <Logo size={22} textSize="text-sm" />
            </span>
          )}
          <button
            type="button"
            onClick={toggle}
            className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition hover:bg-[var(--surface-2)]"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={15} aria-hidden="true" /> : <ChevronLeft size={15} aria-hidden="true" />}
          </button>
        </div>

        {/* User */}
        <div className={`flex items-center gap-3 border-b px-3 py-3 ${collapsed ? "justify-center" : ""}`}>
          <div
            aria-hidden="true"
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

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 p-2" aria-label="Portal menu">
          {NAV.map(({ href, icon: Icon, label, premium, exact }) => {
            const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                title={collapsed ? label : undefined}
                className={`flex items-center rounded-md px-2 py-2 text-sm transition ${
                  collapsed ? "justify-center" : "gap-3"
                } ${active ? "btn-primary font-medium" : "hover:bg-[var(--surface-2)]"}`}
              >
                <Icon size={16} className="shrink-0" aria-hidden="true" />
                {!collapsed && (
                  <span className="flex flex-1 items-center gap-1.5 truncate">
                    {label}
                    {premium && (
                      <span
                        title={isPremium ? "Included in your Premium plan" : "Premium features inside"}
                        className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none ${
                          active
                            ? "bg-white/25 text-white"
                            : isPremium
                              ? "bg-emerald-400/20 text-emerald-600"
                              : "bg-amber-400/20 text-amber-600"
                        }`}
                      >
                        {isPremium ? "PRO" : "Get Pro"}
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
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            aria-label={collapsed ? "Sign out" : undefined}
            className={`flex w-full items-center rounded-md px-2 py-2 text-sm text-red-500 transition hover:bg-red-50 ${
              collapsed ? "justify-center" : "gap-3"
            }`}
          >
            <LogOut size={16} className="shrink-0" aria-hidden="true" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav (visible only on mobile) ── */}
      <nav
        aria-label="Portal navigation"
        className="surface fixed bottom-0 left-0 right-0 z-40 flex border-t md:hidden"
      >
        {NAV.filter((n) => !n.hideMobile).map(({ href, icon: Icon, label, mobileLabel, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition ${
                active ? "text-[var(--primary)]" : "text-muted"
              }`}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{mobileLabel}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
