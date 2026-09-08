import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/serverAuth";
import { isEditor } from "@/lib/permissions";
import SiteHeader from "@/components/site/SiteHeader";
import MobileNav from "@/components/layout/MobileNav";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!isEditor(user?.role)) redirect("/me");

  return (
    <>
      <SiteHeader />
      <div className="flex min-h-screen pt-14">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileNav />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </>
  );
}
