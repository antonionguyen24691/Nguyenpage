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
      label: "Thi truong tang tich cuc",
      tone: "positive" as const,
      monthlyChange: metrics.monthly.percent,
      quarterlyChange: metrics.quarterly.percent,
      volatility,
      explanation: "Thi truong dang giu nhip tang ro hon, dong tien co xu huong uu tien cac tai san co kha nang sinh loi cao.",
    };
  }

  if ((metrics.quarterly.percent ?? 0) > 0 && (metrics.monthly.percent ?? 0) < 0) {
    return {
      label: "Dang dieu chinh trong xu huong tang",
      tone: "neutral" as const,
      monthlyChange: metrics.monthly.percent,
      quarterlyChange: metrics.quarterly.percent,
      volatility,
      explanation: "Xu huong trung han van chua bi pha vo, nhung thi truong dang co mot nhip dieu chinh ngắn han can theo doi them.",
    };
  }

  if ((metrics.quarterly.percent ?? 0) <= -5) {
    return {
      label: "Thi truong nghien ve phong thu",
      tone: "cautious" as const,
      monthlyChange: metrics.monthly.percent,
      quarterlyChange: metrics.quarterly.percent,
      volatility,
      explanation: "Dong luong thi truong dang suy yeu, uu tien luc nay la kiem soat bien dong va giu ky luat phan bo von.",
    };
  }

  return {
    label: "Thi truong di ngang va phan hoa",
    tone: "neutral" as const,
    monthlyChange: metrics.monthly.percent,
    quarterlyChange: metrics.quarterly.percent,
    volatility,
    explanation: "Thi truong chua co xu huong that su ro rang, co hoi van co nhung can uu tien quy co cau truc chat che va du lieu on dinh.",
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
    if (regime.tone === "positive") tailwinds.push("Boi canh hien tai dang ung ho nhom quy co phieu va cac chien luoc chap nhan bien dong cao hon.");
    if (regime.tone === "cautious") headwinds.push("Khi thi truong yeu, quy co phieu thuong nhay cam hon voi nhung nhip giam ngắn han.");
  }

  if (category === "bond") {
    if (regime.tone !== "positive") tailwinds.push("Moi truong de cao su on dinh thuong phu hop hon voi nhom quy trai phieu va tai san it bien dong.");
    if (regime.tone === "positive") headwinds.push("Khi dong tien quay sang nhom tai san tang truong, quy trai phieu co the kem noi bat hon ve tuong doi.");
  }

  if (category === "balanced") {
    tailwinds.push("Cau truc da tai san giup quy can bang de hap thu tot hon cac nhịp len xuong cua thi truong.");
  }

  const topSectors = sectorAllocation.slice(0, 3).map((item) => item.label.toLowerCase());
  if (topSectors.some((sector) => sector.includes("ngan hang"))) {
    tailwinds.push("Ty trong ngan hang cao cho thay quy nhay cam voi chu ky tin dung va mat bang thanh khoan trong nen kinh te.");
  }
  if (topSectors.some((sector) => sector.includes("bat dong san"))) {
    headwinds.push("Ty trong bat dong san can duoc theo doi sat vi nhom nay nhay cam voi lai suat, phap ly va dong tien.");
  }
  if (topSectors.some((sector) => sector.includes("cong nghe"))) {
    tailwinds.push("Nhom cong nghe thuong duoc danh gia tich cuc hon khi thi truong san sang chap nhan muc dinh gia cao.");
  }

  const cycleCall =
    regime.label === "Thi truong tang tich cuc"
      ? "Giai doan hien tai nghien ve cac quy co kha nang tang truong, nhung van can chon loc ky."
      : regime.label === "Thi truong nghien ve phong thu"
        ? "Giai doan hien tai nen uu tien su on dinh va kha nang chiu rung lac cua danh muc."
        : "Giai doan hien tai phu hop voi cach tiep can chon loc va giai ngan tung phan.";

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
          "Day la mot ung vien dang uu tien neu khau vi rui ro cua nha dau tu phu hop voi nhom tai san cua quy.",
          "Co the xem xet giai ngan theo tung nhịp, uu tien luc bối cảnh thị trường va danh muc ben trong dang dong thuan.",
        ]
      : stance === "neutral"
        ? [
            "Nen tiep can than trong hon, giai ngan tung phan va theo doi them dien bien cua thi truong trong cac tuan toi.",
            "Nha dau tu nen doi chieu them voi mot vai quy cung nhom truoc khi nang ty trong.",
          ]
        : [
            "Chua phu hop de dat ty trong lon neu nha dau tu nhay cam voi bien dong ngan han.",
            "Nen uu tien theo doi them, chi giai ngan khi co ly do chien luoc that su ro rang va ky luat quan tri von chat che.",
          ];

  const summary =
    stance === "positive"
      ? "Quy dang cho thay su dong thuan kha ro giua hieu suat, co cau danh muc va bối cảnh thi truong."
      : stance === "neutral"
        ? "Quy co mot so diem tich cuc, nhung chua du thuyet phuc de xem la lua chon uu tien cao nhat ngay luc nay."
        : "Mat bang rui ro hien tai van cao, vi vay nen uu tien quan sat va giu su than trong hon la hanh dong manh.";

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
    holdingsExplanation.push(`Danh muc hien tai tap trung nhieu nhat vao nhom ${assetMix[0].label.toLowerCase()}, chiem ${assetMix[0].share.toFixed(1)}% tong ty trong.`);
  }
  if (positiveTrendWeight !== null) {
    holdingsExplanation.push(`${positiveTrendWeight.toFixed(1)}% ty trong trong nhom co phieu nam giu lon dang co dien bien gia tich cuc trong 1 thang qua.`);
  }
  if (increasedWeightShare !== null) {
    holdingsExplanation.push(`${increasedWeightShare.toFixed(1)}% ty trong trong nhom nam giu lon da duoc nang them so voi ky cong bo truoc.`);
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
