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

export async function analyzeFund(params: AnalyzeParams) {
  const { fundCode, navHistory, topHoldings, peerComparison = {}, metrics } = params;

  if (!navHistory || navHistory.length < 2) {
    return "Chưa có đủ dữ liệu lịch sử để phân tích xu hướng quỹ này.";
  }

  const peerLines = Object.entries(peerComparison)
    .filter(([code]) => code !== "self")
    .map(([code, series]) => {
      const latest = series.at(-1)?.value ?? null;
      return latest === null ? null : `${code}: ${latest.toFixed(2)} điểm chuẩn hóa`;
    })
    .filter(Boolean)
    .join(", ");

  const holdingsText = topHoldings.length
    ? topHoldings.map((holding) => `${holding.stock_code} ${holding.weight.toFixed(2)}%`).join(", ")
    : "Chưa có dữ liệu danh mục gần nhất";

  const fallback = [
    `Xu hướng ngắn hạn của ${fundCode}: ${formatPercent(metrics.daily.percent)} theo ngày, ${formatPercent(metrics.monthly.percent)} theo 1 tháng và ${formatPercent(metrics.quarterly.percent)} theo 1 quý.`,
    `NAV gần nhất: ${metrics.latestNav?.toLocaleString("vi-VN") ?? "N/A"} tại ${metrics.latestDate ?? "N/A"}.`,
    `Biên độ lịch sử: thấp nhất ${metrics.low?.toLocaleString("vi-VN") ?? "N/A"}, cao nhất ${metrics.high?.toLocaleString("vi-VN") ?? "N/A"}.`,
    topHoldings.length
      ? `Danh mục đang nghiêng về: ${holdingsText}.`
      : "Chưa có dữ liệu holdings đủ sâu để kết luận về cấu trúc danh mục.",
    peerLines ? `Đối chiếu peer group: ${peerLines}.` : "Chưa có peer group để đối chiếu.",
  ].join("\n");

  if (!process.env.OPENAI_API_KEY) {
    return fallback;
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `Bạn là chuyên gia phân tích quỹ mở tại Việt Nam.

Hãy viết phần nhận định ngắn gọn, sắc nét, bằng tiếng Việt cho quỹ ${fundCode}.
Yêu cầu:
- Trả lời theo 4 đoạn ngắn có tiêu đề in đậm: **Xu hướng**, **Danh mục**, **Đối chiếu**, **Theo dõi tiếp**.
- Không tâng bốc, không hô hào mua bán quá mức.
- Nếu dữ liệu holdings còn mỏng thì nói rõ hạn chế.
- Tập trung vào ý nghĩa vận hành cho dashboard, không viết kiểu marketing.

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
      temperature: 0.35,
    });

    return completion.choices[0]?.message?.content?.trim() || fallback;
  } catch (error) {
    console.error("OpenAI call failed:", error);
    return fallback;
  }
}
