import { buildFundDetails } from "@/lib/fundDetails";
import {
  aggregateHoldingRows,
  calculateNavMetrics,
  normalizeDate,
  sanitizeNavHistory,
  toChartSeries,
  type FundHoldingRecord,
  type FundNavRecord,
} from "@/lib/fundAnalytics";

export type AdvisorRiskBand = "low" | "medium" | "high";

type AdvisorDataset = {
  funds: Array<{ code: string; name: string; company: string; category?: string }>;
  nav: FundNavRecord[];
  holdings: FundHoldingRecord[];
  updatedAt: string;
};

export type AdvisorFund = {
  code: string;
  name: string;
  company: string;
  category: string;
  benchmark: string | null;
  summary: string;
  latestNav: number | null;
  latestNavDate: string | null;
  latestHoldingsDate: string | null;
  monthlyChange: number | null;
  quarterlyChange: number | null;
  sinceInceptionChange: number | null;
  annualizedVolatility: number | null;
  maxDrawdown: number | null;
  hhi: number | null;
  topHoldingShare: number | null;
  holdingCount: number;
  pointCount: number;
  navAgeDays: number | null;
  riskBand: AdvisorRiskBand;
  qualityScore: number;
  chartSeries: Array<{ time: string; value: number }>;
  scores: {
    momentum: number;
    resilience: number;
    diversification: number;
    coverage: number;
  };
  strengths: string[];
  cautions: string[];
  assetAllocation: Array<{ label: string; weight: number; share: number }>;
  sectorAllocation: Array<{ label: string; weight: number; share: number }>;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function normalizeRange(value: number | null, range: { min: number; max: number }, inverse = false) {
  if (value === null || Number.isNaN(value) || range.max === range.min) return 0.5;
  const normalized = (value - range.min) / (range.max - range.min);
  return clamp(inverse ? 1 - normalized : normalized);
}

function toTenScale(value: number) {
  return Number((clamp(value) * 10).toFixed(1));
}

function computeNavAgeDays(date: string | null) {
  if (!date) return null;
  const timestamp = new Date(date).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
}

function computeDailyReturns(history: FundNavRecord[]) {
  const returns: number[] = [];

  for (let index = 1; index < history.length; index += 1) {
    const previous = Number(history[index - 1]?.nav);
    const current = Number(history[index]?.nav);
    if (!Number.isFinite(previous) || !Number.isFinite(current) || previous <= 0) continue;
    returns.push((current - previous) / previous);
  }

  return returns;
}

function computeAnnualizedVolatility(history: FundNavRecord[]) {
  const returns = computeDailyReturns(history);
  if (returns.length < 2) return null;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

function computeMaxDrawdown(history: FundNavRecord[]) {
  let peak = Number.NEGATIVE_INFINITY;
  let maxDrawdown = 0;

  for (const row of history) {
    const nav = Number(row.nav);
    if (!Number.isFinite(nav) || nav <= 0) continue;
    peak = Math.max(peak, nav);
    if (peak > 0) maxDrawdown = Math.min(maxDrawdown, (nav - peak) / peak);
  }

  return peak === Number.NEGATIVE_INFINITY ? null : Math.abs(maxDrawdown) * 100;
}

function computeHoldingMetrics(rows: FundHoldingRecord[], latestHoldingsDate: string | null) {
  if (!latestHoldingsDate) return { hhi: null, topHoldingShare: null, holdingCount: 0 };

  const latestRows = aggregateHoldingRows(rows).filter((row) => normalizeDate(row.date) === latestHoldingsDate);
  if (!latestRows.length) return { hhi: null, topHoldingShare: null, holdingCount: 0 };

  const totalWeight = latestRows.reduce((sum, row) => sum + Number(row.weight), 0) || 1;
  const normalizedWeights = latestRows.map((row) => Number(row.weight) / totalWeight);

  return {
    hhi: normalizedWeights.reduce((sum, weight) => sum + weight ** 2, 0),
    topHoldingShare: Math.max(...normalizedWeights) * 100,
    holdingCount: latestRows.length,
  };
}

function getRiskBand(category: string): AdvisorRiskBand {
  if (category === "bond") return "low";
  if (category === "balanced") return "medium";
  return "high";
}

function getRange(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return { min: filtered.length ? Math.min(...filtered) : 0, max: filtered.length ? Math.max(...filtered) : 1 };
}

function buildNarrative(raw: {
  quarterlyChange: number | null;
  annualizedVolatility: number | null;
  maxDrawdown: number | null;
  hhi: number | null;
  navAgeDays: number | null;
  pointCount: number;
  holdingCount: number;
}) {
  const strengths: string[] = [];
  const cautions: string[] = [];

  if ((raw.quarterlyChange ?? -Infinity) > 3) strengths.push("Động lực NAV trong 1 quý đang tích cực.");
  if ((raw.annualizedVolatility ?? Infinity) < 12) strengths.push("Biến động NAV đang được kiểm soát khá tốt.");
  if ((raw.maxDrawdown ?? Infinity) < 8) strengths.push("Mức drawdown lịch sử thấp hơn mặt bằng chung.");
  if ((raw.hhi ?? Infinity) < 0.12) strengths.push("Danh mục phân bổ không quá tập trung vào một vài vị thế.");
  if ((raw.pointCount ?? 0) > 250) strengths.push("Chuỗi NAV đủ dày để đánh giá chất lượng quỹ.");

  if ((raw.navAgeDays ?? Infinity) > 5) cautions.push("NAV gần nhất đang chậm cập nhật so với hiện tại.");
  if ((raw.annualizedVolatility ?? 0) > 20) cautions.push("Biến động cao, phù hợp hơn với nhà đầu tư chấp nhận rủi ro.");
  if ((raw.maxDrawdown ?? 0) > 15) cautions.push("Drawdown lịch sử từng xuống sâu, cần quản trị tỷ trọng.");
  if ((raw.hhi ?? 0) > 0.18) cautions.push("Danh mục hiện tại có dấu hiệu tập trung cao.");
  if ((raw.holdingCount ?? 0) < 10) cautions.push("Số lượng vị thế công bố chưa nhiều, cần đọc kỹ danh mục.");

  return { strengths: strengths.slice(0, 3), cautions: cautions.slice(0, 3) };
}

export function buildAdvisorUniverse(dataset: AdvisorDataset): AdvisorFund[] {
  const rawFunds = dataset.funds
    .map((fund) => {
      const code = fund.code.toUpperCase();
      const navHistory = sanitizeNavHistory(dataset.nav.filter((row) => row.fund_code === code));
      if (!navHistory.length) return null;

      const details = buildFundDetails(dataset, code);
      if (!details) return null;

      const navMetrics = calculateNavMetrics(navHistory);
      const annualizedVolatility = computeAnnualizedVolatility(navHistory);
      const maxDrawdown = computeMaxDrawdown(navHistory);
      const navAgeDays = computeNavAgeDays(navMetrics.latestDate);
      const fundHoldings = dataset.holdings.filter((row) => row.fund_code === code);
      const holdingMetrics = computeHoldingMetrics(fundHoldings, details.latestHoldingsDate);

      return {
        code,
        name: details.name,
        company: details.company,
        category: fund.category ?? "equity",
        benchmark: details.benchmark,
        summary: details.summary,
        latestNav: navMetrics.latestNav,
        latestNavDate: navMetrics.latestDate,
        latestHoldingsDate: details.latestHoldingsDate,
        monthlyChange: navMetrics.monthly.percent,
        quarterlyChange: navMetrics.quarterly.percent,
        sinceInceptionChange: navMetrics.sinceInception.percent,
        annualizedVolatility,
        maxDrawdown,
        hhi: holdingMetrics.hhi,
        topHoldingShare: holdingMetrics.topHoldingShare,
        holdingCount: holdingMetrics.holdingCount,
        pointCount: navMetrics.pointCount,
        navAgeDays,
        riskBand: getRiskBand(fund.category ?? "equity"),
        chartSeries: toChartSeries(navHistory).slice(-180),
        assetAllocation: details.assetAllocation,
        sectorAllocation: details.sectorAllocation,
      };
    })
    .filter((fund): fund is NonNullable<typeof fund> => Boolean(fund));

  const ranges = {
    quarterlyChange: getRange(rawFunds.map((fund) => fund.quarterlyChange)),
    monthlyChange: getRange(rawFunds.map((fund) => fund.monthlyChange)),
    sinceInceptionChange: getRange(rawFunds.map((fund) => fund.sinceInceptionChange)),
    annualizedVolatility: getRange(rawFunds.map((fund) => fund.annualizedVolatility)),
    maxDrawdown: getRange(rawFunds.map((fund) => fund.maxDrawdown)),
    hhi: getRange(rawFunds.map((fund) => fund.hhi)),
    topHoldingShare: getRange(rawFunds.map((fund) => fund.topHoldingShare)),
    holdingCount: getRange(rawFunds.map((fund) => fund.holdingCount)),
    pointCount: getRange(rawFunds.map((fund) => fund.pointCount)),
    navAgeDays: getRange(rawFunds.map((fund) => fund.navAgeDays)),
  };

  return rawFunds
    .map((fund) => {
      const momentum = toTenScale(
        normalizeRange(fund.quarterlyChange, ranges.quarterlyChange) * 0.65 +
          normalizeRange(fund.monthlyChange, ranges.monthlyChange) * 0.25 +
          normalizeRange(fund.sinceInceptionChange, ranges.sinceInceptionChange) * 0.1,
      );

      const resilience = toTenScale(
        normalizeRange(fund.annualizedVolatility, ranges.annualizedVolatility, true) * 0.45 +
          normalizeRange(fund.maxDrawdown, ranges.maxDrawdown, true) * 0.45 +
          normalizeRange(fund.navAgeDays, ranges.navAgeDays, true) * 0.1,
      );

      const diversification = toTenScale(
        normalizeRange(fund.hhi, ranges.hhi, true) * 0.45 +
          normalizeRange(fund.topHoldingShare, ranges.topHoldingShare, true) * 0.35 +
          normalizeRange(fund.holdingCount, ranges.holdingCount) * 0.2,
      );

      const coverage = toTenScale(
        normalizeRange(fund.pointCount, ranges.pointCount) * 0.55 +
          normalizeRange(fund.navAgeDays, ranges.navAgeDays, true) * 0.25 +
          (fund.latestHoldingsDate ? 0.2 : 0.05),
      );

      const qualityScore = Number((momentum * 0.28 + resilience * 0.32 + diversification * 0.24 + coverage * 0.16).toFixed(1));
      const narrative = buildNarrative(fund);

      return {
        ...fund,
        qualityScore,
        scores: { momentum, resilience, diversification, coverage },
        strengths: narrative.strengths,
        cautions: narrative.cautions,
      };
    })
    .sort((left, right) => right.qualityScore - left.qualityScore);
}
