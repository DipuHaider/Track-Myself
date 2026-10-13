"use client";

import { useSession } from "next-auth/react";
import {
  Briefcase, Crown, FileText, FolderOpen, Home,
  Bell, KeyRound, LayoutDashboard, LifeBuoy, ListTodo, Radar, Settings, Wrench,
} from "lucide-react";
import AppSidebar, { type AppNavItem } from "@/components/layout/AppSidebar";
import { canUseJobHunt, isPremiumUser } from "@/lib/permissions";

export default function PortalSidebar() {
  const { data: session } = useSession();
  const sessionUser = session?.user as { role?: string; plan?: string } | undefined;
  const isPremium = isPremiumUser(sessionUser?.role, sessionUser?.plan);

  const proBadge = isPremium
    ? { text: "PRO", className: "plan-premium", title: "Included in your Premium plan" }
    : { text: "Get Pro", className: "plan-premium", title: "Premium features inside" };

  const items: AppNavItem[] = [
    { href: "/me",              icon: LayoutDashboard, label: "Overview",        mobileLabel: "Home",    exact: true },
    ...(canUseJobHunt(sessionUser?.role, sessionUser?.plan, true)
      ? [{ href: "/me/jobs", icon: Radar, label: "Job hunt", mobileLabel: "Jobs" } satisfies AppNavItem]
      : []),
    { href: "/me/applications", icon: Briefcase,       label: "My Applications", mobileLabel: "My Apps" },
    { href: "/me/my-cv",        icon: FolderOpen,      label: "My Documents",    mobileLabel: "Docs" },
    { href: "/me/cv",           icon: FileText,        label: "CV Builder",      mobileLabel: "Builder", badge: proBadge },
    { href: "/me/todos",        icon: ListTodo,        label: "To-Do list",      mobileLabel: "To-Do" },
    { href: "/me/ai-key",       icon: KeyRound,        label: "AI key",          mobileLabel: "AI" },
    { href: "/me/notifications", icon: Bell,          label: "Notifications",   mobileLabel: "Alerts", hideMobile: true },
    { href: "/me/issues",       icon: LifeBuoy,        label: "My Reported Issues", mobileLabel: "Reports", hideMobile: true },
    { href: "/me/settings",     icon: Settings,        label: "Settings",        mobileLabel: "Settings", hideMobile: true },
    ...(!isPremium
      ? [{ href: "/pricing", icon: Crown, label: "Upgrade", mobileLabel: "Upgrade", hideMobile: true, badge: { text: "Premium", className: "plan-premium", title: "See what Premium includes" } } satisfies AppNavItem]
      : []),
    { href: "/tools",           icon: Wrench,          label: "Tools",           mobileLabel: "Tools" },
    { href: "/",                icon: Home,            label: "Home",            mobileLabel: "Home",    exact: true, hideMobile: true },
  ];

  return (
    <AppSidebar
      items={items}
      title="My Profile"
      storageKey="portal-sidebar"
      ariaLabel="Portal navigation"
    />
  );
}
