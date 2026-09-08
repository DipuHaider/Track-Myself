"use client";

import { useSession } from "next-auth/react";
import {
  BarChart2, FolderOpen, Home, LayoutDashboard,
  ScrollText, Settings, ShieldCheck, UserCircle, Users,
} from "lucide-react";
import AppSidebar, { type AppNavItem } from "@/components/layout/AppSidebar";
import { usePermissions } from "@/hooks/usePermissions";
import { isAdmin, type DashboardAction } from "@/lib/permissions";

type DashboardNavItem = AppNavItem & { action?: DashboardAction; adminOnly?: boolean };

const NAV_ITEMS: DashboardNavItem[] = [
  { href: "/dashboard",       icon: LayoutDashboard, label: "Dashboard",        mobileLabel: "Home",   exact: true },
  { href: "/applications",    icon: FolderOpen,      label: "All Applications", mobileLabel: "Apps",   action: "view:applications" },
  { href: "/analytics",       icon: BarChart2,       label: "Analytics",        mobileLabel: "Stats",  action: "view:analytics" },
  { href: "/dashboard/cv",    icon: ScrollText,      label: "CV Overview",      mobileLabel: "CV",     action: "view:cv" },
  { href: "/dashboard/users", icon: Users,           label: "Users",            mobileLabel: "Users",  action: "view:users" },
  { href: "/dashboard/rbac",  icon: ShieldCheck,     label: "Access Control",   mobileLabel: "Access", adminOnly: true, hideMobile: true },
  { href: "/settings",        icon: Settings,        label: "Settings",         mobileLabel: "Setup",  action: "view:settings", hideMobile: true },
  { href: "/me",              icon: UserCircle,      label: "My Profile",       mobileLabel: "Me",     exact: true, hideMobile: true },
  { href: "/",                icon: Home,            label: "Home",             mobileLabel: "Home",   exact: true, hideMobile: true },
];

export default function Sidebar() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const { can } = usePermissions();

  const items = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin(role)) return false;
    return !item.action || can(item.action);
  });

  return (
    <AppSidebar
      items={items}
      title="Dashboard"
      storageKey="dashboard-sidebar"
      ariaLabel="Dashboard navigation"
      signOutTo="/login"
    />
  );
}
