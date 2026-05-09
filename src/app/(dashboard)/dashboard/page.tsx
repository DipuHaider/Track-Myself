import StatCard from "@/components/dashboard/StatCard";
import ApplicationsChart from "@/components/dashboard/ApplicationsChart";
import StatusDistribution from "@/components/dashboard/StatusDistribution";
import RecentApplications from "@/components/dashboard/RecentApplications";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Applications" value={0} />
        <StatCard title="Interviews" value={0} />
        <StatCard title="Offers" value={0} />
        <StatCard title="Rejections" value={0} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ApplicationsChart />
        <StatusDistribution />
      </section>

      <RecentApplications />
    </div>
  );
}
