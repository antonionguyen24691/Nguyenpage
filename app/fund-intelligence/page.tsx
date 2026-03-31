"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import FundCard from "@/components/FundCard";
import FundChart from "@/components/FundChart";
import FundDetailPanel from "@/components/FundDetailPanel";
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
  nav_source?: string | null;
  nav_age_days?: number | null;
  daily_change_percent: number | null;
  monthly_change_percent?: number | null;
  quarterly_change_percent?: number | null;
  point_count: number;
  data_status?: "ready" | "stale" | "missing";
  data_issue?: string | null;
};

type FundsMeta = {
  updatedAt: string | null;
  latestNavDate: string | null;
  latestNavAgeDays: number | null;
  dataFreshness: "fresh" | "stale" | "unknown";
};

type Holding = {
  stock_code: string;
  asset_type?: "equity" | "bond" | "cash" | "deposit" | "fund" | "other";
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
  benchmark?: {
    code: string;
    label: string;
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
  };
  ai_insight: string;
};

type HoldingsPayload = {
  data: Holding[];
  date: string | null;
  availableDates: string[];
  comparisonDates: string[];
  comparisonRows: HoldingsComparisonRow[];
};

type FundDetailsPayload = {
  code: string;
  name: string;
  company: string;
  category: string;
  benchmark: string | null;
  latestNavDate: string | null;
  latestHoldingsDate: string | null;
  summary: string;
  overview: Array<{ label: string; value: string }>;
  assetAllocation: Array<{ label: string; weight: number; share: number }>;
  sectorAllocation: Array<{ label: string; weight: number; share: number }>;
  documents: Array<{ title: string; category: string; url: string; date: string | null }>;
};

type InsightSection = {
  title: string;
  body: string[];
};

type StrategyFilter = "all" | "equity" | "bond" | "balanced";

const RANGE_OPTIONS = ["1M", "3M", "6M", "1Y", "ALL"] as const;
const CHART_MODES = [
  { key: "area", label: "Miá»n" },
  { key: "line", label: "ÄÆ°á»ng" },
  { key: "candles", label: "Náº¿n Nháº­t" },
  { key: "heikin", label: "Heikin-Ashi" },
  { key: "compare", label: "Äá»‘i chiáº¿u" },
] as const;
const COMPARE_COLORS = ["#0c7a69", "#1f4db7", "#b86f31", "#c73a3a"];
const MOBILE_BREAKPOINT = "(max-width: 1279px)";

function formatStrategyFilterLabel(value: StrategyFilter) {
  switch (value) {
    case "equity":
      return "Æ¯u tiÃªn cá»• phiáº¿u";
    case "bond":
      return "Æ¯u tiÃªn trÃ¡i phiáº¿u";
    case "balanced":
      return "TÃ i sáº£n phÃ¢n bá»•";
    default:
      return "Táº¥t cáº£ chiáº¿n lÆ°á»£c";
  }
}

function formatPercent(value: number | null) {
  return value === null ? "N/A" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatMonthLabel(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", {
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "ChÆ°a cÃ³ dá»¯ liá»‡u";
  }

  return new Date(value).toLocaleString("vi-VN");
}

function getFreshnessLabel(meta: FundsMeta | null) {
  if (!meta) {
    return "ChÆ°a xÃ¡c Ä‘á»‹nh";
  }

  if (meta.dataFreshness === "fresh") {
    return "Dá»¯ liá»‡u Ä‘ang má»›i";
  }

  if (meta.dataFreshness === "stale") {
    return meta.latestNavAgeDays !== null
      ? `Dá»¯ liá»‡u cháº­m khoáº£ng ${meta.latestNavAgeDays} ngÃ y`
      : "Dá»¯ liá»‡u Ä‘ang cháº­m";
  }

  return "ChÆ°a xÃ¡c Ä‘á»‹nh";
}

function parseInsightSections(text: string | null | undefined): InsightSection[] {
  if (!text?.trim()) {
    return [];
  }

  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: InsightSection[] = [];
  let current: InsightSection | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^\*\*(.+?)\*\*$/);
    if (headingMatch) {
      if (current) {
        sections.push(current);
      }
      current = { title: headingMatch[1], body: [] };
      continue;
    }

    if (!current) {
      current = { title: "TÃ³m táº¯t", body: [] };
    }

    current.body.push(line);
  }

  if (current) {
    sections.push(current);
  }

  return sections;
}

export default function FundIntelligenceDashboard() {
  const detailSectionRef = useRef<HTMLElement | null>(null);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [fundsMeta, setFundsMeta] = useState<FundsMeta | null>(null);
  const [selectedFund, setSelectedFund] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]>("6M");
  const [chartMode, setChartMode] = useState<(typeof CHART_MODES)[number]["key"]>("area");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyFilter>("all");
  const [navPayload, setNavPayload] = useState<NavPayload | null>(null);
  const [holdingsPayload, setHoldingsPayload] = useState<HoldingsPayload | null>(null);
  const [detailsPayload, setDetailsPayload] = useState<FundDetailsPayload | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsTab, setDetailsTab] = useState<"overview" | "asset" | "sector" | "documents">(
    "overview",
  );
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
          setFundsMeta(payload.meta ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const companyOptions = useMemo(
    () => ["all", ...new Set(funds.map((fund) => fund.company))],
    [funds],
  );
  const filteredFunds = useMemo(
    () =>
      funds.filter((fund) => {
        const matchCompany =
          selectedCompany === "all" ? true : fund.company === selectedCompany;
        const matchStrategy =
          selectedStrategy === "all" ? true : fund.category === selectedStrategy;

        return matchCompany && matchStrategy;
      }),
    [funds, selectedCompany, selectedStrategy],
  );

  useEffect(() => {
    if (!filteredFunds.length) {
      setSelectedFund(null);
      setSelectedHoldingsDate(null);
      return;
    }

    if (selectedFund && filteredFunds.some((fund) => fund.code === selectedFund)) {
      return;
    }

    const preferredFund =
      filteredFunds.find((fund) => fund.data_status === "ready") ??
      filteredFunds.find((fund) => fund.point_count > 0) ??
      filteredFunds[0];
    setSelectedFund(preferredFund.code);
    setSelectedHoldingsDate(null);
  }, [filteredFunds, selectedFund]);

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

  useEffect(() => {
    if (!selectedFund) {
      setDetailsPayload(null);
      return;
    }

    setDetailsLoading(true);
    setDetailsPayload(null);
    fetch(`/api/fund-details?fund=${selectedFund}`)
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) {
          setDetailsPayload(payload.data);
        }
      })
      .finally(() => setDetailsLoading(false));
  }, [selectedFund]);

  const currentFund = filteredFunds.find((item) => item.code === selectedFund) ?? null;
  const chartSeries = useMemo(
    () => (navPayload ? filterSeriesByRange(toChartSeries(navPayload.data), range) : []),
    [navPayload, range],
  );
  const candles = buildCandles(chartSeries, range === "1M" ? "week" : "month");
  const heikinAshi = buildHeikinAshi(candles);
  const comparisonSeries =
    chartMode === "compare" && navPayload
      ? Object.entries(navPayload.comparison)
          .filter(([, data]) => data.length > 0)
          .map(([code, data], index) => ({
            code: code === "self" ? selectedFund ?? "SELF" : code,
            color:
              code === "VNINDEX"
                ? "#f59e0b"
                : COMPARE_COLORS[index % COMPARE_COLORS.length],
            data: filterSeriesByRange(data, range),
          }))
      : [];
  const historyRows = navPayload ? [...navPayload.data].slice(-40).reverse() : [];
  const comparisonDates = holdingsPayload?.comparisonDates ?? [];
  const comparisonRows = holdingsPayload?.comparisonRows ?? [];
  const insightSections = useMemo(
    () => parseInsightSections(navPayload?.ai_insight),
    [navPayload?.ai_insight],
  );
  const benchmarkData = useMemo(
    () => navPayload?.benchmark?.data ?? [],
    [navPayload],
  );
  const benchmarkSeries = useMemo(() => {
    if (!benchmarkData.length || !chartSeries.length || chartMode === "compare") {
      return [];
    }

    const rawBenchmarkSeries = filterSeriesByRange(toChartSeries(benchmarkData), range);

    if (!rawBenchmarkSeries.length) {
      return [];
    }

    const alignedFundSeries = chartSeries.filter((point) =>
      rawBenchmarkSeries.some((benchmarkPoint) => benchmarkPoint.time === point.time),
    );
    const alignedBenchmarkSeries = rawBenchmarkSeries.filter((point) =>
      alignedFundSeries.some((fundPoint) => fundPoint.time === point.time),
    );

    if (!alignedFundSeries.length || !alignedBenchmarkSeries.length) {
      return [];
    }

    const fundBase = alignedFundSeries[0]?.value ?? 0;
    const benchmarkBase = alignedBenchmarkSeries[0]?.value ?? 0;

    if (!fundBase || !benchmarkBase) {
      return [];
    }

    return alignedBenchmarkSeries.map((point) => ({
      time: point.time,
      value: (point.value / benchmarkBase) * fundBase,
    }));
  }, [benchmarkData, chartMode, chartSeries, range]);
  const fallbackFunds = useMemo(() => {
    if (!currentFund) {
      return [];
    }

    return funds
      .filter((fund) => fund.code !== currentFund.code && fund.point_count > 0)
      .filter(
        (fund) =>
          fund.category === currentFund.category || fund.company === currentFund.company,
      )
      .slice(0, 3);
  }, [currentFund, funds]);
  const suggestedFunds = useMemo(
    () =>
      filteredFunds
        .filter((fund) => fund.point_count > 60 && fund.data_status === "ready")
        .sort((left, right) => {
          const quarterDiff =
            (right.quarterly_change_percent ?? -Infinity) - (left.quarterly_change_percent ?? -Infinity);
          if (quarterDiff !== 0) {
            return quarterDiff;
          }

          return (right.monthly_change_percent ?? -Infinity) - (left.monthly_change_percent ?? -Infinity);
        })
        .slice(0, 3),
    [filteredFunds],
  );

  function handleSelectFund(fundCode: string) {
    setSelectedFund(fundCode);
    setSelectedHoldingsDate(null);
    setDetailsTab("overview");

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
          Äang táº£i trung tÃ¢m dá»¯ liá»‡u quá»¹...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-3 pb-12 pt-6 md:gap-8 md:px-6 md:pb-14 md:pt-8 xl:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(243,247,255,0.82))] p-5 shadow-[0_24px_60px_rgba(16,32,51,0.08)] md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <span className="section-kicker">Trung tÃ¢m dá»¯ liá»‡u quá»¹</span>
            <div>
              <h1 className="max-w-4xl text-[2.2rem] font-extrabold leading-[0.94] tracking-[-0.04em] text-on-surface sm:text-[3rem] lg:text-[4.25rem]">
                Theo dÃµi NAV, danh má»¥c, Ä‘á»‘i chiáº¿u nhÃ³m quá»¹ vÃ  tÃ­n hiá»‡u váº­n Ä‘á»™ng trÃªn cÃ¹ng má»™t mÃ n hÃ¬nh.
              </h1>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 rounded-[1.6rem] border border-outline-variant/50 bg-white/75 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    Cáº­p nháº­t dá»¯ liá»‡u
                  </div>
                  <div className="mt-2 text-sm font-semibold text-on-surface">
                    {getFreshnessLabel(fundsMeta)}
                  </div>
                </div>
                <div className="grid gap-2 text-sm text-on-surface-variant md:text-right">
                  <div>Láº§n Ä‘á»“ng bá»™ ghi nháº­n: {formatDateTime(fundsMeta?.updatedAt ?? null)}</div>
                  <div>
                    NAV má»›i nháº¥t toÃ n há»‡:{" "}
                    {fundsMeta?.latestNavDate
                      ? new Date(fundsMeta.latestNavDate).toLocaleDateString("vi-VN")
                      : "ChÆ°a cÃ³ dá»¯ liá»‡u"}
                  </div>
                </div>
              </div>
            </div>
            <MetricCard
              label="Quá»¹ Ä‘ang theo dÃµi"
              value={String(filteredFunds.length)}
              detail={`${filteredFunds.length}/${funds.length} quỹ`}
            />
            <MetricCard
              label="Quá»¹ Ä‘ang chá»n"
              value={currentFund?.code ?? (isCompact ? "ChÆ°a chá»n" : "N/A")}
              detail={currentFund?.company ?? "Chưa chọn"}
            />
            <MetricCard
              label="NAV gáº§n nháº¥t"
              value={
                navPayload?.metrics.latestNav !== null && navPayload?.metrics.latestNav !== undefined
                  ? navPayload.metrics.latestNav.toLocaleString("vi-VN")
                  : "N/A"
              }
              detail={navPayload?.metrics.latestDate ?? "ChÆ°a cÃ³ dá»¯ liá»‡u"}
            />
            <MetricCard
              label="Biáº¿n Ä‘á»™ng 1 thÃ¡ng"
              value={formatPercent(navPayload?.metrics.monthly.percent ?? null)}
              detail={`1 quÃ½ ${formatPercent(navPayload?.metrics.quarterly.percent ?? null)}`}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Gá»£i Ã½ theo dÃµi
            </p>
            <h2 className="mt-2 font-headline text-xl font-extrabold text-on-surface">
              3 quá»¹ Ä‘ang cÃ³ Ä‘á»‹nh hÆ°á»›ng dá»¯ liá»‡u tá»‘t trong thá»‹ trÆ°á»ng hiá»‡n táº¡i
            </h2>
          </div>
          <div className="hidden rounded-full border border-outline-variant/60 bg-surface-container-low px-4 py-2 text-sm text-on-surface-variant lg:inline-flex">
            {selectedCompany === "all" ? "Táº¥t cáº£ cÃ´ng ty" : selectedCompany} Â·{" "}
            {formatStrategyFilterLabel(selectedStrategy)}
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {suggestedFunds.length > 0 ? (
            suggestedFunds.map((fund) => (
              <button
                key={fund.code}
                type="button"
                onClick={() => handleSelectFund(fund.code)}
                className="rounded-[1.5rem] border border-outline-variant/40 bg-surface-container-low p-4 text-left transition hover:border-primary/40 hover:bg-white"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-on-surface">{fund.code}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-on-surface-variant">
                      {fund.company}
                    </div>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    1 quÃ½ {formatPercent(fund.quarterly_change_percent ?? null)}
                  </span>
                </div>
                <div className="mt-4 text-lg font-extrabold text-on-surface">{fund.name}</div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white px-3 py-2">
                    <div className="text-xs text-on-surface-variant">Biáº¿n Ä‘á»™ng 1 thÃ¡ng</div>
                    <div className="mt-1 font-semibold text-on-surface">
                      {formatPercent(fund.monthly_change_percent ?? null)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2">
                    <div className="text-xs text-on-surface-variant">Äiá»ƒm NAV</div>
                    <div className="mt-1 font-semibold text-on-surface">{fund.point_count}</div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-outline-variant/70 bg-surface-container-low px-5 py-6 text-sm leading-7 text-on-surface-variant lg:col-span-3">
              ChÆ°a cÃ³ quá»¹ nÃ o Ä‘áº¡t ngÆ°á»¡ng gá»£i Ã½ trong táº­p lá»c hiá»‡n táº¡i. HÃ£y Ä‘á»•i cÃ´ng ty hoáº·c nhÃ³m chiáº¿n lÆ°á»£c Ä‘á»ƒ má»Ÿ rá»™ng danh má»¥c.
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-4">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/75 p-4 shadow-[0_20px_46px_rgba(16,32,51,0.06)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-headline text-lg font-bold text-on-surface">Quá»¹ má»Ÿ</h2>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                Danh má»¥c trá»±c tiáº¿p
              </span>
            </div>
            <div className="mb-4 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                  CÃ´ng ty quáº£n lÃ½ quá»¹
                </span>
                <select
                  value={selectedCompany}
                  onChange={(event) => setSelectedCompany(event.target.value)}
                  className="rounded-2xl border border-outline-variant/70 bg-white px-4 py-3 text-sm font-semibold text-on-surface outline-none"
                >
                  {companyOptions.map((company) => (
                    <option key={company} value={company}>
                      {company === "all" ? "Táº¥t cáº£ cÃ´ng ty" : company}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                  NhÃ³m chiáº¿n lÆ°á»£c
                </span>
                <select
                  value={selectedStrategy}
                  onChange={(event) => setSelectedStrategy(event.target.value as StrategyFilter)}
                  className="rounded-2xl border border-outline-variant/70 bg-white px-4 py-3 text-sm font-semibold text-on-surface outline-none"
                >
                  <option value="all">{formatStrategyFilterLabel("all")}</option>
                  <option value="equity">{formatStrategyFilterLabel("equity")}</option>
                  <option value="bond">{formatStrategyFilterLabel("bond")}</option>
                  <option value="balanced">{formatStrategyFilterLabel("balanced")}</option>
                </select>
              </label>
              <div className="rounded-[1rem] border border-outline-variant/50 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                Äang hiá»ƒn thá»‹ <span className="font-semibold text-on-surface">{filteredFunds.length}</span> quá»¹ trong bá»™ lá»c hiá»‡n táº¡i.
              </div>
            </div>
            <div className="space-y-3">
              {filteredFunds.length > 0 ? (
                filteredFunds.map((fund) => (
                  <FundCard
                    key={fund.code}
                    fundCode={fund.code}
                    fundName={fund.name}
                    company={fund.company}
                    category={fund.category}
                  nav={fund.nav}
                  navDate={fund.nav_date}
                  navSource={fund.nav_source}
                  navAgeDays={fund.nav_age_days}
                  changePercent={fund.daily_change_percent}
                  pointCount={fund.point_count}
                  dataStatus={fund.data_status}
                  dataIssue={fund.data_issue}
                  isActive={fund.code === selectedFund}
                  onClick={() => handleSelectFund(fund.code)}
                />
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-outline-variant/70 bg-surface-container-low px-4 py-5 text-sm leading-7 text-on-surface-variant">
                  KhÃ´ng cÃ³ quá»¹ nÃ o khá»›p vá»›i bá»™ lá»c nÃ y. HÃ£y Ä‘á»•i cÃ´ng ty hoáº·c nhÃ³m chiáº¿n lÆ°á»£c.
                </div>
              )}
            </div>
          </div>
        </aside>

        <section ref={detailSectionRef} className="min-w-0 space-y-6">
          {isCompact && !selectedFund ? (
            <div className="rounded-[2rem] border border-dashed border-outline-variant/70 bg-white/70 p-6 text-sm leading-7 text-on-surface-variant">
              Chá»n má»™t quá»¹ á»Ÿ cá»™t bÃªn trÃ¡i Ä‘á»ƒ xem biá»ƒu Ä‘á»“, lá»‹ch sá»­ NAV, nháº­n Ä‘á»‹nh vÃ  biáº¿n Ä‘á»™ng danh má»¥c.
            </div>
          ) : (
            <>
              {currentFund?.data_status === "stale" ? (
                <div className="rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-5 text-sm leading-7 text-amber-950">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">
                    Dá»¯ liá»‡u Ä‘ang cháº­m cáº­p nháº­t
                  </div>
                  <p className="mt-2">
                    {currentFund.data_issue ??
                      "Quá»¹ nÃ y váº«n cÃ³ lá»‹ch sá»­ NAV há»£p lá»‡, nhÆ°ng má»‘c cáº­p nháº­t gáº§n nháº¥t Ä‘ang cháº­m hÆ¡n hiá»‡n táº¡i."}
                  </p>
                </div>
              ) : null}
              {currentFund?.point_count === 0 ? (
                <div className="rounded-[2rem] border border-amber-200 bg-amber-50 px-5 py-5 text-sm leading-7 text-amber-950">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">
                    HÆ°á»›ng xá»­ lÃ½ dá»¯ liá»‡u thiáº¿u
                  </div>
                  <p className="mt-2">
                    {currentFund.data_issue ??
                      "Quá»¹ nÃ y hiá»‡n chÆ°a cÃ³ chuá»—i NAV á»•n Ä‘á»‹nh Ä‘á»ƒ dá»±ng biá»ƒu Ä‘á»“ vÃ  tÃ­nh toÃ¡n thá»‘ng kÃª."}
                  </p>
                  <p className="mt-2">
                    HÆ°á»›ng xá»­ lÃ½ Ä‘Ãºng lÃ : bá»• sung nguá»“n crawl cho quá»¹ nÃ y hoáº·c táº¡m thá»i chuyá»ƒn sang má»™t quá»¹ cÃ¹ng nhÃ³m Ä‘Ã£ cÃ³ dá»¯ liá»‡u Ä‘áº§y Ä‘á»§ hÆ¡n.
                  </p>
                  {fallbackFunds.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {fallbackFunds.map((fund) => (
                        <button
                          key={fund.code}
                          type="button"
                          onClick={() => handleSelectFund(fund.code)}
                          className="rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-on-surface"
                        >
                          Xem {fund.code}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.35fr)_360px]">
                <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
                  <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                        Trung tÃ¢m biá»ƒu Ä‘á»“
                      </p>
                      <h2 className="mt-2 font-headline text-2xl font-extrabold text-on-surface">
                        {currentFund?.name ?? "Chá»n quá»¹"}
                      </h2>
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
                    <div className="flex h-[260px] items-center justify-center rounded-[1.5rem] border border-dashed border-outline-variant/70 bg-surface-container-low text-sm font-semibold text-on-surface-variant md:h-[340px] xl:h-[360px]">
                      Äang dá»±ng biá»ƒu Ä‘á»“ NAV...
                    </div>
                  ) : chartSeries.length === 0 ? (
                    <div className="flex h-[260px] items-center justify-center rounded-[1.5rem] border border-dashed border-outline-variant/70 bg-surface-container-low px-6 text-center text-sm font-semibold text-on-surface-variant md:h-[340px] xl:h-[360px]">
                      {currentFund?.data_issue ?? "ChÆ°a Ä‘á»§ dá»¯ liá»‡u NAV cho quá»¹ Ä‘ang chá»n."}
                    </div>
                  ) : (
                    <>
                      <FundChart
                        data={chartSeries}
                        mode={chartMode}
                        comparisonSeries={comparisonSeries}
                        candles={chartMode === "heikin" ? heikinAshi : candles}
                        benchmarkSeries={chartMode === "compare" ? [] : benchmarkSeries}
                      />
                      {navPayload?.benchmark ? (
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                          <div className="inline-flex items-center gap-2 rounded-full border border-outline-variant/60 bg-white px-3 py-1.5 text-on-surface">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                            Tham chiáº¿u VN-Index
                          </div>
                          <div className="rounded-full border border-outline-variant/60 bg-white px-3 py-1.5 text-on-surface-variant">
                            1 thÃ¡ng: {formatPercent(navPayload.benchmark.metrics.monthly.percent)}
                          </div>
                          <div className="rounded-full border border-outline-variant/60 bg-white px-3 py-1.5 text-on-surface-variant">
                            1 quÃ½: {formatPercent(navPayload.benchmark.metrics.quarterly.percent)}
                          </div>
                        </div>
                      ) : null}
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
                              {series.code === "VNINDEX" ? "VN-Index" : series.code}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(12,122,105,0.1),rgba(31,77,183,0.06))] p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
                      áº¢nh chá»¥p nhanh
                    </p>
                    <div className="mt-4 grid gap-3">
                      <InsightStat label="NgÃ y" value={formatPercent(navPayload?.metrics.daily.percent ?? null)} />
                      <InsightStat label="1 thÃ¡ng" value={formatPercent(navPayload?.metrics.monthly.percent ?? null)} />
                      <InsightStat label="1 quÃ½" value={formatPercent(navPayload?.metrics.quarterly.percent ?? null)} />
                      <InsightStat
                        label="Tá»« Ä‘áº§u chuá»—i"
                        value={formatPercent(navPayload?.metrics.sinceInception.percent ?? null)}
                      />
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
                      Nháº­n Ä‘á»‹nh AI
                    </p>
                    {chartLoading ? (
                      <div className="mt-4 text-sm leading-7 text-on-surface-variant">
                        Äang tá»•ng há»£p nháº­n Ä‘á»‹nh...
                      </div>
                    ) : (
                      <InsightSections sections={insightSections} />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <FundDetailPanel overview={detailsPayload?.overview ?? []}
                  assetAllocation={detailsPayload?.assetAllocation ?? []}
                  sectorAllocation={detailsPayload?.sectorAllocation ?? []}
                  documents={detailsPayload?.documents ?? []}
                  activeTab={detailsTab}
                  onTabChange={setDetailsTab}
                  loading={detailsLoading}
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                        Lá»‹ch sá»­ NAV
                      </p>
                      <h3 className="mt-2 font-headline text-xl font-extrabold text-on-surface">
                        Báº£ng lá»‹ch sá»­ vÃ  nguá»“n dá»¯ liá»‡u
                      </h3>
                    </div>
                  </div>
                  <FundHistoryTable rows={historyRows} />
                </div>

                <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                    Äá»™ phá»§ dá»¯ liá»‡u
                  </p>
                  <div className="mt-4 space-y-3">
                    <MetricMini
                      label="Sá»‘ Ä‘iá»ƒm NAV"
                      value={String(navPayload?.metrics.pointCount ?? 0)}
                      detail="DÃ¹ng Ä‘á»ƒ kiá»ƒm tra Ä‘á»™ dÃ y chuá»—i lá»‹ch sá»­."
                    />
                    <MetricMini
                      label="Äá»‰nh chuá»—i"
                      value={
                        navPayload?.metrics.high !== null && navPayload?.metrics.high !== undefined
                          ? navPayload.metrics.high.toLocaleString("vi-VN")
                          : "N/A"
                      }
                      detail="Má»©c NAV cao nháº¥t trong chuá»—i hiá»‡n cÃ³."
                    />
                    <MetricMini
                      label="ÄÃ¡y chuá»—i"
                      value={
                        navPayload?.metrics.low !== null && navPayload?.metrics.low !== undefined
                          ? navPayload.metrics.low.toLocaleString("vi-VN")
                          : "N/A"
                      }
                      detail="Má»©c NAV tháº¥p nháº¥t trong chuá»—i hiá»‡n cÃ³."
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
                  <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                        Biáº¿n Ä‘á»™ng danh má»¥c
                      </p>
                      <h3 className="mt-2 font-headline text-xl font-extrabold text-on-surface">
                        So sÃ¡nh T, T-1, T-2, T-3 trÃªn cÃ¹ng má»™t báº£ng
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
                      Äang táº£i lá»‹ch sá»­ danh má»¥c...
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {comparisonDates.length === 1 ? (
                        <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                          Hiá»‡n má»›i cÃ³ 1 ká»³ danh má»¥c á»Ÿ {formatMonthLabel(comparisonDates[0])}. ChÆ°a cÃ³ dá»¯ liá»‡u
                          T-2, T-3 tháº­t Ä‘á»ƒ so sÃ¡nh.
                        </div>
                      ) : null}
                      <HoldingsComparisonTable dates={comparisonDates} rows={comparisonRows} />
                    </div>
                  )}
                </div>

                <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                    CÆ¡ cáº¥u danh má»¥c
                  </p>
                  <h3 className="mt-2 font-headline text-xl font-extrabold text-on-surface">
                    Top tá»· trá»ng hiá»‡n táº¡i
                  </h3>
                  <div className="mt-4">
                    {holdingsLoading ? (
                      <div className="flex h-[260px] items-center justify-center rounded-[1.5rem] border border-dashed border-outline-variant/70 bg-surface-container-low text-sm font-semibold text-on-surface-variant md:h-[340px] xl:h-[360px]">
                        Äang táº£i danh má»¥c...
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

function InsightSections({ sections }: { sections: InsightSection[] }) {
  if (!sections.length) {
    return <div className="mt-4 text-sm leading-7 text-on-surface-variant">ChÆ°a cÃ³ nháº­n Ä‘á»‹nh.</div>;
  }

  return (
    <div className="mt-4 space-y-3">
      {sections.map((section) => (
        <div
          key={section.title}
          className="rounded-[1.25rem] border border-outline-variant/40 bg-surface-container-low px-4 py-4"
        >
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{section.title}</div>
          <div className="mt-2 space-y-2 text-sm leading-7 text-on-surface">
            {section.body.map((paragraph) => (
              <p key={`${section.title}-${paragraph}`}>{paragraph}</p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

