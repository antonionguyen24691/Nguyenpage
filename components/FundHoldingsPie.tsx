"use client";

import React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type Holding = {
  stock_code: string;
  asset_type?: "equity" | "bond" | "cash" | "deposit" | "fund" | "other";
  weight: number;
  currentPrice?: number | null;
  monthAgoPrice?: number | null;
  monthChangePercent?: number | null;
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

function formatPrice(value: number | null | undefined) {
  return value === null || value === undefined ? "N/A" : value.toLocaleString("vi-VN");
}

function formatMonthChange(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "N/A";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function getAssetTypeLabel(value: Holding["asset_type"]) {
  switch (value) {
    case "bond":
      return "Trái phiếu";
    case "cash":
      return "Tiền mặt";
    case "deposit":
      return "Tiền gửi";
    case "fund":
      return "Quỹ / CCQ";
    case "other":
      return "Tài sản khác";
    default:
      return "Cổ phiếu";
  }
}

function formatAssetPrice(value: number | null | undefined, assetType: Holding["asset_type"]) {
  if (assetType && assetType !== "equity") {
    return "Không áp dụng";
  }

  return formatPrice(value);
}

function formatAssetChange(value: number | null | undefined, assetType: Holding["asset_type"]) {
  if (assetType && assetType !== "equity") {
    return "Không áp dụng";
  }

  return formatMonthChange(value);
}

export default function FundHoldingsPie({ data }: { data: Holding[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-[1.5rem] border border-dashed border-outline-variant/70 bg-surface-container-low px-6 text-sm text-on-surface-variant md:h-[420px]">
        Chưa có dữ liệu danh mục cho kỳ báo cáo đang chọn.
      </div>
    );
  }

  const topData = data.slice(0, 10).map((item) => ({
    ...item,
    weight: Number(item.weight),
  }));
  const othersWeight = data.slice(10).reduce((sum, item) => sum + Number(item.weight), 0);

  if (othersWeight > 0) {
    topData.push({
      stock_code: "Khác",
      asset_type: "other",
      weight: othersWeight,
      currentPrice: null,
      monthAgoPrice: null,
      monthChangePercent: null,
    });
  }

  return (
    <div className="space-y-6">
      <div className="relative mx-auto h-[260px] w-full max-w-[260px] sm:h-[280px] sm:max-w-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={topData}
              dataKey="weight"
              nameKey="stock_code"
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={104}
              paddingAngle={2}
              stroke="none"
            >
              {topData.map((entry, index) => (
                <Cell key={entry.stock_code} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${Number(value ?? 0).toFixed(2)}%`, "Tỷ trọng"]}
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
            Tổng tỷ trọng
          </span>
          <span className="mt-2 font-headline text-2xl font-extrabold text-on-surface">100%</span>
        </div>
      </div>

      <div>
        <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
          Top tỷ trọng hiện tại
        </div>
        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {topData.map((item, index) => (
            <div
              key={item.stock_code}
              className="rounded-[1.1rem] border border-outline-variant/40 bg-surface-container-low px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-on-surface">{item.stock_code}</div>
                      <span className="rounded-full border border-outline-variant/70 px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                        {getAssetTypeLabel(item.asset_type)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-on-surface-variant">Tỷ trọng hiện tại</div>
                  </div>
                </div>
                <div className="shrink-0 text-right text-lg font-extrabold text-on-surface">
                  {item.weight.toFixed(2)}%
                </div>
              </div>

              {item.stock_code !== "Khác" ? (
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/75 px-3 py-2">
                    <div className="text-xs text-on-surface-variant">Giá hiện tại</div>
                    <div className="mt-1 font-semibold text-on-surface">
                      {formatAssetPrice(item.currentPrice, item.asset_type)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/75 px-3 py-2">
                    <div className="text-xs text-on-surface-variant">Giá 1 tháng</div>
                    <div className="mt-1 font-semibold text-on-surface">
                      {formatAssetPrice(item.monthAgoPrice, item.asset_type)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/75 px-3 py-2">
                    <div className="text-xs text-on-surface-variant">Biến động 1 tháng</div>
                    <div
                      className={`mt-1 font-semibold ${
                        item.asset_type && item.asset_type !== "equity"
                          ? "text-on-surface-variant"
                          : item.monthChangePercent === null || item.monthChangePercent === undefined
                            ? "text-on-surface"
                            : item.monthChangePercent >= 0
                              ? "text-primary"
                              : "text-[var(--color-error)]"
                      }`}
                    >
                      {formatAssetChange(item.monthChangePercent, item.asset_type)}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
