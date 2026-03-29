import { NextResponse } from "next/server";
import { defaultHomeConfig } from "@/lib/homeConfig";
import { getFundDataset } from "@/lib/fundDataStore";

function detectFundCode(message: string, availableCodes: string[]) {
  const upper = message.toUpperCase();
  return availableCodes.find((code) => upper.includes(code));
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const dataset = await getFundDataset();
    const availableCodes = dataset.funds.map((fund) => fund.code.toUpperCase());
    const detectedFundCode = detectFundCode(String(message || ""), availableCodes);

    const latestNavContext = dataset.funds
      .map((fund) => {
        const history = dataset.nav.filter((row) => row.fund_code === fund.code);
        const latest = history.at(-1);
        return latest
          ? `${fund.code}: NAV ${Number(latest.nav).toLocaleString("vi-VN")} ngày ${latest.date}`
          : `${fund.code}: chưa có NAV mới`;
      })
      .slice(0, 12)
      .join("\n");

    const fundSpecificContext = detectedFundCode
      ? (() => {
          const holdings = dataset.holdings
            .filter((row) => row.fund_code === detectedFundCode)
            .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
          const latestDate = holdings[0]?.date;
          const topHoldings = latestDate
            ? holdings
                .filter((row) => row.date === latestDate)
                .sort((left, right) => right.weight - left.weight)
                .slice(0, 8)
                .map((row) => `${row.stock_code} ${row.weight.toFixed(2)}%`)
                .join(", ")
            : "chưa có";
          return `Ngữ cảnh quỹ ${detectedFundCode}: top holdings gần nhất ${latestDate ?? "N/A"} gồm ${topHoldings}.`;
        })()
      : "Người dùng chưa nhắc tới mã quỹ cụ thể.";

    const productContext = [
      `Banking cards: ${defaultHomeConfig.bankingCards.map((card) => card.title).join(", ")}`,
      `SaaS cards: ${defaultHomeConfig.saasCards.map((card) => card.title).join(", ")}`,
      `Fund codes đang theo dõi: ${availableCodes.join(", ")}`,
      `NAV snapshot:\n${latestNavContext}`,
      fundSpecificContext,
    ].join("\n\n");

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        reply:
          "Chatbot chưa được cấu hình OPENAI_API_KEY. Hệ thống vẫn đang hoạt động nhưng chưa thể tạo câu trả lời AI lúc này.",
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.35,
        max_tokens: 520,
        messages: [
          {
            role: "system",
            content: `Bạn là Banker Assistant cho một hệ thống tài chính + SaaS.

Mục tiêu:
- Trả lời bằng tiếng Việt rõ ràng, có định hướng, ít lan man.
- Nếu câu hỏi liên quan tài khoản/dịch vụ: gợi ý luồng phù hợp và bước tiếp theo.
- Nếu câu hỏi liên quan quỹ: dùng dữ liệu được cung cấp, nêu rõ nếu dữ liệu holdings/lịch sử còn thiếu.
- Không bịa thông số. Không hứa lợi nhuận.
- Ưu tiên cấu trúc 3 phần ngắn: Kết luận nhanh / Vì sao / Bước tiếp theo.

Ngữ cảnh hệ thống:
${productContext}`,
          },
          {
            role: "user",
            content: String(message || ""),
          },
        ],
      }),
    });

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      "Hiện chưa thể trả lời. Hãy thử lại với câu hỏi cụ thể hơn về dịch vụ hoặc mã quỹ.";

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { reply: "Có lỗi xảy ra. Vui lòng thử lại sau." },
      { status: 500 },
    );
  }
}
