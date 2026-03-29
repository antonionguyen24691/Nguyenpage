"use client";

import type { HoldingsComparisonRow } from "@/lib/fundAnalytics";

type Props = {
  dates: string[];
  rows: HoldingsComparisonRow[];
};

function formatWeight(value: number | null) {
  return value === null ? "--" : `${value.toFixed(2)}%`;
}

function formatPrice(value: number | null, assetType: HoldingsComparisonRow["asset_type"]) {
  if (assetType !== "equity") {
    return "Không áp dụng";
  }

  return value === null ? "N/A" : value.toLocaleString("vi-VN");
}

function formatPercent(value: number | null, assetType: HoldingsComparisonRow["asset_type"]) {
  if (assetType !== "equity") {
    return "Không áp dụng";
  }

  return value === null ? "N/A" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function getAssetTypeLabel(value: HoldingsComparisonRow["asset_type"]) {
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

export default function HoldingsComparisonTable({ dates, rows }: Props) {
  if (!dates.length || !rows.length) {
    return (
        <div className="rounded-[1.5rem] border border-dashed border-outline-variant/80 bg-white/70 p-6 text-sm text-on-surface-variant">
        Chưa có dữ liệu để so sánh T, T-1, T-2, T-3.
        </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/80">
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div
            className="grid gap-3 border-b border-outline-variant/40 px-4 py-4 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant md:px-5"
            style={{ gridTemplateColumns: `1.45fr repeat(${dates.length}, 0.78fr) 0.85fr 0.95fr 0.95fr 0.9fr` }}
          >
            <span>Mã / loại</span>
            {dates.map((date, index) => (
              <span key={date}>{index === 0 ? "T" : `T-${index}`}</span>
            ))}
            <span>Chênh lệch</span>
            <span>Giá hiện tại</span>
            <span>Giá 1 tháng</span>
            <span>+/- 1M</span>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {rows.slice(0, 20).map((row) => (
              <div
                key={row.stock_code}
                className="grid gap-3 border-b border-outline-variant/20 px-4 py-4 text-sm text-on-surface last:border-b-0 md:px-5"
                style={{ gridTemplateColumns: `1.45fr repeat(${dates.length}, 0.78fr) 0.85fr 0.95fr 0.95fr 0.9fr` }}
              >
                <div className="min-w-0">
                  <div className="font-semibold">{row.stock_code}</div>
                  <div className="mt-1">
                    <span className="rounded-full border border-outline-variant/70 px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                      {getAssetTypeLabel(row.asset_type)}
                    </span>
                  </div>
                </div>
                {row.weights.map((weight, index) => (
                  <span key={`${row.stock_code}-${dates[index]}`}>{formatWeight(weight)}</span>
                ))}
                <span
                  className={
                    row.changeVsPrevious === null
                      ? "text-on-surface-variant"
                      : row.changeVsPrevious >= 0
                        ? "text-primary"
                        : "text-[var(--color-error)]"
                  }
                >
                  {row.changeVsPrevious === null
                    ? "--"
                    : `${row.changeVsPrevious >= 0 ? "+" : ""}${row.changeVsPrevious.toFixed(2)}%`}
                </span>
                <span>{formatPrice(row.currentPrice, row.asset_type)}</span>
                <span>{formatPrice(row.monthAgoPrice, row.asset_type)}</span>
                <span
                  className={
                    row.asset_type !== "equity"
                      ? "text-on-surface-variant"
                      : row.monthChangePercent === null
                        ? "text-on-surface-variant"
                        : row.monthChangePercent >= 0
                          ? "text-primary"
                          : "text-[var(--color-error)]"
                  }
                >
                  {formatPercent(row.monthChangePercent, row.asset_type)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
