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
    title: "Trang chủ",
    slug: "/",
    status: "published",
    views: "12.5k",
    blocks: [],
  },
  {
    id: "bank-seed",
    title: "Dịch vụ Tài chính",
    slug: "/service/bank",
    status: "published",
    views: "3.4k",
    blocks: [
      {
        id: "bank-hero",
        type: "hero",
        content: {
          title: "Dịch vụ tài chính được trình bày rõ, gọn và chốt nhanh hơn",
          subtitle:
            "Page này đã được seed để admin có thể sửa thông điệp, CTA và bố cục mà không phải dựng lại từ đầu.",
          cta: "Đăng ký nhận tư vấn",
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
            title: "Tài khoản Cá nhân",
            desc: "Khối nội dung mẫu để trình bày mở tài khoản cá nhân, onboarding và CTA dẫn về form đăng ký.",
            ctaText: "Tư vấn ngay",
            url: "/dang-ky",
          },
          {
            title: "Hộ Kinh Doanh",
            desc: "Khối nội dung mẫu cho HKD, giấy tờ, quy trình và lợi ích khi triển khai nhanh từ admin.",
            ctaText: "Mở HKD",
            url: "/dang-ky",
          },
          {
            title: "Tiền gửi, tín dụng, bảo hiểm",
            desc: "Card tổng hợp để admin đổi thông điệp, nhóm sản phẩm hoặc CTA theo từng chiến dịch.",
            ctaText: "Mở admin",
            url: "/admin",
          },
        ],
      },
      {
        id: "bank-copy",
        type: "text",
        content:
          "Đây là page seed cho dịch vụ tài chính. Bạn có thể tiếp tục chia nhỏ khối nội dung, đổi CTA và cấu trúc ngay trong Page Builder.",
      },
      {
        id: "bank-button",
        type: "button",
        content: {
          text: "Quay về landing page",
          url: "/",
        },
      },
    ],
  },
  {
    id: "saas-seed",
    title: "Giải pháp SaaS",
    slug: "/service/saas",
    status: "published",
    views: "2.1k",
    blocks: [
      {
        id: "saas-hero",
        type: "hero",
        content: {
          title: "Bộ khung page SaaS để chỉnh sửa theo từng mô hình kinh doanh",
          subtitle:
            "Dùng chung page builder với page con giúp việc mở rộng sang nhiều trang nhất quán hơn và không bị lệch giao diện.",
          cta: "Yêu cầu demo",
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
            title: "SaaS cho phòng trọ",
            desc: "Khối giới thiệu use case cho thuê, chỉ số, hóa đơn và thông báo.",
            ctaText: "Chỉnh sửa",
            url: "/admin",
          },
          {
            title: "POS và bán hàng",
            desc: "Khối mẫu để thay thế thành use case bán lẻ, chuỗi cửa hàng hoặc quản trị điểm bán.",
            ctaText: "Mở builder",
            url: "/admin",
          },
          {
            title: "Accounting / dashboard",
            desc: "Khối mẫu cho hệ thống báo cáo, accounting AI và dashboard vận hành.",
            ctaText: "Xem admin",
            url: "/admin",
          },
        ],
      },
      {
        id: "saas-columns",
        type: "columns",
        content: {
          left:
            "Cấu trúc page này dùng bộ block chung nên dễ scale. Bạn có thể copy page, đổi slug và sửa từng block để tạo landing riêng cho mỗi line sản phẩm.",
          right:
            "Vì frontend đã đọc trực tiếp từ pages config, admin không còn là nơi lưu dữ liệu cho có nữa. Nó đã trở thành nguồn render thật sự cho page con.",
        },
      },
      {
        id: "saas-button",
        type: "button",
        content: {
          text: "Mở CMS để chỉnh sửa",
          url: "/admin",
        },
      },
    ],
  },
  {
    id: "register-seed",
    title: "Đăng ký Dịch vụ",
    slug: "/dang-ky",
    status: "published",
    views: "3.2k",
    blocks: [],
  },
];

export const defaultLinks = [
  { id: 1, label: "Trang chủ", url: "/", order: 1, visible: true },
  { id: 2, label: "Dịch vụ", url: "/service/bank", order: 2, visible: true },
  { id: 3, label: "Hỗ trợ", url: "/dang-ky", order: 3, visible: true },
  { id: 4, label: "Thông tin quỹ", url: "/fund-intelligence", order: 4, visible: true },
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
