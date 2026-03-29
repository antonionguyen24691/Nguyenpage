"use client";

import React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type Holding = {
  stock_code: string;
  weight: number;
};

const COLORS = [
  "#0c7a69",
  "#1f4db7",
  "#b86f31",
  "#c73a3a",
  "#7c3aed",
  "#ec4899",
  "#0ea5e9",
  "#10b981",
  "#6366f1",
  "#f59e0b",
  "#94a3b8",
];

export default function FundHoldingsPie({ data }: { data: Holding[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-[1.5rem] border border-dashed border-outline-variant/70 bg-surface-container-low text-sm text-on-surface-variant md:h-[420px]">
        Chua co du lieu danh muc cho ky bao cao dang chon.
      </div>
    );
  }

  const topData = data.slice(0, 10).map((item) => ({
    ...item,
    weight: Number(item.weight),
  }));
  const othersWeight = data.slice(10).reduce((sum, item) => sum + Number(item.weight), 0);

  if (othersWeight > 0) {
    topData.push({ stock_code: "Khac", weight: othersWeight });
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="relative h-[280px] w-full sm:h-[320px] lg:w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={topData}
              dataKey="weight"
              nameKey="stock_code"
              cx="50%"
              cy="50%"
              innerRadius={64}
              outerRadius={104}
              paddingAngle={2}
              stroke="none"
            >
              {topData.map((entry, index) => (
                <Cell key={entry.stock_code} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${Number(value ?? 0).toFixed(2)}%`, "Ty trong"]}
              contentStyle={{
                borderRadius: "16px",
                border: "1px solid rgba(215,223,234,0.9)",
                boxShadow: "0 16px 34px rgba(16,32,51,0.08)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
            Tong ty trong
          </span>
          <span className="mt-2 font-headline text-2xl font-extrabold text-on-surface">100%</span>
        </div>
      </div>

      <div className="w-full lg:w-1/2">
        <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
          Top holdings
        </div>
        <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
          {topData.map((item, index) => (
            <div
              key={item.stock_code}
              className="flex items-center gap-3 rounded-[1.1rem] border border-outline-variant/40 bg-surface-container-low px-4 py-3"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-on-surface">{item.stock_code}</div>
              </div>
              <span className="shrink-0 text-sm font-semibold text-on-surface-variant">
                {item.weight.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
