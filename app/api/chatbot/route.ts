import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    // Load FAQ from Google Sheet
    const sheetId = process.env.SHEET_ID || "YOUR_SHEET_ID";
    let context = "You are a helpful banking assistant. Answer questions about banking services, loans, accounts, and SaaS products.";

    try {
      const faqRes = await fetch(`https://opensheet.elk.sh/${sheetId}/faq`);
      if (faqRes.ok) {
        const faq = await faqRes.json();
        context = faq
          .map((f: { question: string; answer: string }) => `Q: ${f.question}\nA: ${f.answer}`)
          .join("\n\n");
      }
    } catch {
      // Fallback to default context if sheet is unavailable
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        reply: "Chatbot chưa được cấu hình. Vui lòng thêm OPENAI_API_KEY vào .env.local",
      });
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: context },
          { role: "user", content: message },
        ],
        max_tokens: 500,
      }),
    });

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "Không thể trả lời lúc này.";

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { reply: "Có lỗi xảy ra. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
