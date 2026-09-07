"use client";

import {
  CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { useAdminAnalytics } from "@/hooks/useAdminAnalytics";
import { useChartTheme } from "@/lib/chartTheme";
import ChartFrame from "./ChartFrame";

export default function ApplicationsChart() {
  const { data, loading, failed } = useAdminAnalytics();
  const t = useChartTheme();

  const trend = data?.trend ?? [];
  const empty = trend.every((p) => p.count === 0);

  return (
    <ChartFrame
      title="Applications Trend"
      caption="New applications tracked per month, last 12 months"
      loading={loading}
      failed={failed}
      empty={empty}
      emptyLabel="No applications tracked in the last 12 months."
    >
      <div style={{ height: 224 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
            <CartesianGrid stroke={t.grid} strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: t.inkMuted, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: t.axis }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: t.inkMuted, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={44}
            />
            <Tooltip
              cursor={{ stroke: t.axis, strokeWidth: 1 }}
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
            <Line
              type="monotone"
              dataKey="count"
              stroke={t.series}
              strokeWidth={2}
              dot={{ r: 3, fill: t.series, stroke: t.surface, strokeWidth: 2 }}
              activeDot={{ r: 5, fill: t.series, stroke: t.surface, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
