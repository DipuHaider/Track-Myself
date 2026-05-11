import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import SiteHeader from "@/components/site/SiteHeader";
import PortalSidebar from "@/components/portal/PortalSidebar";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions as any);
  if (!session) redirect("/login");

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
