import dbConnect from "@/lib/db";
import Application from "@/models/Application";
import StatCard from "@/components/dashboard/StatCard";
import ApplicationsChart from "@/components/dashboard/ApplicationsChart";
import FunnelChart from "@/components/dashboard/FunnelChart";
import StatusDistribution from "@/components/dashboard/StatusDistribution";
import RecentApplications from "@/components/dashboard/RecentApplications";
import UserStatsSection from "@/components/dashboard/UserStatsSection";

const INTERVIEW_STATUSES = [
  "Interview Scheduled",
  "Active - Written",
  "Active - HR",
  "Active - Technical",
  "Active - Cultural Fit",
];

async function getAppStats() {
  await dbConnect();
  const [total, interviews, offers, rejected] = await Promise.all([
    Application.countDocuments(),
    Application.countDocuments({ applicationStatus: { $in: INTERVIEW_STATUSES } }),
    Application.countDocuments({ applicationStatus: "Offer Received" }),
    Application.countDocuments({ applicationStatus: "Rejected" }),
  ]);
  return { total, interviews, offers, rejected };
}

export default async function DashboardPage() {
  const stats = await getAppStats();

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Applications" value={stats.total} />
        <StatCard title="Interviews"         value={stats.interviews} />
        <StatCard title="Offers"             value={stats.offers} />
        <StatCard title="Rejections"         value={stats.rejected} />
      </section>

      <ApplicationsChart />

      <section className="grid gap-4 lg:grid-cols-2">
        <FunnelChart />
        <StatusDistribution />
      </section>

      <RecentApplications />

      <UserStatsSection />
    </div>
  );
}
