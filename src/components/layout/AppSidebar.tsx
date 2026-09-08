"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import RoleAvatar from "@/components/shared/RoleAvatar";
import { ROLE_LABELS, type Role } from "@/lib/permissions";

export type AppNavItem = {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  mobileLabel: string;
  exact?: boolean;
  hideMobile?: boolean;
  badge?: { text: string; className: string; title?: string };
};

const COLLAPSE_EVENT = "app-sidebar-collapse";
const MOBILE_NAV_MAX = 5;

function subscribeCollapse(onChange: () => void) {
  window.addEventListener(COLLAPSE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(COLLAPSE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readCollapsed(storageKey: string) {
  try {
    return localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

export default function AppSidebar({
  items, title, storageKey, ariaLabel, signOutTo = "/",
}: {
  items: AppNavItem[];
  title: string;
  storageKey: string;
  ariaLabel: string;
  signOutTo?: string;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const sessionUser = session?.user as { role?: string; plan?: string; image?: string | null } | undefined;
  const name = session?.user?.name ?? "";
  const role = sessionUser?.role ?? "";

  const collapsed = useSyncExternalStore(
    subscribeCollapse,
    () => readCollapsed(storageKey),
    () => false,
  );

  const toggle = () => {
    try { localStorage.setItem(storageKey, collapsed ? "0" : "1"); } catch {}
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  };

  const isActive = (item: AppNavItem) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside
        aria-label={ariaLabel}
        className="glass-nav relative hidden shrink-0 flex-col border-r transition-[width] duration-300 md:flex"
        style={{ width: collapsed ? "3.5rem" : "14rem" }}
      >
        {/* Header */}
        <div className="flex h-14 items-center border-b px-3">
          {!collapsed && (
            <span className="flex-1 truncate text-sm font-semibold">{title}</span>
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
          <RoleAvatar
            name={name}
            image={sessionUser?.image ?? ""}
            role={role}
            plan={sessionUser?.plan}
            size={32}
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-xs" style={{ color: "var(--muted-foreground)" }}>
                {ROLE_LABELS[role as Role] ?? role}
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 p-2" aria-label={`${ariaLabel} menu`}>
          {items.map((item) => {
            const { href, icon: Icon, label, badge } = item;
            const active = isActive(item);
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
                <Icon size={16} className="shrink-0" />
                {!collapsed && (
                  <span className="flex flex-1 items-center gap-1.5 truncate">
                    {label}
                    {badge && (
                      <span
                        title={badge.title}
                        className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none ${
                          active ? "bg-white/25 text-white" : badge.className
                        }`}
                      >
                        {badge.text}
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
            onClick={() => signOut({ callbackUrl: signOutTo })}
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
        aria-label={ariaLabel}
        className="glass-nav fixed bottom-0 left-0 right-0 z-40 flex border-t md:hidden"
      >
        {items.filter((n) => !n.hideMobile).slice(0, MOBILE_NAV_MAX).map((item) => {
          const { href, icon: Icon, mobileLabel } = item;
          const active = isActive(item);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition ${
                active ? "text-[var(--primary)]" : "text-muted"
              }`}
            >
              <Icon size={19} />
              <span>{mobileLabel}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
