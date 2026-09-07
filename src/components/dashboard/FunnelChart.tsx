"use client";

import {
  Bar, BarChart, Cell, LabelList,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAdminAnalytics } from "@/hooks/useAdminAnalytics";
import { useChartTheme } from "@/lib/chartTheme";
import ChartFrame from "./ChartFrame";

export default function FunnelChart() {
  const { data, loading, failed } = useAdminAnalytics();
  const t = useChartTheme();

  const stages = data?.funnel ?? [];
  const top = stages[0]?.count ?? 0;

  const rows = stages.map((s) => ({
    ...s,
    share: top ? Math.round((s.count / top) * 100) : 0,
  }));

  return (
    <ChartFrame
      title="Conversion Funnel"
      caption="Tracked → applied → interviewing → offer, across all users"
      loading={loading}
      failed={failed}
      empty={top === 0}
      emptyLabel="No applications tracked yet."
    >
      <div style={{ height: 224 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 72, bottom: 4, left: 4 }}
            barCategoryGap={6}
          >
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="stage"
              width={86}
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
              formatter={(value, _name, entry) => [
                `${Number(value)} · ${(entry?.payload as { share?: number } | undefined)?.share ?? 0}% of tracked`,
                "Applications",
              ]}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {rows.map((row, i) => (
                <Cell key={row.stage} fill={t.ordinal[Math.min(i, t.ordinal.length - 1)]} />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                formatter={(value) =>
                  `${Number(value)}${top ? ` (${Math.round((Number(value) / top) * 100)}%)` : ""}`
                }
                style={{ fill: t.inkMuted, fontSize: 11 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
