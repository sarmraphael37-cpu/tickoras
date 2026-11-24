"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactNumber, formatXAF } from "@/lib/utils";

const GRID = "#263B56";
const AXIS = "#94A3B8";
const PRIMARY = "#3B82F6";
const PRIMARY_DEEP = "#2563EB";
const INFO = "#38BDF8";

const tooltipStyle = {
  borderRadius: 10,
  border: `1px solid ${GRID}`,
  background: "#11243D",
  color: "#F8FAFC",
  fontSize: 12,
  boxShadow: "0 24px 60px -28px rgba(0,0,0,0.8)",
};

export function RevenueAreaChart({
  data,
  height = 230,
}: {
  data: Array<{ label: string; revenue: number; orders?: number }>;
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[230px] items-center justify-center rounded-lg border border-dashed border-line bg-surface text-[12px] text-muted">
        Revenue will appear here after your first confirmed booking.
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="tickoraRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.3} />
              <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: AXIS }}
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: AXIS }}
            tickFormatter={(value: number) => formatCompactNumber(value)}
            width={54}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: "#F8FAFC", marginBottom: 4 }}
            itemStyle={{ color: "#DBEAFE" }}
            formatter={(value: number | string) => [formatXAF(Number(value)), "Revenue"]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={PRIMARY}
            strokeWidth={2}
            fill="url(#tickoraRevenue)"
            activeDot={{ r: 4, fill: INFO, stroke: "#071426", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PopularBarChart({
  data,
  height = 230,
  color = PRIMARY_DEEP,
}: {
  data: Array<{ name: string; value: number }>;
  height?: number;
  color?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[230px] items-center justify-center rounded-lg border border-dashed border-line bg-surface text-[12px] text-muted">
        No data yet.
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 6, bottom: 4 }}
        >
          <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="3 3" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: AXIS }}
            tickFormatter={(value: number) => formatCompactNumber(value)}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={112}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: AXIS }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: "#F8FAFC", marginBottom: 4 }}
            itemStyle={{ color: "#DBEAFE" }}
            formatter={(value: number | string) => [formatXAF(Number(value)), "Revenue"]}
          />
          <Bar dataKey="value" fill={color} radius={[0, 5, 5, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
