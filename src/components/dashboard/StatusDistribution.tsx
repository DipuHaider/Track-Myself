"use client";

import {
  Bar, BarChart, CartesianGrid, LabelList,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { APPLICATION_STATUSES } from "@/constants/applicationStatus";
import { useAdminAnalytics } from "@/hooks/useAdminAnalytics";
import { useChartTheme } from "@/lib/chartTheme";
import ChartFrame from "./ChartFrame";

export default function StatusDistribution() {
  const { data, loading, failed } = useAdminAnalytics();
  const t = useChartTheme();

  const rows = APPLICATION_STATUSES
    .map((status) => ({ status, count: data?.statusCounts?.[status] ?? 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <ChartFrame
      title="Status Distribution"
      caption="Applications by current status"
      loading={loading}
      failed={failed}
      empty={rows.length === 0}
      emptyLabel="No applications to break down yet."
    >
      <div style={{ height: Math.max(224, rows.length * 26) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 34, bottom: 4, left: 4 }}
            barCategoryGap={4}
          >
            <CartesianGrid stroke={t.grid} horizontal={false} />
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="status"
              width={128}
              tick={{ fill: t.inkMuted, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: t.axis }}
            />
            <Tooltip
              cursor={{ fill: t.grid, fillOpacity: 0.35 }}
              contentStyle={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                color: t.ink,
                fontSize: 12,
              }}
              labelStyle={{ color: t.inkMuted }}
              formatter={(value) => [Number(value), "Applications"]}
            />
            <Bar dataKey="count" fill={t.series} radius={[0, 4, 4, 0]} maxBarSize={16}>
              <LabelList
                dataKey="count"
                position="right"
                style={{ fill: t.inkMuted, fontSize: 11 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
