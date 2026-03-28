import { db } from "@/packages/db";

export type PageBlockType =
  | "hero"
  | "features"
  | "columns"
  | "header"
  | "text"
  | "image"
  | "button";

export interface SitePageBlock {
  id: string;
  type: PageBlockType;
  content: unknown;
}

export interface SitePage {
  id: string | number;
  title: string;
  slug: string;
  status?: string;
  views?: string;
  blocks?: SitePageBlock[];
}

export const defaultSitePages: SitePage[] = [
  {
    id: "home-seed",
    title: "Nguyen Page Landing",
    slug: "/",
    status: "published",
    views: "12.5k",
    blocks: [
      {
        id: "home-hero",
        type: "hero",
        content: {
          title: "Nen tang tai chinh va SaaS cho van hanh hien dai",
          subtitle:
            "Tu van, dang ky, dashboard va page trinh bay duoc quy ve mot he thong co the chinh sua truc tiep trong admin.",
          cta: "Bat dau tu van ngay",
          ctaUrl: "/dang-ky",
          bgImage:
            "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1400&q=80",
        },
      },
      {
        id: "home-services",
        type: "features",
        content: [
          {
            title: "Tai khoan & ho kinh doanh",
            desc: "Mo tai khoan so dep, ho tro ho kinh doanh va onboarding nhanh cho doanh nghiep moi.",
            ctaText: "Xem dich vu",
            url: "/service/bank",
          },
          {
            title: "Giai phap SaaS theo quy trinh",
            desc: "Dung he thong cho phong tro, POS, accounting va van hanh subscription tu mot bo khung co san.",
            ctaText: "Xem giai phap",
            url: "/service/saas",
          },
          {
            title: "Trang con co the builder",
            desc: "Landing page va page con dung cung mot renderer nen admin co the sua cau truc ma khong can sua code.",
            ctaText: "Mo CMS Admin",
            url: "/admin",
          },
        ],
      },
      {
        id: "home-columns",
        type: "columns",
        content: {
          left:
            "He thong nay duoc set up lai theo huong admin-first.\n\nNeu trang co slug `/` trong Page Builder co block, frontend se render truc tiep tu bo block do.\n\nBan co the doi hero, them feature grid, doi CTA va sap xep section ngay trong admin.",
          right:
            "Ngoai landing page, cac slug nhu `/service/bank` va `/service/saas` cung da co bo block seed san.\n\nNhieu page hon co the duoc tao tiep tu Page Builder ma khong can tach rieng logic render.\n\nDieu nay giup UI dep hon nhung van giu duoc kha nang quan tri that su.",
        },
      },
      {
        id: "home-cta",
        type: "button",
        content: {
          text: "Mo trang dich vu tai chinh",
          url: "/service/bank",
        },
      },
    ],
  },
  {
    id: "bank-seed",
    title: "Dich vu Tai chinh",
    slug: "/service/bank",
    status: "published",
    views: "3.4k",
    blocks: [
      {
        id: "bank-hero",
        type: "hero",
        content: {
          title: "Dich vu tai chinh duoc trinh bay ro, gon va chot nhanh hon",
          subtitle:
            "Page nay da duoc seed de admin co the sua thong diep, CTA va bo cuc ma khong phai dung lai tu dau.",
          cta: "Dang ky nhan tu van",
          ctaUrl: "/dang-ky",
          bgImage:
            "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1400&q=80",
        },
      },
      {
        id: "bank-grid",
        type: "features",
        content: [
          {
            title: "Tai khoan doanh nghiep",
            desc: "Quy trinh mo tai khoan, onboarding ho kinh doanh va bo tai lieu de chuan hoa van hanh.",
            ctaText: "Tu van tai khoan",
            url: "/dang-ky",
          },
          {
            title: "Tien gui va dong von",
            desc: "Thong diep de trinh bay cac goi tiet kiem, dong von ngan han va su on dinh dong tien.",
            ctaText: "Chinh sua section",
            url: "/admin",
          },
          {
            title: "Tin dung va bao hiem",
            desc: "Mot block mau de doi ten san pham, bo sung quyen loi va gan CTA moi trong admin.",
            ctaText: "Mo page builder",
            url: "/admin",
          },
        ],
      },
      {
        id: "bank-copy",
        type: "text",
        content:
          "Ban co the xem day la bo khung page dich vu tai chinh mac dinh. Trong admin, hay doi tieu de, subtitle, CTA va noi dung tung feature de phu hop voi san pham thuc te cua ban.",
      },
      {
        id: "bank-button",
        type: "button",
        content: {
          text: "Quay ve landing page",
          url: "/",
        },
      },
    ],
  },
  {
    id: "saas-seed",
    title: "Giai phap SaaS",
    slug: "/service/saas",
    status: "published",
    views: "2.1k",
    blocks: [
      {
        id: "saas-hero",
        type: "hero",
        content: {
          title: "Bo khung page SaaS de ban chinh sua theo tung mo hinh kinh doanh",
          subtitle:
            "Dung chung page builder voi landing page giup viec mo rong sang nhieu page con nhat quan hon va khong bi lech giao dien.",
          cta: "Yeu cau demo",
          ctaUrl: "/dang-ky",
          bgImage:
            "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80",
        },
      },
      {
        id: "saas-grid",
        type: "features",
        content: [
          {
            title: "SaaS cho phong tro",
            desc: "Cho thue, chi so, hoa don va thong bao duoc dat trong mot flow de demo nhanh cho khach hang.",
            ctaText: "Sua noi dung",
            url: "/admin",
          },
          {
            title: "POS va ban hang",
            desc: "Seed card nay de ban co the thay doi thanh use case ban le, chuoi cua hang hoac POS noi bo.",
            ctaText: "Cap nhat CTA",
            url: "/admin",
          },
          {
            title: "Accounting / dashboard",
            desc: "Mot card mau cho cac giai phap bao cao, accounting AI va dashboard van hanh.",
            ctaText: "Mo bo builder",
            url: "/admin",
          },
        ],
      },
      {
        id: "saas-columns",
        type: "columns",
        content: {
          left:
            "Cau truc page nay duoc dung bo block chung nen de scale.\n\nBan co the copy page, doi slug va sua tung block de tao landing rieng cho moi line san pham.",
          right:
            "Vi frontend da doc truc tiep tu `pages` config, admin khong con la noi luu du lieu 'cho co' nua.\n\nNo da tro thanh nguon render that su cho page con va landing page.",
        },
      },
      {
        id: "saas-button",
        type: "button",
        content: {
          text: "Mo CMS de chinh sua",
          url: "/admin",
        },
      },
    ],
  },
  {
    id: "register-seed",
    title: "Dang ky Dich vu",
    slug: "/dang-ky",
    status: "published",
    views: "3.2k",
    blocks: [],
  },
];

export function mergeWithDefaultSitePages(pages: SitePage[]): SitePage[] {
  const normalized = Array.isArray(pages) ? [...pages] : [];

  for (const seedPage of defaultSitePages) {
    const exists = normalized.some((page) => {
      const pageSlug = page.slug.startsWith("/") ? page.slug : `/${page.slug}`;
      return pageSlug === seedPage.slug;
    });

    if (!exists) {
      normalized.push(seedPage);
    }
  }

  return normalized;
}

export async function getConfiguredPages(): Promise<SitePage[]> {
  try {
    const { data, error } = await db
      .from("site_config")
      .select("config_value")
      .eq("config_key", "pages")
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Failed to load pages config:", error.message);
      return defaultSitePages;
    }

    return Array.isArray(data?.config_value) && data.config_value.length > 0
      ? mergeWithDefaultSitePages(data.config_value as SitePage[])
      : defaultSitePages;
  } catch (error) {
    console.error("Failed to load pages config:", error);
    return defaultSitePages;
  }
}

export async function getConfiguredPage(slug: string): Promise<SitePage | null> {
  const pages = await getConfiguredPages();
  return (
    pages.find((page) => {
      if (!page?.slug) return false;
      const normalized = page.slug.startsWith("/") ? page.slug : `/${page.slug}`;
      return normalized === slug;
    }) || null
  );
}
