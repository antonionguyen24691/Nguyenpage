import OpenAI from "openai";

interface AnalyzeHolding {
  stock_code: string;
  weight: number;
}

interface AnalyzeNavPoint {
  nav: number;
}

interface AnalyzeParams {
  fundCode: string;
  navHistory: AnalyzeNavPoint[];
  topHoldings: AnalyzeHolding[];
}

export async function analyzeFund(params: AnalyzeParams) {
  const { fundCode, navHistory, topHoldings } = params;

  if (!navHistory || navHistory.length < 2) {
    return "Chua co du du lieu lich su de phan tich.";
  }

  const latest = navHistory[0].nav;
  const previous = navHistory[1].nav;
  const change = latest - previous;
  const changePercent = ((change / previous) * 100).toFixed(2);

  const weekOld = navHistory.length >= 7 ? navHistory[6].nav : null;
  let weekInsight = "";

  if (weekOld) {
    const weekChange = latest - weekOld;
    const weekChangePercent = ((weekChange / weekOld) * 100).toFixed(2);
    weekInsight = `So voi tuan truoc, NAV ${weekChange > 0 ? "tang" : "giam"} ${Math.abs(
      Number(weekChangePercent),
    )}%.`;
  }

  const fallbackMessage =
    change > 0
      ? `Tin hieu tich cuc: Quy ${fundCode} dang co dau hieu tang truong ngan han (+${changePercent}% so voi phien lien truoc). ${weekInsight}`
      : change < 0
        ? `Xu huong dieu chinh: Quy ${fundCode} dang dieu chinh ${changePercent}% so voi phien lien truoc. ${weekInsight}`
        : `Phan tich: NAV quy ${fundCode} di ngang trong phien gan nhat. ${weekInsight}`;

  if (!process.env.OPENAI_API_KEY) {
    return fallbackMessage;
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const holdingsText = topHoldings.length
      ? topHoldings.map((holding) => `${holding.stock_code}: ${holding.weight}%`).join(", ")
      : "Khong co du lieu danh muc";

    const prompt = `Ban la chuyen gia phan tich quy dau tu tai Viet Nam. Hay viet doan nhan dinh ngan, suc tich bang tieng Viet cho quy ${fundCode}.
- Bien dong NAV moi nhat: ${changePercent}% so voi phien truoc. ${weekInsight}
- Top danh muc hien tai: ${holdingsText}
Hay danh gia tac dong cua danh muc len xu huong quy va goi y Hold, Buy hoac Wait.`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o-mini",
      max_tokens: 300,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content?.trim() || fallbackMessage;
  } catch (error) {
    console.error("OpenAI call failed:", error);
    return `${fallbackMessage}\n\n(Luu y: Khong the ket noi toi dich vu AI phan tich sau)`;
  }
}
