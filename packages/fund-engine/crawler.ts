import { fundCatalog, getFundCatalogEntry, type FundCatalogEntry } from "@/lib/fundCatalog";

type FundData = {
  fund: string;
  nav: number;
  date: string;
  source: string;
};

const productIdCache = new Map<string, number | null>();

function formatRequestDate(date: Date) {
  return date.toISOString().slice(0, 10);
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
  const groups = await Promise.all(fundCatalog.map((entry) => fetchFmarketNav(entry)));
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
