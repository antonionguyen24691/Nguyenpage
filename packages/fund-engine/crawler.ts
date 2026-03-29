import * as cheerio from "cheerio";
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

function formatRequestDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseLocalizedNav(value: string) {
  const normalized = value.replace(/\s+/g, "").replace(/\./g, "").replace(",", ".");
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
