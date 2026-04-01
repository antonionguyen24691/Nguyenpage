import * as cheerio from "cheerio";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as XLSX from "xlsx";
import { fundCatalog, getFundCatalogEntry, type FundCatalogEntry } from "@/lib/fundCatalog";

type FundData = {
  fund: string;
  nav: number;
  date: string;
  source: string;
};

const productIdCache = new Map<string, number | null>();
const SSIAM_PAGE_MAP: Record<string, string> = {
  VLGF: "https://ssiam.com.vn/ssiam/thong-tin-chung-quy-vlgf",
  SSISCA: "https://ssiam.com.vn/ssiam/thong-tin-chung-quy-ssi-sca",
  SSIBF: "https://ssiam.com.vn/ssiam/thong-tin-chung-quy-ssibf",
  "SSI-EF": "https://ssiam.com.vn/ssiam/thong-tin-chung-quy-ssi-ef",
};
const DRAGON_CODES = new Set(["DCDS", "DCDE", "DCBF", "DCIP"]);
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const DEFAULT_HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept-Language": "vi,en-US;q=0.9,en;q=0.8",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};
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
  const match = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) {
    return null;
  }

  return `${match[3]}-${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`;
}

function normalizeCompactDate(value: string) {
  const match = value.match(/(20\d{2})(\d{2})(\d{2})/);
  if (!match) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function normalizeLongMonthDate(value: string) {
  const direct = Date.parse(value);
  if (!Number.isNaN(direct)) {
    return new Date(direct).toISOString().slice(0, 10);
  }

  const monthMatch = value.match(
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(20\d{2})/i,
  );
  if (!monthMatch) {
    return null;
  }

  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const monthIndex = months.indexOf(monthMatch[2].slice(0, 3).toLowerCase());
  if (monthIndex < 0) {
    return null;
  }

  return `${monthMatch[3]}-${String(monthIndex + 1).padStart(2, "0")}-${String(Number(monthMatch[1])).padStart(2, "0")}`;
}

function shiftUtcDays(input: Date, delta: number) {
  const date = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + delta);
  return date;
}

function formatCompactUtcDate(input: Date) {
  return `${input.getUTCFullYear()}${String(input.getUTCMonth() + 1).padStart(2, "0")}${String(input.getUTCDate()).padStart(2, "0")}`;
}

function formatDotUtcDate(input: Date) {
  return `${String(input.getUTCDate()).padStart(2, "0")}.${String(input.getUTCMonth() + 1).padStart(2, "0")}.${input.getUTCFullYear()}`;
}

function extractDragonMonthFromUrl(url: string) {
  const dotStyle = url.match(/thang-(\d{1,2})[.-](20\d{2})/i);
  if (!dotStyle) {
    return null;
  }

  return `${dotStyle[2]}-${String(Number(dotStyle[1])).padStart(2, "0")}-01`;
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

function extractVinaOfficialNav(entry: FundCatalogEntry, text: string, fallbackDate: string | null = null) {
  const asOfMatch = text.match(/As of\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  const viDateMatch = text.match(/Tại ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(20\d{2})/i);
  const date =
    (asOfMatch ? `${asOfMatch[3]}-${asOfMatch[2]}-${asOfMatch[1]}` : null) ??
    (viDateMatch
      ? `${viDateMatch[3]}-${String(Number(viDateMatch[2])).padStart(2, "0")}-${String(Number(viDateMatch[1])).padStart(2, "0")}`
      : null) ??
    fallbackDate;
  if (!date) {
    return null;
  }

  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const numericLines = lines.filter((line) => /^[\d,]+\.\d$/.test(line));
  const nav = numericLines.length >= 2 ? parseLocalizedNav(numericLines[1]) : null;

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

function buildVinaFundPageUrl(entry: FundCatalogEntry) {
  if (!entry.slug) {
    return null;
  }

  return `https://wm.vinacapital.com/vi/investment-solutions/onshore-funds/${entry.slug}/`;
}

function parseVinaNavXlsx(entry: FundCatalogEntry, buffer: Buffer, fallbackDate: string | null) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) {
    return null;
  }

  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(firstSheet, {
    header: 1,
    blankrows: false,
    defval: null,
  });
  const dateText = rows
    .flat()
    .find((cell): cell is string => typeof cell === "string" && /As at|Tại ngày/i.test(cell));
  const parsedDate =
    (dateText?.match(/As at\s+(.+)/i)?.[1]
      ? normalizeLongMonthDate(dateText.match(/As at\s+(.+)/i)?.[1] ?? "")
      : null) ??
    (dateText?.match(/Tại ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(20\d{2})/i)
      ? `${dateText.match(/Tại ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(20\d{2})/i)?.[3]}-${String(Number(dateText.match(/Tại ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(20\d{2})/i)?.[2] ?? 0)).padStart(2, "0")}-${String(Number(dateText.match(/Tại ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(20\d{2})/i)?.[1] ?? 0)).padStart(2, "0")}`
      : null) ??
    fallbackDate;

  const unitNavRow = rows.find(
    (row) =>
      typeof row[1] === "string" &&
      /per Fund Certificate|một chứng chỉ quỹ/i.test(row[1]),
  );
  const navCell = unitNavRow?.slice(3).find(
    (cell) => typeof cell === "number" || (typeof cell === "string" && /[\d,.]/.test(cell)),
  );
  const nav =
    typeof navCell === "number" ? navCell : typeof navCell === "string" ? parseLocalizedNav(navCell) : null;

  if (!parsedDate || nav === null) {
    return null;
  }

  return {
    fund: entry.code,
    nav,
    date: parsedDate,
    source: `${entry.company} official daily NAV`,
  } satisfies FundData;
}

function parseVinaDailyNavLinks(entry: FundCatalogEntry, html: string) {
  const $ = cheerio.load(html);
  const links = new Map<string, string>();

  $("a[href$='.xlsx']").each((_, element) => {
    const href = $(element).attr("href");
    const label = $(element).text().replace(/\s+/g, " ").trim();
    if (!href || !new RegExp(`_${entry.code}_BC_Ngay`, "i").test(href)) {
      return;
    }

    const date =
      normalizeSlashDate(label.match(/NAV Ngày\s+(\d{2}\/\d{2}\/\d{4})/i)?.[1] ?? "") ??
      normalizeCompactDate(href.match(/_Ky-so_(20\d{6})/i)?.[1] ?? "");
    if (!date) {
      return;
    }

    links.set(date, href);
  });

  return [...links.entries()]
    .sort((left, right) => new Date(right[0]).getTime() - new Date(left[0]).getTime())
    .map(([date, url]) => ({ date, url }));
}

function parseVinaFactsheetLinks(entry: FundCatalogEntry, html: string) {
  const $ = cheerio.load(html);
  const links = new Map<string, string>();

  $("a[href$='.pdf']").each((_, element) => {
    const href = $(element).attr("href");
    if (!href || !new RegExp(`VINACAPITAL-${entry.code}_Monthly-Factsheet`, "i").test(href)) {
      return;
    }

    const reportDate =
      normalizeSlashDate($(element).text().match(/(\d{2}\/\d{2}\/\d{4})/)?.[1] ?? "") ??
      normalizeCompactDate(href.match(/\/(20\d{6})-VINACAPITAL-/i)?.[1] ?? "");
    if (!reportDate) {
      return;
    }

    links.set(reportDate, href);
  });

  return [...links.entries()]
    .sort((left, right) => new Date(right[0]).getTime() - new Date(left[0]).getTime())
    .map(([date, url]) => ({ date, url }));
}

// Kept for future VinaCapital direct collector recovery when official pages become crawlable again.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchVinaNav(entry: FundCatalogEntry): Promise<FundData[]> {
  const pageUrl = buildVinaFundPageUrl(entry);
  if (!pageUrl) {
    return [];
  }

  try {
    const response = await fetch(pageUrl, {
      headers: DEFAULT_HEADERS,
      cache: "no-store",
    });
    const html = await response.text();
    const rows: FundData[] = [];

    for (const report of parseVinaDailyNavLinks(entry, html).slice(0, 40)) {
      try {
        const xlsxResponse = await fetch(report.url, {
          headers: DEFAULT_HEADERS,
          cache: "no-store",
        });
        if (!xlsxResponse.ok) {
          continue;
        }
        const parsed = parseVinaNavXlsx(
          entry,
          Buffer.from(await xlsxResponse.arrayBuffer()),
          report.date,
        );
        if (parsed) {
          rows.push(parsed);
        }
      } catch (error) {
        console.error(`Error parsing VinaCapital daily NAV for ${entry.code}:`, error);
      }
    }

    for (const report of parseVinaFactsheetLinks(entry, html).slice(0, 6)) {
      try {
        const text = await extractPdfText(report.url);
        const parsed = extractVinaOfficialNav(entry, text, report.date);
        if (parsed) {
          rows.push(parsed);
        }
      } catch (error) {
        console.error(`Error parsing VinaCapital factsheet NAV for ${entry.code}:`, error);
      }
    }

    const unique = new Map<string, FundData>();
    for (const row of rows) {
      unique.set(row.date, row);
    }

    return [...unique.values()].sort(
      (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime(),
    );
  } catch (error) {
    console.error(`Error crawling VinaCapital official NAV for ${entry.code}:`, error);
    return [];
  }
}

function buildVinaStaticXlsxCandidates(entry: FundCatalogEntry, daysBack = 120) {
  const seen = new Set<string>();
  const candidates: Array<{ date: string; url: string }> = [];
  const today = new Date();
  const publishOffsets = [1, 0, 2, 3];

  const pushCandidate = (navDate: Date, url: string) => {
    if (seen.has(url)) {
      return;
    }

    seen.add(url);
    candidates.push({
      date: navDate.toISOString().slice(0, 10),
      url,
    });
  };

  for (let days = 0; days < daysBack; days += 1) {
    const navDate = shiftUtcDays(today, -days);
    const navCompact = formatCompactUtcDate(navDate);
    const navDot = formatDotUtcDate(navDate);

    for (const offset of publishOffsets) {
      const publishDate = shiftUtcDays(navDate, offset);
      if (publishDate.getTime() > today.getTime()) {
        continue;
      }

      const publishCompact = formatCompactUtcDate(publishDate);
      const uploadBase = `https://wm.vinacapital.com/wp-content/uploads/${publishDate.getUTCFullYear()}/${String(publishDate.getUTCMonth() + 1).padStart(2, "0")}`;

      if (entry.code === "VEOF") {
        pushCandidate(navDate, `${uploadBase}/${publishCompact}_VEOF_BC_Ngay_Ky-so_${navCompact}.xlsx`);
        pushCandidate(navDate, `${uploadBase}/${publishCompact}_VEOF_BC_Ngay_Ky-so_${navCompact}-1.xlsx`);
        continue;
      }

      if (["VDEF", "VESAF", "VIBF", "VMEEF"].includes(entry.code)) {
        pushCandidate(navDate, `${uploadBase}/${publishCompact}_${entry.code}_BC_Daily_${navCompact}.xlsx`);
        pushCandidate(navDate, `${uploadBase}/${publishCompact}_${entry.code}_BC_Daily_${navCompact}-1.xlsx`);
        continue;
      }

      if (entry.code === "VLBF") {
        pushCandidate(navDate, `${uploadBase}/${publishCompact}-VLBF-NAV-NGAY-${navDot}.xlsx`);
        pushCandidate(navDate, `${uploadBase}/${publishCompact}-VLBF-NAV-NGAY-${navDot}-1.xlsx`);
        continue;
      }

      if (entry.code === "VFF") {
        pushCandidate(navDate, `${uploadBase}/${publishCompact}_VFF_BC_Weekly_${navCompact}.xlsx`);
        pushCandidate(navDate, `${uploadBase}/${publishCompact}_VFF_BC_Weekly_${navCompact}-1.xlsx`);
        pushCandidate(navDate, `${uploadBase}/${publishCompact}_VFF_BC_Ky_Ky-so_${navCompact}.xlsx`);
        pushCandidate(navDate, `${uploadBase}/${publishCompact}_VFF_BC_Ky_Ky-so_${navCompact}-1.xlsx`);
      }
    }
  }

  return candidates;
}

// Kept for future VinaCapital static-file collector recovery when naming patterns stabilize again.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchVinaStaticNav(entry: FundCatalogEntry): Promise<FundData[]> {
  try {
    const rows: FundData[] = [];
    let hits = 0;
    let missesAfterFirstHit = 0;

    for (const report of buildVinaStaticXlsxCandidates(entry)) {
      try {
        const xlsxResponse = await fetch(report.url, {
          headers: DEFAULT_HEADERS,
          cache: "no-store",
        });
        if (!xlsxResponse.ok) {
          if (hits > 0) {
            missesAfterFirstHit += 1;
            if (missesAfterFirstHit >= 28) {
              break;
            }
          }
          continue;
        }

        missesAfterFirstHit = 0;
        const parsed = parseVinaNavXlsx(
          entry,
          Buffer.from(await xlsxResponse.arrayBuffer()),
          report.date,
        );
        if (parsed) {
          rows.push(parsed);
          hits += 1;
          if (hits >= 90) {
            break;
          }
        }
      } catch (error) {
        console.error(`Error parsing VinaCapital static NAV for ${entry.code}:`, error);
      }
    }

    const unique = new Map<string, FundData>();
    for (const row of rows) {
      unique.set(row.date, row);
    }

    return [...unique.values()].sort(
      (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime(),
    );
  } catch (error) {
    console.error(`Error crawling VinaCapital static NAV for ${entry.code}:`, error);
    return [];
  }
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
    const rows: FundData[] = [];

    $(".infonav_history tr").each((_, row) => {
      const cells = $(row)
        .find("th,td")
        .map((__, cell) => $(cell).text().replace(/\s+/g, " ").trim())
        .get()
        .filter(Boolean);

      if (cells.length < 4) {
        return;
      }

      const date = normalizeSlashDate(cells[0]);
      const nav = parseLocalizedNav(cells[3]);
      if (!date || nav === null) {
        return;
      }

      rows.push({
        fund: entry.code,
        nav,
        date,
        source: `${entry.company} official`,
      });
    });

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
      headers: DEFAULT_HEADERS,
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
      .sort((left, right) => {
        const leftDate =
          normalizeCompactDate(left.match(/(20\d{6})/i)?.[1] ?? "") ??
          extractDragonMonthFromUrl(left) ??
          "1970-01-01";
        const rightDate =
          normalizeCompactDate(right.match(/(20\d{6})/i)?.[1] ?? "") ??
          extractDragonMonthFromUrl(right) ??
          "1970-01-01";
        return new Date(rightDate).getTime() - new Date(leftDate).getTime();
      })
      .slice(0, 4);

    const rows: FundData[] = [];
    for (const url of urls) {
      const response = await fetch(url, {
        headers: DEFAULT_HEADERS,
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
    return [];
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

async function fetchFmarketSpotNav(entry: FundCatalogEntry): Promise<FundData[]> {
  if (!entry.slug) {
    return [];
  }

  try {
    const response = await fetch(`https://fmarket.vn/quy/${entry.slug}`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const date = normalizeSlashDate(
      html.match(/Cập nhật ngày\s+(\d{1,2}\/\d{1,2}\/\d{4})/i)?.[1] ?? "",
    );
    const nav = parseLocalizedNav(
      html.match(/Giá gần nhất<\/span><!----><span[^>]*class="nav">([\d,.\s]+)\s*VND/i)?.[1] ?? "",
    );

    if (!date || nav === null) {
      return [];
    }

    return [
      {
        fund: entry.code,
        nav,
        date,
        source: `${entry.company} via Fmarket page`,
      },
    ];
  } catch (error) {
    console.error(`Error crawling Fmarket spot NAV for ${entry.code}:`, error);
    return [];
  }
}

async function fetchFmarketNav(entry: FundCatalogEntry): Promise<FundData[]> {
  const productId = await resolveFmarketProductId(entry);
  const spotRowsPromise = fetchFmarketSpotNav(entry);
  if (!productId) {
    return spotRowsPromise;
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

    const historyRows = payload.data
      .map((item: { nav: number | string; navDate: string }) => ({
        fund: entry.code,
        nav: Number(item.nav),
        date: item.navDate,
        source: `${entry.company} via Fmarket`,
      }))
      .filter((item: FundData) => Number.isFinite(item.nav) && item.nav > 0 && item.date);
    const spotRows = await spotRowsPromise;

    return [...historyRows, ...spotRows];
  } catch (error) {
    console.error(`Error crawling ${entry.code}:`, error);
    return spotRowsPromise;
  }
}

export async function crawlVinaCapital(fundName: string): Promise<FundData[]> {
  const entry = getFundCatalogEntry(fundName);
  if (!entry || entry.company !== "VinaCapital") {
    return [];
  }

  const [fmarketRows, officialRows] = await Promise.all([
    fetchFmarketNav(entry),
    fetchOfficialNav(entry),
  ]);
  return [...fmarketRows, ...officialRows];
}

export async function crawlDragonCapital(fundName: string): Promise<FundData[]> {
  const entry = getFundCatalogEntry(fundName);
  if (!entry || entry.company !== "Dragon Capital") {
    return [];
  }

  const [fmarketRows, officialRows] = await Promise.all([
    fetchFmarketNav(entry),
    fetchOfficialNav(entry),
  ]);
  return [...fmarketRows, ...officialRows];
}

export async function crawlSSIAM(fundName: string): Promise<FundData[]> {
  const entry = getFundCatalogEntry(fundName);
  if (!entry || entry.company !== "SSIAM") {
    return [];
  }

  const [fmarketRows, officialRows] = await Promise.all([
    fetchFmarketNav(entry),
    fetchOfficialNav(entry),
  ]);
  return [...fmarketRows, ...officialRows];
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
