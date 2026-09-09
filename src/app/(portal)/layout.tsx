import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/serverAuth";
import SiteHeader from "@/components/site/SiteHeader";
import PortalSidebar from "@/components/portal/PortalSidebar";
import PausedBanner from "@/components/portal/PausedBanner";
import { NOINDEX } from "@/lib/seo";

export const metadata = NOINDEX;

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <>
      <SiteHeader />
      <div className="flex min-h-screen pt-14">
        <PortalSidebar />
        <main className="pb-mobile-nav min-w-0 flex-1 overflow-auto p-6">
          <PausedBanner />
          {children}
        </main>
      </div>
    </>
  );
}
