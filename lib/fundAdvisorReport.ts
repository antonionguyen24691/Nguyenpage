import { buildFundDetails } from "@/lib/fundDetails";
import { fetchVnIndexSeries } from "@/lib/marketIndex";
import { getStockPriceSnapshots } from "@/lib/stockPrice";
import {
  aggregateHoldingRows,
  buildHoldingsComparison,
  calculateNavMetrics,
  normalizeDate,
  sanitizeNavHistory,
  type ChartPoint,
  type FundHoldingRecord,
  type FundNavRecord,
  type HoldingAssetType,
} from "@/lib/fundAnalytics";

type FundDataset = {
  funds: Array<{ code: string; name: string; company: string; category?: string }>;
  nav: FundNavRecord[];
  holdings: FundHoldingRecord[];
  updatedAt: string;
};

type ReportTone = "positive" | "neutral" | "cautious";

type HoldingTrendItem = {
  code: string;
  assetType: HoldingAssetType;
  weight: number;
  changeVsPrevious: number | null;
  monthChangePercent: number | null;
  stance: ReportTone;
};

export type AdvisorReport = {
  fundCode: string;
  generatedAt: string;
  marketRegime: {
    label: string;
    tone: ReportTone;
    monthlyChange: number | null;
    quarterlyChange: number | null;
    volatility: number | null;
    explanation: string;
  };
  benchmark: {
    label: string;
    monthlyChange: number | null;
    quarterlyChange: number | null;
    sinceInceptionChange: number | null;
  };
  fundHealth: {
    latestNav: number | null;
    latestNavDate: string | null;
    pointCount: number;
    monthlyChange: number | null;
    quarterlyChange: number | null;
    sinceInceptionChange: number | null;
    volatility: number | null;
    maxDrawdown: number | null;
    hhi: number | null;
    topHoldingShare: number | null;
    dataFreshness: string;
  };
  holdingsView: {
    latestDate: string | null;
    previousDate: string | null;
    assetMix: Array<{ label: string; share: number }>;
    topTrends: HoldingTrendItem[];
    positiveTrendWeight: number | null;
    increasedWeightShare: number | null;
    explanation: string[];
  };
  macroView: {
    cycleCall: string;
    tailwinds: string[];
    headwinds: string[];
  };
  conclusion: {
    stance: ReportTone;
    summary: string;
    recommendation: string[];
  };
};

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

function sum(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function toShare(weight: number, total: number) {
  if (!total) return 0;
  return (weight / total) * 100;
}

function formatCategory(category: string | undefined) {
  if (category === "bond") return "bond";
  if (category === "balanced") return "balanced";
  return "equity";
}

function buildMarketRegime(benchmarkHistory: ChartPoint[]) {
  const navHistory = benchmarkHistory.map((point) => ({
    fund_code: "VNINDEX",
    nav: point.value,
    date: point.time,
  }));
  const metrics = calculateNavMetrics(navHistory);
  const volatility = computeAnnualizedVolatility(navHistory);

  if ((metrics.quarterly.percent ?? 0) >= 8 && (metrics.monthly.percent ?? 0) >= 2) {
    return {
      label: "Risk-on expansion",
      tone: "positive" as const,
      monthlyChange: metrics.monthly.percent,
      quarterlyChange: metrics.quarterly.percent,
      volatility,
      explanation: "Dong luong thi truong dang tich cuc, kha nang nha dau tu uu tien tai san rui ro cao hon.",
    };
  }

  if ((metrics.quarterly.percent ?? 0) > 0 && (metrics.monthly.percent ?? 0) < 0) {
    return {
      label: "Pullback trong uptrend",
      tone: "neutral" as const,
      monthlyChange: metrics.monthly.percent,
      quarterlyChange: metrics.quarterly.percent,
      volatility,
      explanation: "Thi truong van giu xu huong trung han tich cuc nhung dang co nhip dieu chinh ngan han.",
    };
  }

  if ((metrics.quarterly.percent ?? 0) <= -5) {
    return {
      label: "Defensive contraction",
      tone: "cautious" as const,
      monthlyChange: metrics.monthly.percent,
      quarterlyChange: metrics.quarterly.percent,
      volatility,
      explanation: "Dong luong benchmark suy yeu, can uu tien quy phong thu va quan tri drawdown.",
    };
  }

  return {
    label: "Sideways rotation",
    tone: "neutral" as const,
    monthlyChange: metrics.monthly.percent,
    quarterlyChange: metrics.quarterly.percent,
    volatility,
    explanation: "Thi truong di ngang va phan hoa, can tap trung vao chat luong danh muc va ky luat giai ngan.",
  };
}

function buildHoldingMetrics(rows: ReturnType<typeof aggregateHoldingRows>, latestHoldingsDate: string | null) {
  if (!latestHoldingsDate) return { hhi: null, topHoldingShare: null };

  const latestRows = rows.filter((row) => normalizeDate(row.date) === latestHoldingsDate);
  if (!latestRows.length) return { hhi: null, topHoldingShare: null };

  const totalWeight = latestRows.reduce((total, row) => total + Number(row.weight), 0) || 1;
  const normalizedWeights = latestRows.map((row) => Number(row.weight) / totalWeight);

  return {
    hhi: normalizedWeights.reduce((total, weight) => total + weight ** 2, 0),
    topHoldingShare: Math.max(...normalizedWeights) * 100,
  };
}

function getAssetTypeLabel(assetType: HoldingAssetType) {
  switch (assetType) {
    case "bond":
      return "Bond";
    case "cash":
      return "Cash";
    case "deposit":
      return "Deposit";
    case "fund":
      return "Fund";
    case "other":
      return "Other";
    default:
      return "Equity";
  }
}

function buildAssetMix(rows: ReturnType<typeof aggregateHoldingRows>, latestDate: string | null) {
  if (!latestDate) return [];

  const latestRows = rows.filter((row) => normalizeDate(row.date) === latestDate);
  const grouped = new Map<string, number>();
  const total = sum(latestRows.map((row) => Number(row.weight))) || 1;

  latestRows.forEach((row) => {
    const key = getAssetTypeLabel(row.asset_type);
    grouped.set(key, (grouped.get(key) ?? 0) + Number(row.weight));
  });

  return [...grouped.entries()]
    .map(([label, weight]) => ({ label, share: toShare(weight, total) }))
    .sort((left, right) => right.share - left.share);
}

function buildMacroView(category: string, regime: AdvisorReport["marketRegime"], sectorAllocation: Array<{ label: string; share: number }>) {
  const tailwinds: string[] = [];
  const headwinds: string[] = [];

  if (category === "equity") {
    if (regime.tone === "positive") tailwinds.push("Risk appetite cua benchmark dang ung ho cho quy co ty trong co phieu cao.");
    if (regime.tone === "cautious") headwinds.push("Dong luong thi truong yeu co the lam NAV quy co phieu bien dong manh hon.");
  }

  if (category === "bond") {
    if (regime.tone !== "positive") tailwinds.push("Moi truong phong thu thuong co loi hon cho quy uu tien trai phieu va tai san on dinh.");
    if (regime.tone === "positive") headwinds.push("Khi benchmark chuyen sang risk-on, quy trai phieu co the kem hap dan tuong doi.");
  }

  if (category === "balanced") {
    tailwinds.push("Cau truc da tai san giup quy can bang de hap thu bien dong giua cac chu ky.");
  }

  const topSectors = sectorAllocation.slice(0, 3).map((item) => item.label.toLowerCase());
  if (topSectors.some((sector) => sector.includes("ngan hang"))) {
    tailwinds.push("Ty trong ngan hang cao se nhay cam voi chu ky thanh khoan va tang truong tin dung.");
  }
  if (topSectors.some((sector) => sector.includes("bat dong san"))) {
    headwinds.push("Ty trong bat dong san can theo doi sat do nhay voi lai suat va dong tien.");
  }
  if (topSectors.some((sector) => sector.includes("cong nghe"))) {
    tailwinds.push("Nhom cong nghe thuong duoc huong loi khi thi truong chap nhan valuation cao hon.");
  }

  const cycleCall =
    regime.label === "Risk-on expansion"
      ? "Chu ky hien tai uu tien tang truong co chon loc."
      : regime.label === "Defensive contraction"
        ? "Chu ky hien tai uu tien phong thu va giu ky luat drawdown."
        : "Chu ky hien tai yeu cau chon loc va giai ngan theo nhieu nhip.";

  return { cycleCall, tailwinds: tailwinds.slice(0, 3), headwinds: headwinds.slice(0, 3) };
}

function buildConclusion(input: {
  category: string;
  regime: AdvisorReport["marketRegime"];
  monthlyChange: number | null;
  quarterlyChange: number | null;
  volatility: number | null;
  maxDrawdown: number | null;
  positiveTrendWeight: number | null;
}) {
  let score = 0;

  if ((input.quarterlyChange ?? 0) > 0) score += 1;
  if ((input.monthlyChange ?? 0) > 0) score += 1;
  if ((input.positiveTrendWeight ?? 0) >= 45) score += 1;
  if ((input.volatility ?? 100) <= 18) score += 1;
  if ((input.maxDrawdown ?? 100) <= 15) score += 1;
  if (input.regime.tone === "positive" && input.category === "equity") score += 1;
  if (input.regime.tone === "cautious" && input.category === "equity") score -= 1;

  const stance: ReportTone = score >= 5 ? "positive" : score >= 3 ? "neutral" : "cautious";
  const recommendation =
    stance === "positive"
      ? [
          "Co the dua vao shortlist uu tien neu profile chap nhan dung nhom tai san cua quy.",
          "Phu hop cho giai ngan theo nhip khi benchmark va holdings cung xac nhan dong luong.",
        ]
      : stance === "neutral"
        ? [
            "Nen tiep can theo kieu giai ngan tung phan va theo doi them benchmark trong vai tuan toi.",
            "Can doi chieu them voi 1-2 quy dong nhom truoc khi tang ty trong.",
          ]
        : [
            "Khong nen uu tien ty trong lon neu nha dau tu nhay cam voi bien dong ngan han.",
            "Chi nen giu trong watchlist hoac giai ngan rat ky luat neu co ly do chien luoc ro rang.",
          ];

  const summary =
    stance === "positive"
      ? "Quy hien cho thay su dong pha kha tot giua hieu suat, cau truc holdings va boi canh benchmark."
      : stance === "neutral"
        ? "Quy co diem tich cuc nhung chua du su dong pha de xem la lua chon uu tien tuyet doi."
        : "Rui ro hien tai dang lon hon bien an toan, can uu tien quan sat hon la hanh dong manh.";

  return { stance, summary, recommendation };
}

export async function buildAdvisorReport(dataset: FundDataset, fundCode: string): Promise<AdvisorReport | null> {
  const normalizedCode = fundCode.trim().toUpperCase();
  const fund = dataset.funds.find((item) => item.code.toUpperCase() === normalizedCode);
  if (!fund) return null;

  const details = buildFundDetails(dataset, normalizedCode);
  if (!details) return null;

  const navHistory = sanitizeNavHistory(dataset.nav.filter((row) => row.fund_code === normalizedCode));
  if (!navHistory.length) return null;

  const metrics = calculateNavMetrics(navHistory);
  const volatility = computeAnnualizedVolatility(navHistory);
  const maxDrawdown = computeMaxDrawdown(navHistory);

  const holdingRows = aggregateHoldingRows(dataset.holdings.filter((row) => row.fund_code === normalizedCode));
  const holdingDates = [...new Set(holdingRows.map((row) => normalizeDate(row.date)))].sort(
    (left, right) => new Date(right).getTime() - new Date(left).getTime(),
  );
  const latestDate = holdingDates[0] ?? null;
  const previousDate = holdingDates[1] ?? null;
  const latestRows = latestDate ? holdingRows.filter((row) => normalizeDate(row.date) === latestDate) : [];
  const assetMix = buildAssetMix(holdingRows, latestDate);
  const concentration = buildHoldingMetrics(holdingRows, latestDate);

  const comparison = buildHoldingsComparison(holdingRows, latestDate, 4);
  const trackedSymbols = latestRows
    .filter((row) => row.asset_type === "equity")
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 8)
    .map((row) => row.stock_code);
  const priceSnapshots = await getStockPriceSnapshots(trackedSymbols);

  const topTrends: HoldingTrendItem[] = latestRows
    .filter((row) => row.asset_type === "equity")
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 8)
    .map((row) => {
      const comparisonRow = comparison.rows.find((item) => item.stock_code === row.stock_code);
      const snapshot = priceSnapshots.get(row.stock_code);
      const monthChangePercent = snapshot?.monthChangePercent ?? null;
      const changeVsPrevious = comparisonRow?.changeVsPrevious ?? null;
      const stance: ReportTone =
        (monthChangePercent ?? -Infinity) > 0 && (changeVsPrevious ?? -Infinity) >= 0
          ? "positive"
          : (monthChangePercent ?? Infinity) < 0
            ? "cautious"
            : "neutral";

      return {
        code: row.stock_code,
        assetType: row.asset_type,
        weight: Number(row.weight),
        changeVsPrevious,
        monthChangePercent,
        stance,
      };
    });

  const totalTrackedWeight = sum(topTrends.map((item) => item.weight));
  const positiveTrendWeight =
    totalTrackedWeight > 0
      ? toShare(
          sum(topTrends.filter((item) => (item.monthChangePercent ?? -Infinity) > 0).map((item) => item.weight)),
          totalTrackedWeight,
        )
      : null;
  const increasedWeightShare =
    totalTrackedWeight > 0
      ? toShare(
          sum(topTrends.filter((item) => (item.changeVsPrevious ?? -Infinity) > 0).map((item) => item.weight)),
          totalTrackedWeight,
        )
      : null;

  const benchmarkHistory = await fetchVnIndexSeries(365);
  const regime = buildMarketRegime(benchmarkHistory);
  const benchmarkMetrics = calculateNavMetrics(
    benchmarkHistory.map((point) => ({
      fund_code: "VNINDEX",
      nav: point.value,
      date: point.time,
    })),
  );

  const holdingsExplanation: string[] = [];
  if (assetMix.length > 0) {
    holdingsExplanation.push(`Quy hien uu tien ${assetMix[0].label.toLowerCase()} voi ty trong lon nhat ${assetMix[0].share.toFixed(1)}%.`);
  }
  if (positiveTrendWeight !== null) {
    holdingsExplanation.push(`${positiveTrendWeight.toFixed(1)}% ty trong co phieu top holdings dang co trend gia 1 thang duong.`);
  }
  if (increasedWeightShare !== null) {
    holdingsExplanation.push(`${increasedWeightShare.toFixed(1)}% ty trong top holdings dang duoc tang them so voi ky truoc.`);
  }

  const macroView = buildMacroView(formatCategory(fund.category), regime, details.sectorAllocation);
  const conclusion = buildConclusion({
    category: formatCategory(fund.category),
    regime,
    monthlyChange: metrics.monthly.percent,
    quarterlyChange: metrics.quarterly.percent,
    volatility,
    maxDrawdown,
    positiveTrendWeight,
  });

  const dataFreshness =
    metrics.latestDate === null
      ? "Chua co du lieu moi"
      : `${metrics.latestDate}${dataset.updatedAt ? ` · sync ${dataset.updatedAt.slice(0, 10)}` : ""}`;

  return {
    fundCode: normalizedCode,
    generatedAt: new Date().toISOString(),
    marketRegime: regime,
    benchmark: {
      label: "VN-Index",
      monthlyChange: benchmarkMetrics.monthly.percent,
      quarterlyChange: benchmarkMetrics.quarterly.percent,
      sinceInceptionChange: benchmarkMetrics.sinceInception.percent,
    },
    fundHealth: {
      latestNav: metrics.latestNav,
      latestNavDate: metrics.latestDate,
      pointCount: metrics.pointCount,
      monthlyChange: metrics.monthly.percent,
      quarterlyChange: metrics.quarterly.percent,
      sinceInceptionChange: metrics.sinceInception.percent,
      volatility,
      maxDrawdown,
      hhi: concentration.hhi,
      topHoldingShare: concentration.topHoldingShare,
      dataFreshness,
    },
    holdingsView: {
      latestDate,
      previousDate,
      assetMix,
      topTrends,
      positiveTrendWeight,
      increasedWeightShare,
      explanation: holdingsExplanation,
    },
    macroView,
    conclusion,
  };
}
