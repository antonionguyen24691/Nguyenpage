import OpenAI from "openai";
import type { ChartPoint, FundNavRecord } from "@/lib/fundAnalytics";

interface AnalyzeHolding {
  stock_code: string;
  weight: number;
}

interface AnalyzeMetrics {
  latestNav: number | null;
  latestDate: string | null;
  daily: { absolute: number | null; percent: number | null };
  monthly: { absolute: number | null; percent: number | null };
  quarterly: { absolute: number | null; percent: number | null };
  sinceInception: { absolute: number | null; percent: number | null };
  high: number | null;
  low: number | null;
  pointCount: number;
}

interface AnalyzeParams {
  fundCode: string;
  navHistory: FundNavRecord[];
  topHoldings: AnalyzeHolding[];
  peerComparison?: Record<string, ChartPoint[]>;
  metrics: AnalyzeMetrics;
}

function formatPercent(value: number | null) {
  return value === null ? "N/A" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function buildFallbackInsight({
  fundCode,
  topHoldings,
  peerLines,
  metrics,
}: {
  fundCode: string;
  topHoldings: AnalyzeHolding[];
  peerLines: string;
  metrics: AnalyzeMetrics;
}) {
  const holdingsText = topHoldings.length
    ? topHoldings.map((holding) => `${holding.stock_code} ${holding.weight.toFixed(2)}%`).join(", ")
    : "Chưa có dữ liệu danh mục gần nhất.";

  return [
    `**Xu hướng**\nBiến động ngắn hạn của ${fundCode} hiện là ${formatPercent(metrics.daily.percent)} theo ngày, ${formatPercent(metrics.monthly.percent)} theo 1 tháng và ${formatPercent(metrics.quarterly.percent)} theo 1 quý.`,
    `**Dữ liệu NAV**\nNAV gần nhất là ${metrics.latestNav?.toLocaleString("vi-VN") ?? "N/A"} tại ${metrics.latestDate ?? "N/A"}. Biên độ dữ liệu hiện có trải từ ${metrics.low?.toLocaleString("vi-VN") ?? "N/A"} đến ${metrics.high?.toLocaleString("vi-VN") ?? "N/A"} với ${metrics.pointCount} điểm NAV.`,
    `**Danh mục**\n${holdingsText}`,
    `**Đối chiếu**\n${peerLines || "Chưa có đủ dữ liệu để đối chiếu với nhóm quỹ tương đồng."}`,
    `**Theo dõi tiếp**\nƯu tiên theo dõi độ đầy chuỗi NAV, các kỳ holdings T-1/T-2/T-3 và mức ổn định của nguồn dữ liệu trước khi kết luận sâu hơn.`,
  ].join("\n\n");
}

export async function analyzeFund(params: AnalyzeParams) {
  const { fundCode, navHistory, topHoldings, peerComparison = {}, metrics } = params;

  if (!navHistory || navHistory.length < 2) {
    return [
      "**Xu hướng**",
      "Chưa có đủ dữ liệu lịch sử để phân tích xu hướng quỹ này.",
      "",
      "**Theo dõi tiếp**",
      "Cần bổ sung thêm điểm NAV hoặc kết nối lại nguồn crawl cho quỹ đang chọn.",
    ].join("\n");
  }

  const peerLines = Object.entries(peerComparison)
    .filter(([code]) => code !== "self")
    .map(([code, series]) => {
      const latest = series.at(-1)?.value ?? null;
      return latest === null ? null : `${code}: ${latest.toFixed(2)} điểm chuẩn hóa`;
    })
    .filter(Boolean)
    .join(", ");

  const fallback = buildFallbackInsight({
    fundCode,
    topHoldings,
    peerLines,
    metrics,
  });

  if (!process.env.OPENAI_API_KEY) {
    return fallback;
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const holdingsText = topHoldings.length
      ? topHoldings.map((holding) => `${holding.stock_code} ${holding.weight.toFixed(2)}%`).join(", ")
      : "Chưa có dữ liệu danh mục gần nhất.";

    const prompt = `Bạn là chuyên gia phân tích quỹ mở tại Việt Nam.

Hãy viết phần nhận định dashboard cho quỹ ${fundCode} bằng tiếng Việt chuẩn, có dấu đầy đủ.

Yêu cầu bắt buộc:
- Chia đúng 5 phần, mỗi phần bắt đầu bằng tiêu đề markdown đậm:
  **Xu hướng**
  **Dữ liệu NAV**
  **Danh mục**
  **Đối chiếu**
  **Theo dõi tiếp**
- Mỗi phần chỉ 1-2 câu ngắn, rõ ràng, không viết dồn thành một đoạn dài.
- Không dùng giọng marketing.
- Nếu holdings hoặc peer comparison còn thiếu thì nói rõ giới hạn dữ liệu.

Dữ liệu:
- NAV gần nhất: ${metrics.latestNav ?? "N/A"} tại ${metrics.latestDate ?? "N/A"}
- Biến động ngày: ${formatPercent(metrics.daily.percent)}
- Biến động 1 tháng: ${formatPercent(metrics.monthly.percent)}
- Biến động 1 quý: ${formatPercent(metrics.quarterly.percent)}
- Từ đầu chuỗi: ${formatPercent(metrics.sinceInception.percent)}
- Đỉnh/đáy chuỗi: ${metrics.high ?? "N/A"} / ${metrics.low ?? "N/A"}
- Số điểm NAV: ${metrics.pointCount}
- Top holdings: ${holdingsText}
- Peer comparison: ${peerLines || "Chưa có"}
`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o-mini",
      max_tokens: 420,
      temperature: 0.25,
    });

    return completion.choices[0]?.message?.content?.trim() || fallback;
  } catch (error) {
    console.error("OpenAI call failed:", error);
    return fallback;
  }
}
