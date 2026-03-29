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
    <div className="w-full max-w-full overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/80">
      <div className="space-y-3 p-3 md:hidden">
        {rows.slice(0, 10).map((row) => (
          <div
            key={`${row.fund_code}-${row.date}`}
            className="rounded-[1.1rem] border border-outline-variant/30 bg-surface-container-low px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                  Ngày
                </div>
                <div className="mt-1 font-semibold text-on-surface">
                  {new Date(row.date).toLocaleDateString("vi-VN")}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                  NAV
                </div>
                <div className="mt-1 font-semibold text-on-surface">
                  {Number(row.nav).toLocaleString("vi-VN")}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs leading-6 text-on-surface-variant">
              Nguồn: {row.source ?? "N/A"}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[520px]">
          <div className="grid grid-cols-[1.2fr_1fr_0.8fr] gap-3 border-b border-outline-variant/40 px-4 py-4 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant md:px-5">
            <span>Ngày</span>
            <span>NAV</span>
            <span>Nguồn</span>
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {rows.map((row) => (
              <div
                key={`${row.fund_code}-${row.date}`}
                className="grid grid-cols-[1.2fr_1fr_0.8fr] gap-3 border-b border-outline-variant/20 px-4 py-4 text-sm text-on-surface last:border-b-0 md:px-5"
              >
                <span>{new Date(row.date).toLocaleDateString("vi-VN")}</span>
                <span className="font-semibold">{Number(row.nav).toLocaleString("vi-VN")}</span>
                <span className="text-on-surface-variant">{row.source ?? "N/A"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
