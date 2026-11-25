"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatXAF } from "@/lib/utils";

const AXIS = { fontSize: 10, fill: "#8a8578" } as const;
const GRID = "#e8e4da";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-card px-3 py-2 text-[11px] shadow-card">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color ?? "#1d4ed8" }}>
          {p.name}: {formatXAF(p.value)}
        </p>
      ))}
    </div>
  );
}

export function RevenueExpenseChart({
  data,
}: {
  data: Array<{ date: string; revenue: number; expenses: number }>;
}) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-[12px] text-muted">
        No financial activity in this period yet.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dc2626" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#dc2626" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#1d4ed8" fill="url(#rev)" strokeWidth={2} />
        <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#dc2626" fill="url(#exp)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = ["#1d4ed8", "#2b9f7e", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#be185d", "#65a30d", "#9333ea", "#64748b"];

export function ExpenseDonut({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-[12px] text-muted">
        No expenses recorded in this period.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) =>
            active && payload?.[0] ? (
              <div className="rounded-lg border border-line bg-card px-3 py-2 text-[11px] shadow-card">
                <p className="font-semibold text-ink">{payload[0].name}</p>
                <p className="text-muted">{formatXAF(Number(payload[0].value))}</p>
              </div>
            ) : null
          }
        />
        <Legend wrapperStyle={{ fontSize: 10 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function EventProfitChart({
  data,
}: {
  data: Array<{ title: string; revenue: number; expenses: number; profit: number }>;
}) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-[12px] text-muted">
        No event financials in this period.
      </p>
    );
  }
  const trimmed = data.slice(0, 8).map((d) => ({
    ...d,
    title: d.title.length > 18 ? `${d.title.slice(0, 18)}…` : d.title,
  }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, trimmed.length * 44)}>
      <BarChart data={trimmed} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
        <YAxis type="category" dataKey="title" tick={AXIS} tickLine={false} axisLine={false} width={110} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="revenue" name="Revenue" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
        <Bar dataKey="expenses" name="Expenses" fill="#dc2626" radius={[0, 4, 4, 0]} />
        <Bar dataKey="profit" name="Profit" fill="#2b9f7e" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
