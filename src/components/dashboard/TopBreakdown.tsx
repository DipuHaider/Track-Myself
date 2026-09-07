"use client";

import {
  Bar, BarChart, CartesianGrid, LabelList,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useChartTheme } from "@/lib/chartTheme";
import ChartFrame from "./ChartFrame";

export default function TopBreakdown({
  title, caption, rows, loading, failed, emptyLabel,
}: {
  title: string;
  caption: string;
  rows: { name: string; count: number }[];
  loading: boolean;
  failed: boolean;
  emptyLabel: string;
}) {
  const t = useChartTheme();

  return (
    <ChartFrame
      title={title}
      caption={caption}
      loading={loading}
      failed={failed}
      empty={rows.length === 0}
      emptyLabel={emptyLabel}
    >
      <div style={{ height: Math.max(200, rows.length * 28) }}>
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
              dataKey="name"
              width={132}
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
