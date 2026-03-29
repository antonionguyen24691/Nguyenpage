import React from "react";

type FundCardProps = {
  fundCode: string;
  fundName: string;
  company?: string;
  category?: string;
  nav: number | null;
  navDate: string | null;
  changePercent?: number | null;
  pointCount?: number;
  onClick?: () => void;
  isActive?: boolean;
};

function formatCategory(category?: string) {
  switch (category) {
    case "bond":
      return "Trái phiếu";
    case "balanced":
      return "Cân bằng";
    default:
      return "Cổ phiếu";
  }
}

export default function FundCard({
  fundCode,
  fundName,
  company,
  category,
  nav,
  navDate,
  changePercent,
  pointCount,
  onClick,
  isActive,
}: FundCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[1.75rem] border p-5 text-left transition-all duration-200 ${
        isActive
          ? "border-primary/50 bg-[linear-gradient(180deg,rgba(12,122,105,0.12),rgba(31,77,183,0.08))] shadow-[0_18px_45px_rgba(12,122,105,0.14)]"
          : "border-white/70 bg-white/80 hover:border-primary/30 hover:bg-white"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-on-surface px-2.5 py-1 text-[11px] font-bold tracking-[0.18em] text-white">
              {fundCode}
            </span>
            <span className="rounded-full border border-outline-variant/80 px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant">
              {formatCategory(category)}
            </span>
          </div>
          <h3 className="font-headline text-lg font-extrabold text-on-surface">{fundName}</h3>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-on-surface-variant">
            {company ?? "Fund Intelligence"}
          </p>
        </div>
        <div
          className={`rounded-2xl px-3 py-2 text-right text-xs font-semibold ${
            changePercent === null || changePercent === undefined
              ? "bg-surface-container text-on-surface-variant"
              : changePercent >= 0
                ? "bg-primary-container text-primary"
                : "bg-[rgba(199,58,58,0.12)] text-[var(--color-error)]"
          }`}
        >
          <div>Ngày</div>
          <div className="text-sm">
            {changePercent === null || changePercent === undefined
              ? "N/A"
              : `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%`}
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-[1.4rem] bg-white/70 p-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">NAV gần nhất</div>
          <div className="mt-1 text-2xl font-extrabold text-on-surface">
            {nav !== null ? nav.toLocaleString("vi-VN") : "N/A"}
          </div>
        </div>
        <div className="flex items-center justify-between text-sm text-on-surface-variant">
          <span>{navDate ? `Cập nhật ${new Date(navDate).toLocaleDateString("vi-VN")}` : "Chưa có cập nhật"}</span>
          <span>{pointCount ? `${pointCount} điểm NAV` : "0 điểm NAV"}</span>
        </div>
      </div>
    </button>
  );
}
