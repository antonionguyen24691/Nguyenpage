"use client";

import React from "react";

type OverviewItem = {
  label: string;
  value: string;
};

type AllocationItem = {
  label: string;
  weight: number;
  share: number;
};

type DocumentItem = {
  title: string;
  category: string;
  url: string;
  date: string | null;
};

type TabKey = "overview" | "asset" | "sector" | "documents";

type FundDetailPanelProps = {
  overview: OverviewItem[];
  assetAllocation: AllocationItem[];
  sectorAllocation: AllocationItem[];
  documents: DocumentItem[];
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  loading?: boolean;
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Tổng quan" },
  { key: "asset", label: "Phân bổ tài sản" },
  { key: "sector", label: "Phân bổ ngành" },
  { key: "documents", label: "Tài liệu quỹ" },
];

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export default function FundDetailPanel({
  overview,
  assetAllocation,
  sectorAllocation,
  documents,
  activeTab,
  onTabChange,
  loading = false,
}: FundDetailPanelProps) {
  return (
    <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Hồ sơ quỹ
          </p>
          <h3 className="mt-2 font-headline text-xl font-extrabold text-on-surface">
            Thông tin chi tiết và tài liệu tham chiếu
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                activeTab === tab.key
                  ? "bg-primary text-white"
                  : "border border-outline-variant/80 bg-white text-on-surface-variant"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-6 flex min-h-[220px] items-center justify-center rounded-[1.5rem] border border-dashed border-outline-variant/70 bg-surface-container-low px-6 text-sm font-semibold text-on-surface-variant">
          Đang tải dữ liệu quỹ...
        </div>
      ) : null}

      {!loading && activeTab === "overview" ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {overview.map((item) => (
            <div
              key={item.label}
              className="rounded-[1.4rem] border border-outline-variant/40 bg-surface-container-low p-4"
            >
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                {item.label}
              </div>
              <div className="mt-2 text-sm font-semibold leading-7 text-on-surface">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && activeTab === "asset" ? (
        <AllocationList
          emptyText="Chưa có dữ liệu phân bổ tài sản."
          items={assetAllocation}
        />
      ) : null}

      {!loading && activeTab === "sector" ? (
        <AllocationList
          emptyText="Chưa có dữ liệu phân bổ theo ngành."
          items={sectorAllocation}
        />
      ) : null}

      {!loading && activeTab === "documents" ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {documents.length > 0 ? (
            documents.map((document) => (
              <a
                key={`${document.category}-${document.title}-${document.url}`}
                href={document.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-[1.4rem] border border-outline-variant/40 bg-surface-container-low p-4 transition hover:border-primary/40 hover:bg-white"
              >
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  {document.category}
                </div>
                <div className="mt-2 text-lg font-extrabold text-on-surface">{document.title}</div>
                <div className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Mở liên kết nguồn chính thức
                </div>
                <div className="mt-3 text-xs font-semibold text-on-surface-variant">
                  {document.date
                    ? `Mốc tham chiếu: ${new Date(document.date).toLocaleDateString("vi-VN")}`
                    : "Nguồn chính thức"}
                </div>
              </a>
            ))
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-outline-variant/70 bg-surface-container-low px-4 py-5 text-sm leading-7 text-on-surface-variant md:col-span-2">
              Chưa có liên kết tài liệu cho quỹ này.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function AllocationList({
  items,
  emptyText,
}: {
  items: AllocationItem[];
  emptyText: string;
}) {
  if (!items.length) {
    return (
      <div className="mt-6 rounded-[1.4rem] border border-dashed border-outline-variant/70 bg-surface-container-low px-4 py-5 text-sm leading-7 text-on-surface-variant">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[1.4rem] border border-outline-variant/40 bg-surface-container-low p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="font-semibold text-on-surface">{item.label}</div>
            <div className="text-sm font-bold text-on-surface">{formatPercent(item.share)}</div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-outline-variant/20">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#0c7a69,#1f4db7)]"
              style={{ width: `${Math.min(item.share, 100)}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-on-surface-variant">
            Tỷ trọng gộp: {item.weight.toFixed(2)}%
          </div>
        </div>
      ))}
    </div>
  );
}
