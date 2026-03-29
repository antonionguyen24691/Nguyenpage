import * as cheerio from "cheerio";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fundCatalog, getFundCatalogEntry, type FundCatalogEntry } from "@/lib/fundCatalog";

type FundData = {
  fund: string;
  nav: number;
  date: string;
  source: string;
};

const productIdCache = new Map<string, number | null>();
const SSIAM_PAGE_MAP: Record<string, string> = {
  VLGF: "https://ssiam.com.vn/en/ssiam/fund-information-vlgf",
  SSISCA: "https://ssiam.com.vn/en/fund-information-ssi-sca",
  SSIBF: "https://ssiam.com.vn/en/ssiam/fund-information-ssibf",
  "SSI-EF": "https://ssiam.com.vn/en/ssiam/fund-information-ssief",
};
const DRAGON_CODES = new Set(["DCDS", "DCDE", "DCBF", "DCIP"]);
const VINA_PDF_DAYS = ["08", "10", "12", "14", "15", "18", "20", "25"];
const PDF_WORKER_URL = pathToFileURL(
  path.join(process.cwd(), "node_modules", "pdf-parse", "dist", "pdf-parse", "web", "pdf.worker.min.mjs"),
).href;

function formatRequestDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseLocalizedNav(value: string) {
  const compact = value.replace(/\s+/g, "");
  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  let normalized = compact;

  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot
        ? compact.replace(/\./g, "").replace(",", ".")
        : compact.replace(/,/g, "");
  } else if (lastComma >= 0) {
    const decimalDigits = compact.length - lastComma - 1;
    normalized = decimalDigits <= 2 ? compact.replace(",", ".") : compact.replace(/,/g, "");
  } else if (lastDot >= 0) {
    const decimalDigits = compact.length - lastDot - 1;
    normalized = decimalDigits <= 2 ? compact : compact.replace(/\./g, "");
  }

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeSlashDate(value: string) {
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) {
    return null;
  }

  return `${match[3]}-${match[2]}-${match[1]}`;
}

function padMonth(value: number) {
  return String(value).padStart(2, "0");
}

function shiftMonth(date: Date, offset: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}

function toMonthLabel(date: Date) {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${labels[date.getUTCMonth()]}-${date.getUTCFullYear()}`;
}

function getRecentReportMonths(limit = 4) {
  const now = new Date();
  const start = shiftMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), -1);
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
        headers: { "User-Agent": "Mozilla/5.0" },
        cache: "no-store",
      });
      if (response.ok) {
        return url;
      }
    } catch {
      // continue
    }
  }

  return null;
}

async function extractPdfText(pdfUrl: string) {
  const response = await fetch(pdfUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
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
  return pdfData.text;
}

function extractVinaOfficialNav(entry: FundCatalogEntry, text: string) {
  const asOfMatch = text.match(/As of\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  if (!asOfMatch) {
    return null;
  }

  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const numericLines = lines.filter((line) => /^[\d,]+\.\d$/.test(line));
  const nav = numericLines.length >= 2 ? parseLocalizedNav(numericLines[1]) : null;
  const date = `${asOfMatch[3]}-${asOfMatch[2]}-${asOfMatch[1]}`;

  if (nav === null) {
    return null;
  }

  return {
    fund: entry.code,
    nav,
    date,
    source: `${entry.company} official`,
  } satisfies FundData;
}

async function fetchSsiamNav(entry: FundCatalogEntry): Promise<FundData[]> {
  const pageUrl = SSIAM_PAGE_MAP[entry.code];
  if (!pageUrl) {
    return [];
  }

  try {
    const response = await fetch(pageUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    const sourceText = $(".infonav_history").text().replace(/\s+/g, " ").trim();
    const regex = /(\d{2}\/\d{2}\/\d{4})\s+[\d,]+\s+\d+\s+([\d,]+\.\d{2})/g;
    const rows: FundData[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(sourceText))) {
      const date = normalizeSlashDate(match[1]);
      const nav = parseLocalizedNav(match[2]);
      if (!date || nav === null) {
        continue;
      }

      rows.push({
        fund: entry.code,
        nav,
        date,
        source: `${entry.company} official`,
      });
    }

    return rows;
  } catch (error) {
    console.error(`Error crawling SSIAM official NAV for ${entry.code}:`, error);
    return [];
  }
}

function parseDragonArticleDate(html: string) {
  const text = cheerio.load(html)("body").text().replace(/\s+/g, " ");
  const match = text.match(/Tại thời điểm\s+(\d{2}\/\d{2}\/\d{4})/i);
  return match ? normalizeSlashDate(match[1]) : null;
}

function parseDragonArticleNav(entry: FundCatalogEntry, html: string) {
  const date = parseDragonArticleDate(html);
  if (!date) {
    return null;
  }

  const $ = cheerio.load(html);
  let nav: number | null = null;

  $("tr").each((_, row) => {
    if (nav !== null) {
      return;
    }

    const cells = $(row)
      .find("th,td")
      .map((__, cell) => $(cell).text().replace(/\s+/g, " ").trim())
      .get()
      .filter(Boolean);

    if (cells.length >= 2 && new RegExp(entry.code, "i").test(cells[0])) {
      nav = parseLocalizedNav(cells[1]);
    }
  });

  if (!nav) {
    return null;
  }

  return {
    fund: entry.code,
    nav,
    date,
    source: `${entry.company} official`,
  } satisfies FundData;
}

async function fetchDragonNav(entry: FundCatalogEntry): Promise<FundData[]> {
  if (!DRAGON_CODES.has(entry.code)) {
    return [];
  }

  try {
    const sitemapResponse = await fetch("https://dautu.dragoncapital.com.vn/sitemap.xml", {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    const sitemap = await sitemapResponse.text();
    const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
      .map((match) => match[1])
      .filter(
        (url) =>
          /bao-cao-hoat-dong-quy/i.test(url) &&
          new RegExp(entry.code, "i").test(url),
      )
      .slice(0, 4);

    const rows: FundData[] = [];
    for (const url of urls) {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        cache: "no-store",
      });
      const html = await response.text();
      const parsed = parseDragonArticleNav(entry, html);
      if (parsed) {
        rows.push(parsed);
      }
    }

    return rows;
  } catch (error) {
    console.error(`Error crawling Dragon official NAV for ${entry.code}:`, error);
    return [];
  }
}

async function fetchOfficialNav(entry: FundCatalogEntry): Promise<FundData[]> {
  if (entry.company === "SSIAM") {
    return fetchSsiamNav(entry);
  }

  if (entry.company === "Dragon Capital") {
    return fetchDragonNav(entry);
  }

  if (entry.company === "VinaCapital") {
    const rows: FundData[] = [];
    for (const reportMonth of getRecentReportMonths()) {
      const pdfUrl = await resolveReachableUrl(buildVinaFactsheetCandidates(entry.code, reportMonth));
      if (!pdfUrl) {
        continue;
      }

      try {
        const text = await extractPdfText(pdfUrl);
        const parsed = extractVinaOfficialNav(entry, text);
        if (parsed) {
          rows.push(parsed);
        }
      } catch (error) {
        console.error(`Error crawling VinaCapital official NAV for ${entry.code}:`, error);
      }
    }

    return rows;
  }

  return [];
}

async function resolveFmarketProductId(entry: FundCatalogEntry) {
  if (productIdCache.has(entry.code)) {
    return productIdCache.get(entry.code) ?? null;
  }

  if (entry.productId) {
    productIdCache.set(entry.code, entry.productId);
    return entry.productId;
  }

  if (!entry.slug) {
    productIdCache.set(entry.code, null);
    return null;
  }

  try {
    const response = await fetch(`https://fmarket.vn/quy/${entry.slug}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    const html = await response.text();
    const match = html.match(/productId=(\d+)/);
    const productId = match ? Number(match[1]) : null;
    productIdCache.set(entry.code, productId);
    return productId;
  } catch (error) {
    console.error(`Error resolving productId for ${entry.code}:`, error);
    productIdCache.set(entry.code, null);
    return null;
  }
}

async function fetchFmarketNav(entry: FundCatalogEntry): Promise<FundData[]> {
  const productId = await resolveFmarketProductId(entry);
  if (!productId) {
    return [];
  }

  try {
    const response = await fetch("https://api.fmarket.vn/res/product/get-nav-history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
      },
      body: JSON.stringify({
        productId,
        fromDate: formatRequestDate(
          new Date(Date.UTC(new Date().getUTCFullYear() - 10, 0, 1)),
        ),
        toDate: formatRequestDate(new Date()),
      }),
      cache: "no-store",
    });

    const payload = await response.json();
    if (!Array.isArray(payload?.data)) {
      return [];
    }

    return payload.data
      .map((item: { nav: number | string; navDate: string }) => ({
        fund: entry.code,
        nav: Number(item.nav),
        date: item.navDate,
        source: `${entry.company} via Fmarket`,
      }))
      .filter((item: FundData) => Number.isFinite(item.nav) && item.nav > 0 && item.date);
  } catch (error) {
    console.error(`Error crawling ${entry.code}:`, error);
    return [];
  }
}

export async function crawlVinaCapital(fundName: string): Promise<FundData[]> {
  const entry = getFundCatalogEntry(fundName);
  return entry ? fetchFmarketNav(entry) : [];
}

export async function crawlDragonCapital(fundName: string): Promise<FundData[]> {
  const entry = getFundCatalogEntry(fundName);
  return entry ? fetchFmarketNav(entry) : [];
}

export async function crawlSSIAM(fundName: string): Promise<FundData[]> {
  const entry = getFundCatalogEntry(fundName);
  return entry ? fetchFmarketNav(entry) : [];
}

export async function crawlAllFunds(): Promise<FundData[]> {
  const groups = await Promise.all(
    fundCatalog.map(async (entry) => {
      const [fmarketRows, officialRows] = await Promise.all([
        fetchFmarketNav(entry),
        fetchOfficialNav(entry),
      ]);
      return [...fmarketRows, ...officialRows];
    }),
  );
  const unique = new Map<string, FundData>();

  for (const rows of groups) {
    for (const row of rows) {
      unique.set(`${row.fund}::${row.date}`, row);
    }
  }

  return [...unique.values()].sort(
    (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime(),
  );
}
