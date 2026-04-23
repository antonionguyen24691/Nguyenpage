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

function extractNumericToken(value: string) {
  if (!/^-?\d{1,3}(?:\.\d+)?%?$/.test(value)) {
    return null;
  }

  const numeric = Number(value.replace("%", ""));
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 100) {
    return null;
  }

  return numeric;
}

function tokenizeHoldingBlock(sectionText: string) {
  return sectionText
    .replace(/\r/g, "\n")
    .replace(/[|•]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function extractHoldingsFromTokenBlock(fundCode: string, sectionText: string) {
  const tokens = tokenizeHoldingBlock(sectionText);
  const holdings: ExtractedHolding[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index].replace(/[^A-Z0-9.-]/g, "");
    if (!/^[A-Z][A-Z0-9.-]{1,7}$/.test(token)) {
      continue;
    }
    if (token === fundCode || token.startsWith("VINACAPITAL") || STOP_TICKERS.has(token)) {
      continue;
    }

    let weight: number | null = null;
    for (let lookahead = index + 1; lookahead < Math.min(tokens.length, index + 12); lookahead += 1) {
      const numeric = extractNumericToken(tokens[lookahead]);
      if (numeric === null) {
        continue;
      }
      weight = numeric;
      index = lookahead;
      break;
    }

    if (weight === null) {
      continue;
    }

    holdings.push({
      stock_code: token,
      weight,
    });
  }

  const deduped = new Map<string, ExtractedHolding>();
  for (const item of holdings) {
    if (!deduped.has(item.stock_code)) {
      deduped.set(item.stock_code, item);
    }
  }

  return [...deduped.values()].slice(0, 10);
}

function extractHoldingsFromMetricTable(fundCode: string, sectionText: string) {
  const normalized = sectionText.replace(/\s+/g, " ").trim();
  const pattern =
    /\b([A-Z][A-Z0-9.-]{1,7})\b\s+(.+?)\s+(\d{1,2}(?:\.\d+)?)\s+(\d{1,2}(?:\.\d+)?)\s+(\d{1,2}(?:\.\d+)?)(?=\s+[A-Z][A-Z0-9.-]{1,7}\s+|$)/g;
  const holdings: ExtractedHolding[] = [];

  for (const match of normalized.matchAll(pattern)) {
    const stockCode = match[1].toUpperCase();
    if (stockCode === fundCode || stockCode.startsWith("VINACAPITAL") || STOP_TICKERS.has(stockCode)) {
      continue;
    }

    const weight = extractNumericToken(match[3]);
    if (weight === null) {
      continue;
    }

    holdings.push({
      stock_code: stockCode,
      weight,
    });
  }

  const deduped = new Map<string, ExtractedHolding>();
  for (const item of holdings) {
    if (!deduped.has(item.stock_code)) {
      deduped.set(item.stock_code, item);
    }
  }

  return [...deduped.values()].slice(0, 10);
}

function extractHoldingsFromStructuredBlocks(fundCode: string, pdfText: string) {
  const normalized = normalizeText(pdfText);
  const blockPatterns = [
    /Ticker\s+Sector\s+% of NAV([\s\S]{0,2000}?)(?:TOTAL\s+\d+(?:\.\d+)?|Performance Summary|Monthly Commentary|Top 10 Holdings)/i,
    /Top Holdings\s+Security Name\s+Allocation \(%\)\s+Effective Yield\(%\)\s+Duration \(years\)([\s\S]{0,2000}?)(?:Fund Information|Contact Information|Disclaimer|--\s+\d+\s+of\s+\d+\s+--)/i,
    /Top Holdings\s+Security Name\s+Allocation \(%\)([\s\S]{0,2000}?)(?:Fund Information|Contact Information|Disclaimer|--\s+\d+\s+of\s+\d+\s+--)/i,
  ];

  for (const pattern of blockPatterns) {
    const match = normalized.match(pattern);
    if (!match?.[1]) {
      continue;
    }

    const metricTableHoldings = extractHoldingsFromMetricTable(fundCode, match[1]);
    if (metricTableHoldings.length >= 5) {
      return metricTableHoldings;
    }

    const holdings = extractHoldingsFromTokenBlock(fundCode, match[1]);
    if (holdings.length >= 5) {
      return holdings;
    }
  }

  return [];
}

function extractHoldingsHeuristically(fundCode: string, pdfText: string): ExtractedHolding[] {
  const structuredHoldings = extractHoldingsFromStructuredBlocks(fundCode, pdfText);
  if (structuredHoldings.length >= 5) {
    return structuredHoldings;
  }

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
