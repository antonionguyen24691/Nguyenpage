export type FundCategory = "equity" | "bond" | "balanced";

export type FundCatalogEntry = {
  code: string;
  name: string;
  company: string;
  category: FundCategory;
  productId?: number;
  slug?: string;
  benchmark?: string;
  priority?: number;
};

export const fundCatalog: FundCatalogEntry[] = [
  {
    code: "VEOF",
    name: "Quỹ Cổ phiếu Tiếp cận Thị trường VinaCapital",
    company: "VinaCapital",
    category: "equity",
    productId: 20,
    slug: "veof",
    benchmark: "VN-Index",
    priority: 1,
  },
  {
    code: "VESAF",
    name: "Quỹ Cổ phiếu Hưng thịnh VinaCapital",
    company: "VinaCapital",
    category: "equity",
    productId: 23,
    slug: "vesaf",
    benchmark: "VN-Index",
    priority: 2,
  },
  {
    code: "VFF",
    name: "Quỹ Trái phiếu Bảo thịnh VinaCapital",
    company: "VinaCapital",
    category: "bond",
    productId: 21,
    slug: "vff",
    benchmark: "VN Bond",
    priority: 3,
  },
  {
    code: "VIBF",
    name: "Quỹ Cân bằng Tuệ sáng VinaCapital",
    company: "VinaCapital",
    category: "balanced",
    productId: 22,
    slug: "vibf",
    benchmark: "VN-Index",
    priority: 4,
  },
  {
    code: "VDEF",
    name: "Quỹ Cổ tức VinaCapital VDEF",
    company: "VinaCapital",
    category: "equity",
    productId: 80,
    slug: "vdef",
    benchmark: "VN-Index",
    priority: 5,
  },
  {
    code: "VLBF",
    name: "Quỹ Trái phiếu VinaCapital VLBF",
    company: "VinaCapital",
    category: "bond",
    productId: 53,
    slug: "vlbf",
    benchmark: "VN Bond",
    priority: 6,
  },
  {
    code: "SSISCA",
    name: "Quỹ Cổ phiếu Trưởng thành SSI",
    company: "SSIAM",
    category: "equity",
    productId: 11,
    slug: "ssisca",
    benchmark: "VN-Index",
    priority: 7,
  },
  {
    code: "SSIBF",
    name: "Quỹ Trái phiếu SSI",
    company: "SSIAM",
    category: "bond",
    productId: 8,
    slug: "ssibf",
    benchmark: "VN Bond",
    priority: 8,
  },
  {
    code: "VLGF",
    name: "Vietnam Long-term Growth Fund",
    company: "SSIAM",
    category: "equity",
    productId: 49,
    slug: "vlgf",
    benchmark: "VN-Index",
    priority: 9,
  },
  {
    code: "SSI-EF",
    name: "SSI-EF",
    company: "SSIAM",
    category: "equity",
    productId: 90,
    slug: "ssi-ef",
    benchmark: "VN-Index",
    priority: 10,
  },
  {
    code: "DCDS",
    name: "Quỹ Đầu tư Chứng khoán Năng động DC",
    company: "Dragon Capital",
    category: "equity",
    productId: 28,
    slug: "dcds",
    benchmark: "VN-Index",
    priority: 11,
  },
  {
    code: "DCDE",
    name: "Quỹ Cổ phiếu DCDE",
    company: "Dragon Capital",
    category: "equity",
    productId: 25,
    slug: "dcde",
    benchmark: "VN-Index",
    priority: 12,
  },
  {
    code: "DCBF",
    name: "Quỹ Trái phiếu Dragon Capital",
    company: "Dragon Capital",
    category: "bond",
    productId: 27,
    slug: "dcbf",
    benchmark: "VN Bond",
    priority: 13,
  },
  {
    code: "DCIP",
    name: "Quỹ Thu nhập Cố định Dragon Capital",
    company: "Dragon Capital",
    category: "bond",
    productId: 67,
    slug: "dcip",
    benchmark: "VN Bond",
    priority: 14,
  },
  {
    code: "DCBC",
    name: "Quỹ DCBC",
    company: "Dragon Capital",
    category: "equity",
    slug: "dcbc",
    benchmark: "VN-Index",
    priority: 15,
  },
];

export const fundCatalogMap = new Map(
  fundCatalog.map((entry) => [entry.code.toUpperCase(), entry]),
);

export function getFundCatalogEntry(code: string | null | undefined) {
  if (!code) {
    return undefined;
  }

  return fundCatalogMap.get(code.toUpperCase());
}

export function getPeerFundCodes(code: string, limit = 3) {
  const current = getFundCatalogEntry(code);
  if (!current) {
    return [];
  }

  return fundCatalog
    .filter(
      (entry) =>
        entry.code !== current.code &&
        (entry.company === current.company || entry.category === current.category),
    )
    .sort((left, right) => (left.priority ?? 99) - (right.priority ?? 99))
    .slice(0, limit)
    .map((entry) => entry.code);
}
