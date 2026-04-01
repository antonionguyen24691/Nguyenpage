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
      label: "Thị trường tăng tích cực",
      tone: "positive" as const,
      monthlyChange: metrics.monthly.percent,
      quarterlyChange: metrics.quarterly.percent,
      volatility,
      explanation: "Thị trường đang giữ nhịp tăng rõ hơn, dòng tiền có xu hướng ưu tiên các tài sản có khả năng sinh lợi cao.",
    };
  }

  if ((metrics.quarterly.percent ?? 0) > 0 && (metrics.monthly.percent ?? 0) < 0) {
    return {
      label: "Đang điều chỉnh trong xu hướng tăng",
      tone: "neutral" as const,
      monthlyChange: metrics.monthly.percent,
      quarterlyChange: metrics.quarterly.percent,
      volatility,
      explanation: "Xu hướng trung hạn vẫn chưa bị phá vỡ, nhưng thị trường đang có một nhịp điều chỉnh ngắn hạn cần theo dõi thêm.",
    };
  }

  if ((metrics.quarterly.percent ?? 0) <= -5) {
    return {
      label: "Thị trường nghiêng về phòng thủ",
      tone: "cautious" as const,
      monthlyChange: metrics.monthly.percent,
      quarterlyChange: metrics.quarterly.percent,
      volatility,
      explanation: "Động lượng thị trường đang suy yếu, ưu tiên lúc này là kiểm soát biến động và giữ kỷ luật phân bổ vốn.",
    };
  }

  return {
    label: "Thị trường đi ngang và phân hóa",
    tone: "neutral" as const,
    monthlyChange: metrics.monthly.percent,
    quarterlyChange: metrics.quarterly.percent,
    volatility,
    explanation: "Thị trường chưa có xu hướng thật sự rõ ràng, cơ hội vẫn có nhưng cần ưu tiên quỹ có cấu trúc chặt chẽ và dữ liệu ổn định.",
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
      return "Trái phiếu";
    case "cash":
      return "Tiền mặt";
    case "deposit":
      return "Tiền gửi";
    case "fund":
      return "Chứng chỉ quỹ";
    case "other":
      return "Tài sản khác";
    default:
      return "Cổ phiếu";
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
    if (regime.tone === "positive") tailwinds.push("Bối cảnh hiện tại đang ủng hộ nhóm quỹ cổ phiếu và các chiến lược chấp nhận biến động cao hơn.");
    if (regime.tone === "cautious") headwinds.push("Khi thị trường yếu, quỹ cổ phiếu thường nhạy cảm hơn với các nhịp giảm ngắn hạn.");
  }

  if (category === "bond") {
    if (regime.tone !== "positive") tailwinds.push("Môi trường đề cao sự ổn định thường phù hợp hơn với nhóm quỹ trái phiếu và tài sản ít biến động.");
    if (regime.tone === "positive") headwinds.push("Khi dòng tiền quay sang nhóm tài sản tăng trưởng, quỹ trái phiếu có thể kém nổi bật hơn về tương đối.");
  }

  if (category === "balanced") {
    tailwinds.push("Cấu trúc đa tài sản giúp quỹ cân bằng dễ hấp thụ tốt hơn các nhịp lên xuống của thị trường.");
  }

  const topSectors = sectorAllocation.slice(0, 3).map((item) => item.label.toLowerCase());
  if (topSectors.some((sector) => sector.includes("ngân hàng") || sector.includes("ngan hang"))) {
    tailwinds.push("Tỷ trọng ngân hàng cao cho thấy quỹ nhạy cảm với chu kỳ tín dụng và mặt bằng thanh khoản trong nền kinh tế.");
  }
  if (topSectors.some((sector) => sector.includes("bất động sản") || sector.includes("bat dong san"))) {
    headwinds.push("Tỷ trọng bất động sản cần được theo dõi sát vì nhóm này nhạy cảm với lãi suất, pháp lý và dòng tiền.");
  }
  if (topSectors.some((sector) => sector.includes("công nghệ") || sector.includes("cong nghe"))) {
    tailwinds.push("Nhóm công nghệ thường được đánh giá tích cực hơn khi thị trường sẵn sàng chấp nhận mức định giá cao.");
  }

  const cycleCall =
    regime.label === "Thị trường tăng tích cực"
      ? "Giai đoạn hiện tại nghiêng về các quỹ có khả năng tăng trưởng, nhưng vẫn cần chọn lọc kỹ."
      : regime.label === "Thị trường nghiêng về phòng thủ"
        ? "Giai đoạn hiện tại nên ưu tiên sự ổn định và khả năng chịu rung lắc của danh mục."
        : "Giai đoạn hiện tại phù hợp với cách tiếp cận chọn lọc và giải ngân từng phần.";

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
          "Đây là một ứng viên đáng ưu tiên nếu khẩu vị rủi ro của nhà đầu tư phù hợp với nhóm tài sản của quỹ.",
          "Có thể xem xét giải ngân theo từng nhịp, ưu tiên lúc bối cảnh thị trường và danh mục bên trong đang đồng thuận.",
        ]
      : stance === "neutral"
        ? [
            "Nên tiếp cận thận trọng hơn, giải ngân từng phần và theo dõi thêm diễn biến của thị trường trong các tuần tới.",
            "Nhà đầu tư nên đối chiếu thêm với một vài quỹ cùng nhóm trước khi nâng tỷ trọng.",
          ]
        : [
            "Chưa phù hợp để đặt tỷ trọng lớn nếu nhà đầu tư nhạy cảm với biến động ngắn hạn.",
            "Nên ưu tiên theo dõi thêm, chỉ giải ngân khi có lý do chiến lược thật sự rõ ràng và kỷ luật quản trị vốn chặt chẽ.",
          ];

  const summary =
    stance === "positive"
      ? "Quỹ đang cho thấy sự đồng thuận khá rõ giữa hiệu suất, cơ cấu danh mục và bối cảnh thị trường."
      : stance === "neutral"
        ? "Quỹ có một số điểm tích cực, nhưng chưa đủ thuyết phục để xem là lựa chọn ưu tiên cao nhất ngay lúc này."
        : "Mặt bằng rủi ro hiện tại vẫn cao, vì vậy nên ưu tiên quan sát và giữ sự thận trọng hơn là hành động mạnh.";

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
  const holdingDates = [...new Set(holdingRows.map((row) => normalizeDate(row.date)))].sort((left, right) => new Date(right).getTime() - new Date(left).getTime());
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
        (monthChangePercent ?? -Infinity) > 0 && (changeVsPrevious ?? -Infinity) >= 0 ? "positive" : (monthChangePercent ?? Infinity) < 0 ? "cautious" : "neutral";

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
      ? toShare(sum(topTrends.filter((item) => (item.monthChangePercent ?? -Infinity) > 0).map((item) => item.weight)), totalTrackedWeight)
      : null;
  const increasedWeightShare =
    totalTrackedWeight > 0
      ? toShare(sum(topTrends.filter((item) => (item.changeVsPrevious ?? -Infinity) > 0).map((item) => item.weight)), totalTrackedWeight)
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
    holdingsExplanation.push(`Danh mục hiện tại tập trung nhiều nhất vào nhóm ${assetMix[0].label.toLowerCase()}, chiếm ${assetMix[0].share.toFixed(1)}% tổng tỷ trọng.`);
  }
  if (positiveTrendWeight !== null) {
    holdingsExplanation.push(`${positiveTrendWeight.toFixed(1)}% tỷ trọng trong nhóm cổ phiếu nắm giữ lớn đang có diễn biến giá tích cực trong 1 tháng qua.`);
  }
  if (increasedWeightShare !== null) {
    holdingsExplanation.push(`${increasedWeightShare.toFixed(1)}% tỷ trọng trong nhóm nắm giữ lớn đã được nâng thêm so với kỳ công bố trước.`);
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

  const dataFreshness = metrics.latestDate === null ? "Chưa có dữ liệu mới" : `${metrics.latestDate}${dataset.updatedAt ? ` · đồng bộ ${dataset.updatedAt.slice(0, 10)}` : ""}`;

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
