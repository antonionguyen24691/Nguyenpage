"use client";

import type { FundNavRecord } from "@/lib/fundAnalytics";

export default function FundHistoryTable({ rows }: { rows: FundNavRecord[] }) {
  if (!rows.length) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-outline-variant/80 bg-white/70 p-6 text-sm text-on-surface-variant">
        Chưa có bảng lịch sử NAV đủ dài để hiển thị.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/80">
      <div className="grid grid-cols-[1.2fr_1fr_0.8fr] gap-3 border-b border-outline-variant/40 px-5 py-4 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
        <span>Ngày</span>
        <span>NAV</span>
        <span>Nguồn</span>
      </div>
      <div className="max-h-[320px] overflow-y-auto">
        {rows.map((row) => (
          <div
            key={`${row.fund_code}-${row.date}`}
            className="grid grid-cols-[1.2fr_1fr_0.8fr] gap-3 border-b border-outline-variant/20 px-5 py-4 text-sm text-on-surface last:border-b-0"
          >
            <span>{new Date(row.date).toLocaleDateString("vi-VN")}</span>
            <span className="font-semibold">{Number(row.nav).toLocaleString("vi-VN")}</span>
            <span className="text-on-surface-variant">{row.source ?? "N/A"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
