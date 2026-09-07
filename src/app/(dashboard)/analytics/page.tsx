"use client";

import { Ghost, Briefcase, MessageSquare, Send, Trophy, Users, XCircle } from "lucide-react";
import ApplicationsChart from "@/components/dashboard/ApplicationsChart";
import FunnelChart from "@/components/dashboard/FunnelChart";
import StatusDistribution from "@/components/dashboard/StatusDistribution";
import TopBreakdown from "@/components/dashboard/TopBreakdown";
import { useAdminAnalytics } from "@/hooks/useAdminAnalytics";
import PermissionGate from "@/components/dashboard/PermissionGate";

function StatTile({ label, value, hint, icon }: {
  label: string; value: string; hint?: string; icon: React.ReactNode;
}) {
  return (
    <article className="surface rounded-lg border p-4">
      <div className="text-muted flex items-center gap-2 text-sm">
        <span aria-hidden="true">{icon}</span>
        {label}
      </div>
      <p className="text-primary mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="text-muted mt-0.5 text-xs">{hint}</p>}
    </article>
  );
}

function AnalyticsContent() {
  const { data, loading, failed } = useAdminAnalytics();
  const t = data?.totals;

  const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "—");

  const TILES = [
    { label: "Applications", value: t ? String(t.applications) : "—", hint: `${t?.activeUsers ?? 0} of ${t?.users ?? 0} users tracking`, icon: <Briefcase size={15} /> },
    { label: "Applied",      value: t ? String(t.applied) : "—",      hint: t ? `${pct(t.applied, t.applications)} of tracked` : undefined, icon: <Send size={15} /> },
    { label: "Interviews",   value: t ? String(t.interviews) : "—",   hint: t ? `${pct(t.interviews, t.applied)} of applied` : undefined, icon: <MessageSquare size={15} /> },
    { label: "Offers",       value: t ? String(t.offers) : "—",       hint: t ? `${pct(t.offers, t.applied)} of applied` : undefined, icon: <Trophy size={15} /> },
    { label: "Rejections",   value: t ? String(t.rejected) : "—",     hint: t ? `${pct(t.rejected, t.applied)} of applied` : undefined, icon: <XCircle size={15} /> },
    { label: "Possible ghosts", value: t ? String(t.ghosts) : "—",    hint: "45+ days, no movement", icon: <Ghost size={15} /> },
    { label: "Users",        value: t ? String(t.users) : "—",        hint: `${t?.activeUsers ?? 0} active`, icon: <Users size={15} /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Analytics</h2>
        <p className="text-muted mt-1 text-sm">
          Status trends, funnel conversion, and sourcing insights across every tracked application.
        </p>
      </div>

      {failed && (
        <p className="surface rounded-lg border p-4 text-sm text-red-600">
          Could not load analytics. Please refresh and try again.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((tile) => <StatTile key={tile.label} {...tile} />)}
      </section>

      <ApplicationsChart />

      <section className="grid gap-4 lg:grid-cols-2">
        <FunnelChart />
        <StatusDistribution />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TopBreakdown
          title="Top Companies"
          caption="Most-applied-to companies"
          rows={data?.topCompanies ?? []}
          loading={loading}
          failed={failed}
          emptyLabel="No companies tracked yet."
        />
        <TopBreakdown
          title="Top Platforms"
          caption="Where applications are sourced from"
          rows={data?.topPlatforms ?? []}
          loading={loading}
          failed={failed}
          emptyLabel="No platform data yet."
        />
      </section>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <PermissionGate action="view:analytics">
      <AnalyticsContent />
    </PermissionGate>
  );
}
