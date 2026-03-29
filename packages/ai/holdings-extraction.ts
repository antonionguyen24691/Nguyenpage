import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

type ExtractedHolding = {
  stock_code: string;
  weight: number;
};

const STOP_TICKERS = new Set([
  "NAV",
  "YTD",
  "AUM",
  "VND",
  "PIT",
  "PWC",
  "ETF",
  "USD",
  "VINA",
  "INDEX",
  "CASH",
  "BANK",
  "BANKS",
  "FUND",
  "SECTOR",
  "TOTAL",
  "JUN",
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
]);

function normalizeText(pdfText: string) {
  return pdfText
    .replace(/\r/g, "")
    .replace(/â€™/g, "'")
    .replace(/â€œ|â€/g, '"')
    .replace(/Ã¡/g, "á")
    .replace(/Ã©/g, "é")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ãº/g, "ú");
}

function getSecondPageText(pdfText: string) {
  const normalized = normalizeText(pdfText);
  const pages = normalized.split(/--\s+\d+\s+of\s+\d+\s+--/i).map((part) => part.trim()).filter(Boolean);
  return pages.length > 1 ? pages[pages.length - 1] : normalized;
}

function extractWeightBlock(lines: string[]) {
  const numericLines = lines.map((line) => line.trim());
  const blocks: number[][] = [];
  let current: number[] = [];

  for (const line of numericLines) {
    if (/^-?\d{1,2}(?:\.\d{1,2})?%?$/.test(line)) {
      const value = Number(line.replace("%", ""));
      if (Number.isFinite(value) && value > 0 && value <= 100) {
        current.push(value);
        continue;
      }
    }

    if (current.length >= 5) {
      blocks.push([...current]);
    }
    current = [];
  }

  if (current.length >= 5) {
    blocks.push(current);
  }

  return blocks.sort((left, right) => right.length - left.length)[0] ?? [];
}

function extractTickerCandidates(sectionText: string, fundCode: string) {
  const lines = sectionText.split("\n").map((line) => line.trim()).filter(Boolean);
  const unique = new Set<string>();
  const tickers: string[] = [];

  for (const line of lines) {
    const token = line.replace(/[^A-Z0-9]/g, "");
    if (!/^[A-Z][A-Z0-9]{1,5}$/.test(token)) {
      continue;
    }
    if (token === fundCode || token.startsWith("VINACAPITAL")) {
      continue;
    }
    if (STOP_TICKERS.has(token)) {
      continue;
    }
    if (unique.has(token)) {
      continue;
    }

    unique.add(token);
    tickers.push(token);
  }

  return tickers;
}

function extractHoldingsHeuristically(fundCode: string, pdfText: string): ExtractedHolding[] {
  const secondPageText = getSecondPageText(pdfText);
  const lines = secondPageText.split("\n").map((line) => line.trim()).filter(Boolean);
  const monthLineIndex = lines.findIndex((line) => /Jan\s+Feb\s+Mar/i.test(line));
  const weightLines = extractWeightBlock(monthLineIndex > 0 ? lines.slice(0, monthLineIndex) : lines);

  if (weightLines.length === 0) {
    return [];
  }

  const topHoldingsIndex = secondPageText.search(/Top holdings/i);
  const sectionStart = topHoldingsIndex >= 0 ? Math.max(0, topHoldingsIndex - 4000) : 0;
  const sectionEnd =
    topHoldingsIndex >= 0 ? Math.min(secondPageText.length, topHoldingsIndex + 1800) : secondPageText.length;
  const tickerCandidates = extractTickerCandidates(secondPageText.slice(sectionStart, sectionEnd), fundCode);
  const pairCount = Math.min(weightLines.length, tickerCandidates.length, 10);

  if (pairCount < 5) {
    return [];
  }

  return Array.from({ length: pairCount }, (_, index) => ({
    stock_code: tickerCandidates[index],
    weight: weightLines[index],
  }));
}

export async function extractHoldingsFromText(fundCode: string, pdfText: string, reportDate: string) {
  const heuristicHoldings = extractHoldingsHeuristically(fundCode, pdfText);
  if (heuristicHoldings.length > 0) {
    return heuristicHoldings;
  }

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
