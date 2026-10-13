import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Settings } from "lucide-react";
import { getSessionUser } from "@/lib/serverAuth";
import WelcomeHeader from "@/components/portal/WelcomeHeader";
import GettingStarted from "@/components/portal/GettingStarted";
import TriagePanel from "@/components/portal/TriagePanel";
import JobHuntTodayCard from "@/components/jobs/JobHuntTodayCard";
import StatsGrid from "@/components/portal/StatsGrid";
import PortalRecentApplications from "@/components/portal/PortalRecentApplications";

export default async function MePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <WelcomeHeader user={{ id: user.id, role: user.role, plan: user.plan, status: user.status, email: user.email }} />
      <GettingStarted userId={user.id} />
      <JobHuntTodayCard />
      <TriagePanel />
      <StatsGrid />
      <PortalRecentApplications />

      <Link
        href="/me/settings"
        className="surface flex items-center gap-4 rounded-xl border p-4 transition hover:border-[var(--primary)] hover:shadow-sm"
      >
        <span className="icon-chip status-wishlist"><Settings size={16} aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">Account settings</span>
          <span className="text-muted block text-xs">Profile, password, accessibility, notifications, plan and data.</span>
        </span>
        <ChevronRight size={16} className="text-muted" aria-hidden="true" />
      </Link>
    </div>
  );
}
