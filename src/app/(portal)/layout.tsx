import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import SiteHeader from "@/components/site/SiteHeader";
import PortalSidebar from "@/components/portal/PortalSidebar";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions as any);
  if (!session) redirect("/login");

  // Admin/editor belong in the dashboard, not the portal
  const role = (session as { user?: { role?: string } } | null)?.user?.role;
  if (role === "admin" || role === "editor") redirect("/dashboard");

  return (
    <>
      <SiteHeader />
      <div className="flex min-h-screen pt-14">
        <PortalSidebar />
        <main className="min-w-0 flex-1 overflow-auto p-6">{children}</main>
      </div>
    </>
  );
}
