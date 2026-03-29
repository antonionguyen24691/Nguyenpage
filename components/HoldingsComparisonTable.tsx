"use client";

import type { HoldingsComparisonRow } from "@/lib/fundAnalytics";

type Props = {
  dates: string[];
  rows: HoldingsComparisonRow[];
};

function formatWeight(value: number | null) {
  return value === null ? "--" : `${value.toFixed(2)}%`;
}

function formatPrice(value: number | null) {
  return value === null ? "N/A" : value.toLocaleString("vi-VN");
}

function formatPercent(value: number | null) {
  return value === null ? "N/A" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function HoldingsComparisonTable({ dates, rows }: Props) {
  if (!dates.length || !rows.length) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-outline-variant/80 bg-white/70 p-6 text-sm text-on-surface-variant">
        Chưa có đủ dữ liệu để so sánh T, T-1, T-2, T-3.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/80">
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div
            className="grid gap-3 border-b border-outline-variant/40 px-4 py-4 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant md:px-5"
            style={{ gridTemplateColumns: `1.1fr repeat(${dates.length}, 0.75fr) 0.8fr 0.9fr 0.9fr 0.8fr` }}
          >
            <span>Mã</span>
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
                style={{ gridTemplateColumns: `1.1fr repeat(${dates.length}, 0.75fr) 0.8fr 0.9fr 0.9fr 0.8fr` }}
              >
                <span className="font-semibold">{row.stock_code}</span>
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
                <span>{formatPrice(row.currentPrice)}</span>
                <span>{formatPrice(row.monthAgoPrice)}</span>
                <span
                  className={
                    row.monthChangePercent === null
                      ? "text-on-surface-variant"
                      : row.monthChangePercent >= 0
                        ? "text-primary"
                        : "text-[var(--color-error)]"
                  }
                >
                  {formatPercent(row.monthChangePercent)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
