"use client";

import { useSession } from "next-auth/react";
import {
  Briefcase, FileText, FolderOpen, Home,
  LayoutDashboard, Wrench,
} from "lucide-react";
import AppSidebar, { type AppNavItem } from "@/components/layout/AppSidebar";
import { isPremiumUser } from "@/lib/permissions";

export default function PortalSidebar() {
  const { data: session } = useSession();
  const sessionUser = session?.user as { role?: string; plan?: string } | undefined;
  const isPremium = isPremiumUser(sessionUser?.role, sessionUser?.plan);

  const proBadge = isPremium
    ? { text: "PRO", className: "bg-emerald-400/20 text-emerald-600", title: "Included in your Premium plan" }
    : { text: "Get Pro", className: "bg-amber-400/20 text-amber-600", title: "Premium features inside" };

  const items: AppNavItem[] = [
    { href: "/me",              icon: LayoutDashboard, label: "Overview",        mobileLabel: "Home",    exact: true },
    { href: "/me/applications", icon: Briefcase,       label: "My Applications", mobileLabel: "My Apps" },
    { href: "/me/my-cv",        icon: FolderOpen,      label: "My Documents",    mobileLabel: "Docs" },
    { href: "/me/cv",           icon: FileText,        label: "CV Builder",      mobileLabel: "Builder", badge: proBadge },
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
