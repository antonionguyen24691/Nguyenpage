import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function extractHoldingsFromText(fundCode: string, pdfText: string, reportDate: string) {
  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY for Holdings AI Extraction");
    return [];
  }

  const prompt = `You are a financial data extractor. I will provide raw text extracted from a fund's monthly factsheet PDF.
Fund: ${fundCode}
Date of report: ${reportDate}

Your task: Find the "Top Holdings" or "Danh mục đầu tư" or "Top 10" section. Extract the list of stock tickers (e.g., FPT, MWG, HPG) and their corresponding weight percentage (%).
Return strictly a JSON object with a "holdings" array. Do not include markdown formatting.
Format:
{
  "holdings": [
    { "stock_code": "FPT", "weight": 15.2 },
    { "stock_code": "MBB", "weight": 8.5 }
  ]
}
If you cannot find any holdings, return an empty array [].

Raw Text:
${pdfText.substring(0, 20000)}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '{"holdings": []}';
    const parsed = JSON.parse(content);
    return parsed.holdings || [];
  } catch (error) {
    console.error(`AI Extraction failed for ${fundCode}:`, error);
    return [];
  }
}
