import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/serverAuth";
import { isEditor } from "@/lib/permissions";
import SiteHeader from "@/components/site/SiteHeader";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!isEditor(user?.role)) redirect("/me");

  return (
    <>
      <SiteHeader />
      <div className="flex min-h-screen pt-14">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-auto p-6 pb-20 md:pb-6">{children}</main>
      </div>
    </>
  );
}
