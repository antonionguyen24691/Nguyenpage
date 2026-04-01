import path from "node:path";
import { pathToFileURL } from "node:url";
import * as cheerio from "cheerio";
import { fundCatalog } from "@/lib/fundCatalog";
import { persistFundData } from "@/lib/fundDataStore";
import { extractHoldingsFromText } from "../ai/holdings-extraction";

type HoldingRow = {
  fund_code: string;
  stock_code: string;
  weight: number;
  date: string;
};

type HoldingsSyncResult = {
  success: boolean;
  fund: string;
  periods: string[];
  source: string;
  holdings_extracted: number;
  note?: string;
  error?: string;
};

const SSIAM_PAGES: Record<string, string> = {
  VLGF: "https://ssiam.com.vn/ssiam/thong-tin-chung-quy-vlgf",
  SSISCA: "https://ssiam.com.vn/ssiam/thong-tin-chung-quy-ssi-sca",
  SSIBF: "https://ssiam.com.vn/ssiam/thong-tin-chung-quy-ssibf",
  "SSI-EF": "https://ssiam.com.vn/ssiam/thong-tin-chung-quy-ssi-ef",
};

const DRAGON_CODES = new Set(["DCDS", "DCDE", "DCBF", "DCIP"]);
const VINA_CODES = new Set(["VEOF", "VESAF", "VFF", "VIBF", "VDEF", "VLBF", "VMEEF"]);
const MAX_HISTORICAL_PERIODS = 4;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const VINA_PDF_DAYS = ["08", "10", "12", "14", "15", "18", "20", "25"];
const PDF_WORKER_URL = pathToFileURL(
  path.join(process.cwd(), "node_modules", "pdf-parse", "dist", "pdf-parse", "web", "pdf.worker.min.mjs"),
).href;

function monthStart(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function padMonth(value: number) {
  return String(value).padStart(2, "0");
}

function toMonthLabel(date: Date) {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${labels[date.getUTCMonth()]}-${date.getUTCFullYear()}`;
}

function shiftMonth(date: Date, offset: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}

function getRecentReportMonths(limit = MAX_HISTORICAL_PERIODS) {
  const base = monthStart(shiftMonth(new Date(), -1));
  const start = new Date(`${base}T00:00:00.000Z`);
  return Array.from({ length: limit }, (_, index) => shiftMonth(start, -index));
}

function buildVinaFactsheetCandidates(fundCode: string, reportMonth: Date) {
  const reportLabel = toMonthLabel(reportMonth);
  const publicationMonths = [shiftMonth(reportMonth, 1), reportMonth, shiftMonth(reportMonth, 2)];
  const candidates: string[] = [];

  for (const publicationMonth of publicationMonths) {
    const year = publicationMonth.getUTCFullYear();
    const month = publicationMonth.getUTCMonth() + 1;
    for (const day of VINA_PDF_DAYS) {
      candidates.push(
        `https://wm.vinacapital.com/wp-content/uploads/${year}/${padMonth(month)}/${year}${padMonth(month)}${day}-VINACAPITAL-${fundCode}_Monthly-Factsheet_${reportLabel}-EN.pdf`,
      );
      candidates.push(
        `https://wm.vinacapital.com/wp-content/uploads/${year}/${padMonth(month)}/${year}${padMonth(month)}${day}-VINACAPITAL-${fundCode}_Monthly-Factsheet_${reportLabel}-VN.pdf`,
      );
    }
  }

  return [...new Set(candidates)];
}

async function resolveReachableUrl(urls: string[]) {
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        headers: { "User-Agent": USER_AGENT },
        cache: "no-store",
      });
      if (response.ok) {
        return url;
      }
    } catch {
      // ignore and continue
    }
  }

  return null;
}

function parseMonthDate(value: string) {
  const normalized = value
    .replace(/\u00a0/g, " ")
    .replace(/\./g, "/")
    .replace(/\s+/g, " ")
    .trim();

  const dayMonthYear = normalized.match(/(\d{1,2})\/(\d{1,2})\/(20\d{2})/);
  if (dayMonthYear) {
    return monthStart(
      new Date(Date.UTC(Number(dayMonthYear[3]), Number(dayMonthYear[2]) - 1, Number(dayMonthYear[1]))),
    );
  }

  const monthYearSlash = normalized.match(/(\d{1,2})\/(20\d{2})/);
  if (monthYearSlash) {
    return `${monthYearSlash[2]}-${String(Number(monthYearSlash[1])).padStart(2, "0")}-01`;
  }

  const monthYearDash = normalized.match(/(\d{1,2})-(20\d{2})/);
  if (monthYearDash) {
    return `${monthYearDash[2]}-${String(Number(monthYearDash[1])).padStart(2, "0")}-01`;
  }

  const englishMonth = normalized.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})/i,
  );
  if (englishMonth) {
    const months = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];
    const monthIndex = months.indexOf(englishMonth[1].toLowerCase());
    if (monthIndex >= 0) {
      return `${englishMonth[2]}-${String(monthIndex + 1).padStart(2, "0")}-01`;
    }
  }

  return null;
}

function parseWeight(value: string) {
  const normalized = value.replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function absoluteUrl(url: string, base: string) {
  return new URL(url, base).toString();
}

function dedupeHoldings(rows: HoldingRow[]) {
  const unique = new Map<string, HoldingRow>();
  for (const row of rows) {
    unique.set(`${row.fund_code}::${row.stock_code}::${row.date}`, row);
  }
  return [...unique.values()].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  );
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

async function extractHoldingsFromPdfUrl(fundCode: string, pdfUrl: string, reportDate: string) {
  const response = await fetch(pdfUrl, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${pdfUrl}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const { PDFParse } = await import("pdf-parse");
  PDFParse.setWorker(PDF_WORKER_URL);
  const parser = new PDFParse({ data: buffer });
  const pdfData = await parser.getText();
  await parser.destroy();
  const holdings = await extractHoldingsFromText(fundCode, pdfData.text, reportDate);
  return holdings
    .map((item: { stock_code: string; weight: number }) => ({
      fund_code: fundCode,
      stock_code: item.stock_code.trim().toUpperCase(),
      weight: Number(item.weight),
      date: reportDate,
    }))
    .filter((item: HoldingRow) => item.stock_code && Number.isFinite(item.weight));
}

async function collectSSIAMHoldings(fundCode: string): Promise<HoldingsSyncResult & { rows: HoldingRow[] }> {
  const pageUrl = SSIAM_PAGES[fundCode];
  if (!pageUrl) {
    return {
      success: false,
      fund: fundCode,
      periods: [],
      source: "SSIAM",
      holdings_extracted: 0,
      error: "No official SSIAM page mapping",
      rows: [],
    };
  }

  const html = await fetchHtml(pageUrl);
  const $ = cheerio.load(html);
  const rows: HoldingRow[] = [];
  const periods = new Set<string>();
  const notes: string[] = [];

  const holdingsDateText = $(".assetDistribution__content__note").first().text().trim();
  const currentDate = parseMonthDate(holdingsDateText);
  if (currentDate) {
    $(".assetDistribution_table table tbody tr").each((_, element) => {
      const cells = $(element)
        .find("td")
        .map((__, cell) => $(cell).text().trim())
        .get();
      if (cells.length >= 4) {
        const stockCode = cells[0].trim().toUpperCase();
        const weight = parseWeight(cells[3]);
        if (stockCode && weight !== null) {
          rows.push({
            fund_code: fundCode,
            stock_code: stockCode,
            weight,
            date: currentDate,
          });
          periods.add(currentDate);
        }
      }
    });
  }

  const documentLinks = $(".formDocument__document_item")
    .map((_, element) => {
      const title = $(element).find(".formDocument__document_title").text().trim();
      const href = $(element).find('a[title="Download"]').attr("href");
      return { title, href };
    })
    .get()
    .filter((item) => item.href && /monthly report/i.test(item.title))
    .slice(0, MAX_HISTORICAL_PERIODS);

  for (const document of documentLinks) {
    const reportDate = parseMonthDate(document.title);
    if (!document.href || !reportDate || periods.has(reportDate)) {
      continue;
    }
    try {
      const pdfRows = await extractHoldingsFromPdfUrl(
        fundCode,
        absoluteUrl(document.href, pageUrl),
        reportDate,
      );
      pdfRows.forEach((row: HoldingRow) => rows.push(row));
      periods.add(reportDate);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown PDF extraction error";
      notes.push(`${reportDate}: ${message}`);
    }
  }

  return {
    success: rows.length > 0,
    fund: fundCode,
    periods: [...periods].sort((left, right) => new Date(right).getTime() - new Date(left).getTime()),
    source: "SSIAM official page + monthly reports",
    holdings_extracted: rows.length,
    note: notes.length > 0 ? notes.join(" | ") : undefined,
    rows: dedupeHoldings(rows),
  };
}

function parseDragonArticleDate(url: string, html: string) {
  const fromUrl = url.match(/thang-(\d{1,2})[.-](20\d{2})/i);
  if (fromUrl) {
    return `${fromUrl[2]}-${String(Number(fromUrl[1])).padStart(2, "0")}-01`;
  }

  const fromHeading = html.match(/tháng\s+(\d{1,2})[./-](20\d{2})/i);
  if (fromHeading) {
    return `${fromHeading[2]}-${String(Number(fromHeading[1])).padStart(2, "0")}-01`;
  }

  return null;
}

function parseDragonHoldingsTable(fundCode: string, html: string, reportDate: string) {
  const $ = cheerio.load(html);
  const rows: HoldingRow[] = [];

  $("table").each((_, table) => {
    const headerText = $(table).find("th").map((__, th) => $(th).text().trim()).get().join(" | ");
    if (!/Mã Cổ Phiếu|Ticker/i.test(headerText) || !/% NAV|Tỷ trọng/i.test(headerText)) {
      return;
    }

    $(table)
      .find("tbody tr")
      .each((__, element) => {
        const cells = $(element)
          .find("td")
          .map((___, cell) => $(cell).text().trim())
          .get();
        if (cells.length >= 3) {
          const stockCode = cells[0].replace(/\s+/g, "").toUpperCase();
          const weight = parseWeight(cells[cells.length - 1]);
          if (stockCode && weight !== null) {
            rows.push({
              fund_code: fundCode,
              stock_code: stockCode,
              weight,
              date: reportDate,
            });
          }
        }
      });
  });

  return dedupeHoldings(rows);
}

function extractDragonPdfUrl(html: string) {
  const match = html.match(/https:\/\/[^"' ]+\.pdf/gi);
  return match?.[0] ?? null;
}

async function collectDragonHoldings(fundCode: string): Promise<HoldingsSyncResult & { rows: HoldingRow[] }> {
  const sitemap = await fetchHtml("https://dautu.dragoncapital.com.vn/sitemap.xml");
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map((match) => match[1])
    .filter(
      (url) =>
        /tin-tuc\//.test(url) &&
        new RegExp(fundCode, "i").test(url) &&
        /(cap-nhat-danh-muc|bao-cao-hoat-dong)/i.test(url),
    )
    .sort((left, right) => {
      const leftMatch = left.match(/thang-(\d{1,2})[.-](20\d{2})/i);
      const rightMatch = right.match(/thang-(\d{1,2})[.-](20\d{2})/i);
      const leftTime = leftMatch
        ? new Date(Date.UTC(Number(leftMatch[2]), Number(leftMatch[1]) - 1, 1)).getTime()
        : 0;
      const rightTime = rightMatch
        ? new Date(Date.UTC(Number(rightMatch[2]), Number(rightMatch[1]) - 1, 1)).getTime()
        : 0;
      return rightTime - leftTime;
    });

  const rows: HoldingRow[] = [];
  const periods = new Set<string>();

  for (const url of urls) {
    const html = await fetchHtml(url);
    const reportDate = parseDragonArticleDate(url, html);
    if (!reportDate || periods.has(reportDate)) {
      continue;
    }
    let articleRows = parseDragonHoldingsTable(fundCode, html, reportDate);
    if (articleRows.length === 0) {
      const pdfUrl = extractDragonPdfUrl(html);
      if (pdfUrl) {
        try {
          articleRows = await extractHoldingsFromPdfUrl(fundCode, pdfUrl, reportDate);
        } catch {
          articleRows = [];
        }
      }
    }
    if (articleRows.length > 0) {
      articleRows.forEach((row) => rows.push(row));
      periods.add(reportDate);
    }
    if (periods.size >= MAX_HISTORICAL_PERIODS) {
      break;
    }
  }

  return {
    success: rows.length > 0,
    fund: fundCode,
    periods: [...periods].sort((left, right) => new Date(right).getTime() - new Date(left).getTime()),
    source: "Dragon Capital sitemap + article holdings tables",
    holdings_extracted: rows.length,
    rows: dedupeHoldings(rows),
  };
}

async function collectVinaHoldings(fundCode: string): Promise<HoldingsSyncResult & { rows: HoldingRow[] }> {
  const rows: HoldingRow[] = [];
  const periods = new Set<string>();
  const notes: string[] = [];

  for (const reportMonth of getRecentReportMonths()) {
    const reportDate = monthStart(reportMonth);
    const pdfUrl = await resolveReachableUrl(buildVinaFactsheetCandidates(fundCode, reportMonth));

    if (!pdfUrl) {
      notes.push(`${reportDate}: factsheet not found`);
      continue;
    }

    try {
      const pdfRows = await extractHoldingsFromPdfUrl(fundCode, pdfUrl, reportDate);
      if (pdfRows.length > 0) {
        pdfRows.forEach((row: HoldingRow) => rows.push(row));
        periods.add(reportDate);
      } else {
        notes.push(`${reportDate}: no holdings extracted`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown PDF extraction error";
      notes.push(`${reportDate}: ${message}`);
    }
  }

  return {
    success: rows.length > 0,
    fund: fundCode,
    periods: [...periods].sort((left, right) => new Date(right).getTime() - new Date(left).getTime()),
    source: "VinaCapital factsheet PDFs",
    holdings_extracted: rows.length,
    note: notes.length > 0 ? notes.join(" | ") : undefined,
    rows: dedupeHoldings(rows),
  };
}

export async function processFundHoldings(fundCode: string) {
  try {
    if (SSIAM_PAGES[fundCode]) {
      const result = await collectSSIAMHoldings(fundCode);
      if (result.rows.length > 0) {
        await persistFundData({
          funds: fundCatalog.map((entry) => ({
            code: entry.code,
            name: entry.name,
            company: entry.company,
          })),
          holdings: result.rows,
        });
      }
      return result;
    }

    if (DRAGON_CODES.has(fundCode)) {
      const result = await collectDragonHoldings(fundCode);
      if (result.rows.length > 0) {
        await persistFundData({
          funds: fundCatalog.map((entry) => ({
            code: entry.code,
            name: entry.name,
            company: entry.company,
          })),
          holdings: result.rows,
        });
      }
      return result;
    }

    if (VINA_CODES.has(fundCode)) {
      const result = await collectVinaHoldings(fundCode);
      if (result.rows.length > 0) {
        await persistFundData({
          funds: fundCatalog.map((entry) => ({
            code: entry.code,
            name: entry.name,
            company: entry.company,
          })),
          holdings: result.rows,
        });
      }
      return result;
    }

    return {
      success: false,
      fund: fundCode,
      periods: [],
      source: "unknown",
      holdings_extracted: 0,
      error: "No collector configured",
      rows: [],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      fund: fundCode,
      periods: [],
      source: "collector",
      holdings_extracted: 0,
      error: message,
      rows: [],
    };
  }
}

export async function syncAllHoldings() {
  const targets = fundCatalog
    .map((entry) => entry.code)
    .filter((code) => SSIAM_PAGES[code] || DRAGON_CODES.has(code) || VINA_CODES.has(code));

  const results = [];
  for (const code of targets) {
    results.push(await processFundHoldings(code));
  }
  return results;
}
