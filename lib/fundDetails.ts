import * as cheerio from "cheerio";
import { getFundCatalogEntry, type FundCatalogEntry } from "@/lib/fundCatalog";
import {
  aggregateHoldingRows,
  calculateNavMetrics,
  normalizeDate,
  sanitizeNavHistory,
  type FundHoldingRecord,
  type FundNavRecord,
  type HoldingAssetType,
} from "@/lib/fundAnalytics";

type FundDataset = {
  nav: FundNavRecord[];
  holdings: FundHoldingRecord[];
};

export type FundDetailOverviewItem = {
  label: string;
  value: string;
};

export type FundDetailAllocationItem = {
  label: string;
  weight: number;
  share: number;
};

export type FundDetailDocument = {
  title: string;
  category: string;
  url: string;
  date: string | null;
};

export type FundDetailsPayload = {
  code: string;
  name: string;
  company: string;
  category: string;
  benchmark: string | null;
  latestNavDate: string | null;
  latestHoldingsDate: string | null;
  summary: string;
  overview: FundDetailOverviewItem[];
  assetAllocation: FundDetailAllocationItem[];
  sectorAllocation: FundDetailAllocationItem[];
  documents: FundDetailDocument[];
};

const SSIAM_PAGE_CANDIDATES: Record<string, string[]> = {
  VLGF: [
    "https://ssiam.com.vn/thong-tin-chung-quy-vlgf",
    "https://ssiam.com.vn/ssiam/thong-tin-chung-quy-vlgf",
  ],
  SSISCA: [
    "https://ssiam.com.vn/thong-tin-chung-quy-ssi-sca",
    "https://ssiam.com.vn/ssiam/thong-tin-chung-quy-ssi-sca",
  ],
  SSIBF: [
    "https://ssiam.com.vn/thong-tin-chung-quy-ssibf",
    "https://ssiam.com.vn/ssiam/thong-tin-chung-quy-ssibf",
  ],
  "SSI-EF": [
    "https://ssiam.com.vn/thong-tin-chung-quy-ssi-ef",
    "https://ssiam.com.vn/ssiam/thong-tin-chung-quy-ssi-ef",
  ],
};

const DRAGON_PAGE_MAP: Record<string, string> = {
  DCDS: "https://dautu.dragoncapital.com.vn/",
  DCDE: "https://dautu.dragoncapital.com.vn/",
  DCBF: "https://dautu.dragoncapital.com.vn/",
  DCIP: "https://dautu.dragoncapital.com.vn/",
  DCBC: "https://dautu.dragoncapital.com.vn/",
};

const sectorMap: Record<string, string> = {
  ACB: "Ngân hàng",
  BAF: "Nông nghiệp",
  BCM: "Bất động sản khu công nghiệp",
  BID: "Ngân hàng",
  BVH: "Bảo hiểm",
  CTG: "Ngân hàng",
  DGC: "Hóa chất",
  DPM: "Phân bón",
  FPT: "Công nghệ",
  GAS: "Năng lượng",
  GMD: "Logistics",
  HCM: "Chứng khoán",
  HDB: "Ngân hàng",
  HPG: "Vật liệu cơ bản",
  KBC: "Bất động sản khu công nghiệp",
  MBB: "Ngân hàng",
  MSN: "Hàng tiêu dùng",
  MWG: "Bán lẻ",
  NLG: "Bất động sản",
  PHR: "Khu công nghiệp",
  PNJ: "Bán lẻ",
  REE: "Hạ tầng - điện nước",
  SSI: "Chứng khoán",
  STB: "Ngân hàng",
  TCB: "Ngân hàng",
  TDM: "Điện nước",
  TLG: "Tiêu dùng",
  TNG: "Dệt may",
  TPB: "Ngân hàng",
  VCB: "Ngân hàng",
  VHM: "Bất động sản",
  VIC: "Bất động sản",
  VIX: "Chứng khoán",
  VNM: "Hàng tiêu dùng",
  VPI: "Bất động sản",
  VRE: "Bán lẻ",
};

function startOfMonth(value: string) {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatMonthLabel(date: Date) {
  return `${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

function getCategoryLabel(category: string) {
  switch (category) {
    case "bond":
      return "Ưu tiên trái phiếu";
    case "balanced":
      return "Tài sản phân bổ";
    default:
      return "Ưu tiên cổ phiếu";
  }
}

function getAssetTypeLabel(assetType: HoldingAssetType) {
  switch (assetType) {
    case "bond":
      return "Trái phiếu";
    case "cash":
      return "Tiền mặt";
    case "deposit":
      return "Tiền gửi";
    case "fund":
      return "Quỹ / CCQ";
    case "other":
      return "Tài sản khác";
    default:
      return "Cổ phiếu";
  }
}

function groupWeights<T extends string>(rows: Array<{ key: T; weight: number }>) {
  const grouped = new Map<T, number>();

  for (const row of rows) {
    grouped.set(row.key, (grouped.get(row.key) ?? 0) + Number(row.weight));
  }

  const total = [...grouped.values()].reduce((sum, value) => sum + value, 0) || 1;

  return [...grouped.entries()]
    .map(([label, weight]) => ({
      label,
      weight,
      share: (weight / total) * 100,
    }))
    .sort((left, right) => right.weight - left.weight);
}

function inferSector(stockCode: string, assetType: HoldingAssetType) {
  if (assetType !== "equity") {
    return getAssetTypeLabel(assetType);
  }

  return sectorMap[stockCode] ?? "Khác";
}

function absoluteUrl(url: string, base: string) {
  return new URL(url, base).toString();
}

async function resolveFirstAvailableUrl(urls: string[]) {
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        cache: "no-store",
      });

      if (response.ok) {
        return {
          url,
          html: await response.text(),
        };
      }
    } catch {
      // ignore and continue with the fallback candidate
    }
  }

  return null;
}

function inferDocumentDate(href: string) {
  const compact = href.match(/(20\d{6})/);
  if (compact) {
    return `${compact[1].slice(0, 4)}-${compact[1].slice(4, 6)}-${compact[1].slice(6, 8)}`;
  }

  const monthYear = href.match(/(0?\d)[_/-](20\d{2})/);
  if (monthYear) {
    return `${monthYear[2]}-${String(Number(monthYear[1])).padStart(2, "0")}-01`;
  }

  return null;
}

function categorizeSsiamDocument(href: string) {
  const normalized = decodeURIComponent(href).toLowerCase();
  if (normalized.includes("ban cao bach")) {
    return { title: "Bản cáo bạch", category: "Bản cáo bạch" };
  }
  if (normalized.includes("dieu le")) {
    return { title: "Điều lệ quỹ", category: "Điều lệ" };
  }
  if (normalized.includes("factsheet")) {
    return { title: "Factsheet", category: "Factsheet" };
  }
  if (normalized.includes("bao cao thang")) {
    return { title: "Báo cáo tháng", category: "Báo cáo tháng" };
  }
  if (normalized.includes("giatritaisanrongquymo")) {
    return { title: "Giá trị tài sản ròng", category: "NAV hằng ngày" };
  }
  if (normalized.includes("bcthaydoigttsr")) {
    return { title: "Báo cáo thay đổi GTTSR", category: "NAV hằng tuần" };
  }
  return { title: "Tài liệu quỹ", category: "Tài liệu" };
}

function buildVinaDocuments(entry: FundCatalogEntry, referenceDate: string | null) {
  const documents: FundDetailDocument[] = [];

  if (entry.slug) {
    documents.push({
      title: "Trang quỹ chính thức",
      category: "Tổng quan",
      url: `https://wm.vinacapital.com/vi/investment-solutions/onshore-funds/${entry.slug}/`,
      date: null,
    });
  }

  if (!referenceDate) {
    return documents;
  }

  return documents;
}

function buildSsiamDocuments(entry: FundCatalogEntry, referenceDate: string | null) {
  const pageUrl = SSIAM_PAGE_CANDIDATES[entry.code]?.[0];
  if (!pageUrl) {
    return [];
  }

  return [
    {
      title: "Trang quỹ chính thức",
      category: "Tổng quan",
      url: pageUrl,
      date: null,
    },
    {
      title: "Khu vực công bố thông tin và tài liệu",
      category: "Cổng thông tin",
      url: pageUrl,
      date: referenceDate,
    },
  ] satisfies FundDetailDocument[];
}

function buildDragonDocuments(entry: FundCatalogEntry, referenceDate: string | null) {
  const pageUrl = DRAGON_PAGE_MAP[entry.code] ?? "https://dautu.dragoncapital.com.vn/";
  return [
    {
      title: "Trang quỹ / công bố thông tin",
      category: "Tổng quan",
      url: pageUrl,
      date: null,
    },
    {
      title: "Khu vực công bố NAV / báo cáo",
      category: "Cổng thông tin",
      url: pageUrl,
      date: referenceDate,
    },
  ] satisfies FundDetailDocument[];
}

async function fetchSsiamDocuments(entry: FundCatalogEntry) {
  const pageCandidates = SSIAM_PAGE_CANDIDATES[entry.code];
  if (!pageCandidates) {
    return [];
  }

  try {
    const resolved = await resolveFirstAvailableUrl(pageCandidates);
    if (!resolved) {
      return [];
    }

    const { url: pageUrl, html } = resolved;
    const $ = cheerio.load(html);
    const documents = new Map<string, FundDetailDocument>();

    $("a[href]").each((_, element) => {
      const href = $(element).attr("href");
      if (!href || !/\.pdf|\.xlsx/i.test(href)) {
        return;
      }

      const url = absoluteUrl(href, pageUrl);
      const meta = categorizeSsiamDocument(href);
      documents.set(url, {
        title: meta.title,
        category: meta.category,
        url,
        date: inferDocumentDate(href),
      });
    });

    return [...documents.values()]
      .sort((left, right) => new Date(right.date ?? 0).getTime() - new Date(left.date ?? 0).getTime())
      .slice(0, 8);
  } catch {
    return [];
  }
}

async function fetchDragonDocuments(entry: FundCatalogEntry) {
  const pageUrl = DRAGON_PAGE_MAP[entry.code] ?? "https://dautu.dragoncapital.com.vn/";

  try {
    const response = await fetch("https://dautu.dragoncapital.com.vn/sitemap.xml", {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    if (!response.ok) {
      return [];
    }

    const sitemap = await response.text();
    return [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
      .map((match) => match[1])
      .filter((url) => /bao-cao-hoat-dong-quy/i.test(url) && new RegExp(entry.code, "i").test(url))
      .slice(0, 4)
      .map((url) => ({
        title: "Bài công bố hoạt động quỹ",
        category: "Công bố thông tin",
        url,
        date: inferDocumentDate(url),
      }));
  } catch {
    return [
      {
        title: "Trang quỹ / công bố thông tin",
        category: "Cổng thông tin",
        url: pageUrl,
        date: null,
      },
    ];
  }
}

export async function resolveOfficialDocuments(fundCode: string, fallbackDocuments: FundDetailDocument[]) {
  const entry = getFundCatalogEntry(fundCode);
  if (!entry) {
    return fallbackDocuments;
  }

  if (entry.company === "SSIAM") {
    const liveDocuments = await fetchSsiamDocuments(entry);
    return liveDocuments.length > 0 ? [...fallbackDocuments.slice(0, 1), ...liveDocuments] : fallbackDocuments;
  }

  if (entry.company === "Dragon Capital") {
    const liveDocuments = await fetchDragonDocuments(entry);
    return liveDocuments.length > 0 ? [...fallbackDocuments.slice(0, 1), ...liveDocuments] : fallbackDocuments;
  }

  return fallbackDocuments;
}

function buildDocuments(entry: FundCatalogEntry, latestNavDate: string | null, latestHoldingsDate: string | null) {
  const referenceDate = latestHoldingsDate ?? latestNavDate;

  if (entry.company === "VinaCapital") {
    return buildVinaDocuments(entry, referenceDate);
  }

  if (entry.company === "SSIAM") {
    return buildSsiamDocuments(entry, referenceDate);
  }

  if (entry.company === "Dragon Capital") {
    return buildDragonDocuments(entry, referenceDate);
  }

  return [];
}

export function buildFundDetails(dataset: FundDataset, fundCode: string): FundDetailsPayload | null {
  const entry = getFundCatalogEntry(fundCode);
  if (!entry) {
    return null;
  }

  const navHistory = sanitizeNavHistory(
    dataset.nav.filter((row) => row.fund_code === fundCode.toUpperCase()),
  );
  const holdingsRows = aggregateHoldingRows(
    dataset.holdings.filter((row) => row.fund_code === fundCode.toUpperCase()),
  );

  const latestNav = navHistory.at(-1) ?? null;
  const latestHoldingsDate =
    [...new Set(holdingsRows.map((row) => normalizeDate(row.date)))]
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
  const latestHoldings = latestHoldingsDate
    ? holdingsRows.filter((row) => normalizeDate(row.date) === latestHoldingsDate)
    : [];
  const metrics = calculateNavMetrics(navHistory);

  const assetAllocation = groupWeights(
    latestHoldings.map((row) => ({
      key: getAssetTypeLabel(row.asset_type),
      weight: Number(row.weight),
    })),
  ).slice(0, 8);

  const sectorAllocation = groupWeights(
    latestHoldings.map((row) => ({
      key: inferSector(row.stock_code, row.asset_type),
      weight: Number(row.weight),
    })),
  ).slice(0, 10);

  const overview: FundDetailOverviewItem[] = [
    { label: "Công ty quản lý", value: entry.company },
    { label: "Nhóm chiến lược", value: getCategoryLabel(entry.category) },
    { label: "Chỉ số tham chiếu", value: entry.benchmark ?? "Chưa cấu hình" },
    {
      label: "NAV gần nhất",
      value:
        metrics.latestNav !== null && metrics.latestNav !== undefined
          ? `${metrics.latestNav.toLocaleString("vi-VN")} (${metrics.latestDate ?? "N/A"})`
          : "Chưa có dữ liệu",
    },
    {
      label: "Kỳ danh mục gần nhất",
      value: latestHoldingsDate
        ? new Date(latestHoldingsDate).toLocaleDateString("vi-VN", {
            month: "2-digit",
            year: "numeric",
          })
        : "Chưa có dữ liệu",
    },
    {
      label: "Biến động 1 quý",
      value:
        metrics.quarterly.percent !== null && metrics.quarterly.percent !== undefined
          ? `${metrics.quarterly.percent >= 0 ? "+" : ""}${metrics.quarterly.percent.toFixed(2)}%`
          : "N/A",
    },
  ];

  const summary = [
    `${entry.name} thuộc nhóm ${getCategoryLabel(entry.category).toLowerCase()} của ${entry.company}.`,
    latestNav?.date
      ? `NAV gần nhất trong dataset là ngày ${new Date(latestNav.date).toLocaleDateString("vi-VN")}.`
      : "Dataset hiện chưa có NAV mới cho quỹ này.",
    latestHoldingsDate
      ? `Danh mục gần nhất đang ghi nhận tại kỳ ${formatMonthLabel(startOfMonth(latestHoldingsDate))}.`
      : "Dataset hiện chưa có kỳ danh mục gần nhất.",
  ].join(" ");

  return {
    code: entry.code,
    name: entry.name,
    company: entry.company,
    category: getCategoryLabel(entry.category),
    benchmark: entry.benchmark ?? null,
    latestNavDate: latestNav?.date ?? null,
    latestHoldingsDate,
    summary,
    overview,
    assetAllocation,
    sectorAllocation,
    documents: buildDocuments(entry, latestNav?.date ?? null, latestHoldingsDate),
  };
}
