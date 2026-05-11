import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions as any);
  const role = (session as { user?: { role?: string } } | null)?.user?.role;

  if (!session || (role !== "superadmin" && role !== "admin" && role !== "editor")) {
    redirect("/me");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
