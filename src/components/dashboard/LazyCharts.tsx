"use client";

import dynamic from "next/dynamic";

function ChartSkeleton() {
  return (
    <section className="glass rounded-lg p-4" aria-busy="true" aria-label="Loading chart">
      <div className="mb-3 space-y-1.5">
        <div className="surface-muted h-4 w-40 animate-pulse rounded" />
        <div className="surface-muted h-3 w-64 animate-pulse rounded" />
      </div>
      <div className="surface-muted h-56 animate-pulse rounded" />
    </section>
  );
}

/* next/dynamic needs a literal options object at each call site. */
export const ApplicationsChart = dynamic(() => import("./ApplicationsChart"), { ssr: false, loading: () => <ChartSkeleton /> });
export const FunnelChart = dynamic(() => import("./FunnelChart"), { ssr: false, loading: () => <ChartSkeleton /> });
export const StatusDistribution = dynamic(() => import("./StatusDistribution"), { ssr: false, loading: () => <ChartSkeleton /> });
export const TopBreakdown = dynamic(() => import("./TopBreakdown"), { ssr: false, loading: () => <ChartSkeleton /> });
