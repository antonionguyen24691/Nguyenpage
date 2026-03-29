"use client";

import React, { useEffect, useRef, useState } from "react";
import FundCard from "@/components/FundCard";
import FundChart from "@/components/FundChart";
import FundHoldingsPie from "@/components/FundHoldingsPie";
import FundHistoryTable from "@/components/FundHistoryTable";
import HoldingsComparisonTable from "@/components/HoldingsComparisonTable";
import {
  buildCandles,
  buildHeikinAshi,
  filterSeriesByRange,
  toChartSeries,
  type ChartPoint,
  type FundNavRecord,
  type HoldingsComparisonRow,
} from "@/lib/fundAnalytics";

type Fund = {
  code: string;
  name: string;
  company: string;
  category: string;
  nav: number | null;
  nav_date: string | null;
  daily_change_percent: number | null;
  point_count: number;
};

type Holding = {
  stock_code: string;
  weight: number;
  date: string;
  currentPrice?: number | null;
  currentPriceDate?: string | null;
  monthAgoPrice?: number | null;
  monthAgoDate?: string | null;
  monthChangePercent?: number | null;
};

type NavPayload = {
  data: FundNavRecord[];
  metrics: {
    latestNav: number | null;
    latestDate: string | null;
    daily: { percent: number | null };
    monthly: { percent: number | null };
    quarterly: { percent: number | null };
    sinceInception: { percent: number | null };
    high: number | null;
    low: number | null;
    pointCount: number;
  };
  comparison: Record<string, ChartPoint[]>;
  peerCodes: string[];
  ai_insight: string;
};

type HoldingsPayload = {
  data: Holding[];
  date: string | null;
  availableDates: string[];
  comparisonDates: string[];
  comparisonRows: HoldingsComparisonRow[];
};

const RANGE_OPTIONS = ["1M", "3M", "6M", "1Y", "ALL"] as const;
const CHART_MODES = [
  { key: "area", label: "Area" },
  { key: "line", label: "Line" },
  { key: "candles", label: "Nen Nhat" },
  { key: "heikin", label: "Heikin-Ashi" },
  { key: "compare", label: "Doi chieu" },
] as const;
const COMPARE_COLORS = ["#0c7a69", "#1f4db7", "#b86f31", "#c73a3a"];
const MOBILE_BREAKPOINT = "(max-width: 1279px)";

function formatPercent(value: number | null) {
  return value === null ? "N/A" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatMonthLabel(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", {
    month: "2-digit",
    year: "numeric",
  });
}

export default function FundIntelligenceDashboard() {
  const detailSectionRef = useRef<HTMLElement | null>(null);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedFund, setSelectedFund] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]>("6M");
  const [chartMode, setChartMode] = useState<(typeof CHART_MODES)[number]["key"]>("area");
  const [navPayload, setNavPayload] = useState<NavPayload | null>(null);
  const [holdingsPayload, setHoldingsPayload] = useState<HoldingsPayload | null>(null);
  const [selectedHoldingsDate, setSelectedHoldingsDate] = useState<string | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT);
    const updateLayout = () => setIsCompact(mediaQuery.matches);

    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);
    return () => mediaQuery.removeEventListener("change", updateLayout);
  }, []);

  useEffect(() => {
    fetch("/api/funds")
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) {
          setFunds(payload.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!funds.length || selectedFund || isCompact) {
      return;
    }

    setSelectedFund(funds[0].code);
  }, [funds, isCompact, selectedFund]);

  useEffect(() => {
    if (!selectedFund) {
      setNavPayload(null);
      return;
    }

    setChartLoading(true);
    fetch(`/api/nav?fund=${selectedFund}&days=365`)
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) {
          setNavPayload(payload);
        }
      })
      .finally(() => setChartLoading(false));
  }, [selectedFund]);

  useEffect(() => {
    if (!selectedFund) {
      setHoldingsPayload(null);
      return;
    }

    setHoldingsLoading(true);
    const dateQuery = selectedHoldingsDate ? `&date=${selectedHoldingsDate}` : "";
    fetch(`/api/holdings?fund=${selectedFund}${dateQuery}`)
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) {
          setHoldingsPayload(payload);
          if (!selectedHoldingsDate && payload.date) {
            setSelectedHoldingsDate(payload.date);
          }
        }
      })
      .finally(() => setHoldingsLoading(false));
  }, [selectedFund, selectedHoldingsDate]);

  const currentFund = funds.find((item) => item.code === selectedFund) ?? null;
  const chartSeries = navPayload ? filterSeriesByRange(toChartSeries(navPayload.data), range) : [];
  const candles = buildCandles(chartSeries, range === "1M" ? "week" : "month");
  const heikinAshi = buildHeikinAshi(candles);
  const comparisonSeries =
    chartMode === "compare" && navPayload
      ? Object.entries(navPayload.comparison)
          .filter(([, data]) => data.length > 0)
          .map(([code, data], index) => ({
            code: code === "self" ? selectedFund ?? "SELF" : code,
            color: COMPARE_COLORS[index % COMPARE_COLORS.length],
            data: filterSeriesByRange(data, range),
          }))
      : [];
  const historyRows = navPayload ? [...navPayload.data].slice(-40).reverse() : [];
  const comparisonDates = holdingsPayload?.comparisonDates ?? [];
  const comparisonRows = holdingsPayload?.comparisonRows ?? [];

  function handleSelectFund(fundCode: string) {
    setSelectedFund(fundCode);
    setSelectedHoldingsDate(null);

    if (isCompact) {
      window.setTimeout(() => {
        detailSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-full border border-outline-variant/70 bg-white/80 px-5 py-3 text-sm font-semibold text-on-surface">
          Dang tai trung tam du lieu quy...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-4 pb-14 pt-8 md:px-6 xl:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(243,247,255,0.82))] p-6 shadow-[0_24px_60px_rgba(16,32,51,0.08)] md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <span className="section-kicker">Fund Intelligence</span>
            <div>
              <h1 className="section-title max-w-4xl">
                Dashboard quỹ mở hiện đại, nhiều lớp dữ liệu và dễ dùng hơn trên mobile.
              </h1>
              <p className="section-copy mt-4 max-w-3xl">
                Tập trung vào NAV lịch sử, biểu đồ nến, Heikin-Ashi, đối chiếu peer group, bảng lịch sử
                và biến động holdings theo nhiều tháng trên cùng một màn hình.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard
              label="Quỹ đang theo dõi"
              value={String(funds.length)}
              detail="Catalog đã mở rộng để phủ thêm SSIAM, Dragon Capital và VinaCapital."
            />
            <MetricCard
              label="Quỹ đang chọn"
              value={currentFund?.code ?? (isCompact ? "Chua chon" : "N/A")}
              detail={currentFund?.company ?? "Bam vao mot the quy de xem chi tiet"}
            />
            <MetricCard
              label="NAV gần nhất"
              value={
                navPayload?.metrics.latestNav !== null && navPayload?.metrics.latestNav !== undefined
                  ? navPayload.metrics.latestNav.toLocaleString("vi-VN")
                  : "N/A"
              }
              detail={navPayload?.metrics.latestDate ?? "Chua co du lieu"}
            />
            <MetricCard
              label="Biến động 1 tháng"
              value={formatPercent(navPayload?.metrics.monthly.percent ?? null)}
              detail={`1 quy ${formatPercent(navPayload?.metrics.quarterly.percent ?? null)}`}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/75 p-4 shadow-[0_20px_46px_rgba(16,32,51,0.06)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-headline text-lg font-bold text-on-surface">Quỹ mở</h2>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                Live catalog
              </span>
            </div>
            <p className="mb-4 text-sm leading-7 text-on-surface-variant">
              {isCompact
                ? "Trên mobile, bấm vào từng quỹ để mở panel chi tiết, chart, NAV history và holdings."
                : "Chọn quỹ để xem đầy đủ panel NAV, biểu đồ, bảng lịch sử và biến động holdings."}
            </p>
            <div className="space-y-3">
              {funds.map((fund) => (
                <FundCard
                  key={fund.code}
                  fundCode={fund.code}
                  fundName={fund.name}
                  company={fund.company}
                  category={fund.category}
                  nav={fund.nav}
                  navDate={fund.nav_date}
                  changePercent={fund.daily_change_percent}
                  pointCount={fund.point_count}
                  isActive={fund.code === selectedFund}
                  onClick={() => handleSelectFund(fund.code)}
                />
              ))}
            </div>
          </div>
        </aside>

        <section ref={detailSectionRef} className="space-y-6">
          {isCompact && !selectedFund ? (
            <div className="rounded-[2rem] border border-dashed border-outline-variant/70 bg-white/70 p-6 text-sm leading-7 text-on-surface-variant">
              Chọn một quỹ ở cột bên trái để xem chart, NAV history, AI insight và holdings.
            </div>
          ) : (
            <>
              <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.35fr)_360px]">
                <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
                  <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                        Chart Lab
                      </p>
                      <h2 className="mt-2 font-headline text-2xl font-extrabold text-on-surface">
                        {currentFund?.name ?? "Chon quy"}
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                        Đổi nhanh giữa area, line, nến Nhật, Heikin-Ashi và đối chiếu peer group.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {RANGE_OPTIONS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setRange(item)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold ${
                            range === item
                              ? "bg-on-surface text-white"
                              : "border border-outline-variant/80 bg-white text-on-surface-variant"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-5 flex flex-wrap gap-2">
                    {CHART_MODES.map((mode) => (
                      <button
                        key={mode.key}
                        type="button"
                        onClick={() => setChartMode(mode.key)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                          chartMode === mode.key
                            ? "bg-primary text-white"
                            : "border border-outline-variant/80 bg-white text-on-surface-variant"
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  {chartLoading ? (
                    <div className="flex h-[320px] items-center justify-center rounded-[1.5rem] border border-dashed border-outline-variant/70 bg-surface-container-low text-sm font-semibold text-on-surface-variant md:h-[420px]">
                      Dang dung bieu do NAV...
                    </div>
                  ) : chartSeries.length === 0 ? (
                    <div className="flex h-[320px] items-center justify-center rounded-[1.5rem] border border-dashed border-outline-variant/70 bg-surface-container-low text-sm font-semibold text-on-surface-variant md:h-[420px]">
                      Chua du du lieu NAV cho quy dang chon.
                    </div>
                  ) : (
                    <>
                      <FundChart
                        data={chartSeries}
                        mode={chartMode}
                        comparisonSeries={comparisonSeries}
                        candles={chartMode === "heikin" ? heikinAshi : candles}
                      />
                      {chartMode === "compare" && comparisonSeries.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-3">
                          {comparisonSeries.map((series) => (
                            <div
                              key={series.code}
                              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/60 bg-white px-3 py-1.5 text-sm text-on-surface"
                            >
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: series.color }}
                              />
                              {series.code}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>

                <div className="space-y-5">
                  <div className="rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(12,122,105,0.1),rgba(31,77,183,0.06))] p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
                      Decision Snapshot
                    </p>
                    <div className="mt-4 grid gap-3">
                      <InsightStat label="Ngay" value={formatPercent(navPayload?.metrics.daily.percent ?? null)} />
                      <InsightStat label="1 thang" value={formatPercent(navPayload?.metrics.monthly.percent ?? null)} />
                      <InsightStat label="1 quy" value={formatPercent(navPayload?.metrics.quarterly.percent ?? null)} />
                      <InsightStat
                        label="Tu dau chuoi"
                        value={formatPercent(navPayload?.metrics.sinceInception.percent ?? null)}
                      />
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
                      AI Insight
                    </p>
                    <div className="mt-4 text-sm leading-7 text-on-surface">
                      {chartLoading ? "Dang tong hop insight..." : navPayload?.ai_insight ?? "Chua co insight."}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                        NAV History
                      </p>
                      <h3 className="mt-2 font-headline text-xl font-extrabold text-on-surface">
                        Bảng lịch sử và điểm kiểm soát dữ liệu
                      </h3>
                    </div>
                  </div>
                  <FundHistoryTable rows={historyRows} />
                </div>

                <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                    Coverage
                  </p>
                  <div className="mt-4 space-y-3">
                    <MetricMini
                      label="So diem NAV"
                      value={String(navPayload?.metrics.pointCount ?? 0)}
                      detail="Dung de kiem tra do day lich su."
                    />
                    <MetricMini
                      label="Dinh chuoi"
                      value={
                        navPayload?.metrics.high !== null && navPayload?.metrics.high !== undefined
                          ? navPayload.metrics.high.toLocaleString("vi-VN")
                          : "N/A"
                      }
                      detail="Muc NAV cao nhat trong chuoi hien co."
                    />
                    <MetricMini
                      label="Day chuoi"
                      value={
                        navPayload?.metrics.low !== null && navPayload?.metrics.low !== undefined
                          ? navPayload.metrics.low.toLocaleString("vi-VN")
                          : "N/A"
                      }
                      detail="Muc NAV thap nhat trong chuoi hien co."
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
                  <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                        Holdings Delta Grid
                      </p>
                      <h3 className="mt-2 font-headline text-xl font-extrabold text-on-surface">
                        So sánh T, T-1, T-2, T-3 trên cùng một bảng
                      </h3>
                    </div>
                    {holdingsPayload?.availableDates?.length ? (
                      <select
                        value={selectedHoldingsDate ?? ""}
                        onChange={(event) => setSelectedHoldingsDate(event.target.value)}
                        className="rounded-full border border-outline-variant/70 bg-white px-4 py-2 text-sm font-semibold text-on-surface outline-none"
                      >
                        {holdingsPayload.availableDates.map((date) => (
                          <option key={date} value={date}>
                            {formatMonthLabel(date)}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>

                  {holdingsLoading ? (
                    <div className="flex h-[360px] items-center justify-center rounded-[1.5rem] border border-dashed border-outline-variant/70 bg-surface-container-low text-sm font-semibold text-on-surface-variant">
                      Dang tai lich su holdings...
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {comparisonDates.length === 1 ? (
                        <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                          Hiện mới có 1 kỳ holdings ở {formatMonthLabel(comparisonDates[0])}. Chưa có dữ liệu
                          T-2, T-3 thật để so sánh.
                        </div>
                      ) : null}
                      <HoldingsComparisonTable dates={comparisonDates} rows={comparisonRows} />
                    </div>
                  )}
                </div>

                <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                    Holdings Composition
                  </p>
                  <h3 className="mt-2 font-headline text-xl font-extrabold text-on-surface">
                    Top tỷ trọng hiện tại
                  </h3>
                  <div className="mt-4">
                    {holdingsLoading ? (
                      <div className="flex h-[320px] items-center justify-center rounded-[1.5rem] border border-dashed border-outline-variant/70 bg-surface-container-low text-sm font-semibold text-on-surface-variant md:h-[420px]">
                        Dang tai danh muc...
                      </div>
                    ) : (
                      <FundHoldingsPie data={holdingsPayload?.data ?? []} />
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-white/70 bg-white/80 p-4">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
        {label}
      </div>
      <div className="mt-2 font-headline text-2xl font-extrabold text-on-surface">{value}</div>
      <div className="mt-2 text-sm leading-6 text-on-surface-variant">{detail}</div>
    </div>
  );
}

function InsightStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[1.25rem] bg-white/70 px-4 py-3">
      <span className="text-sm font-medium text-on-surface-variant">{label}</span>
      <span className="font-headline text-lg font-extrabold text-on-surface">{value}</span>
    </div>
  );
}

function MetricMini({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-outline-variant/50 bg-surface-container-low p-4">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
        {label}
      </div>
      <div className="mt-2 font-headline text-xl font-extrabold text-on-surface">{value}</div>
      <div className="mt-2 text-sm leading-6 text-on-surface-variant">{detail}</div>
    </div>
  );
}
