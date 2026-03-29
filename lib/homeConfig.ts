export interface HomeCard {
  title: string;
  desc: string;
  icon: string;
  url: string;
  tags?: { label: string; url: string }[];
  linkText?: string;
}

export interface HomeFeature {
  icon: string;
  title: string;
  desc: string;
}

export interface HomeConfig {
  // Section 1: Banking
  bankingLabel: string;
  bankingTitle: string;
  bankingDesc: string;
  bankingViewAllText: string;
  bankingViewAllUrl: string;
  bankingCards: HomeCard[];

  // Section 2: SaaS
  saasLabel: string;
  saasTitle: string;
  saasTitleHighlight: string;
  saasDesc: string;
  saasCards: HomeCard[];

  // Section 3: Dynamic Content
  dynamicImage: string;
  dynamicTitle: string;
  dynamicTitleHighlight: string;
  dynamicDesc: string;
  dynamicFeatures: HomeFeature[];

  // Section 4: CTA
  ctaTitle: string;
  ctaDesc: string;
  ctaButtonText: string;
  ctaButtonUrl: string;
}

export const defaultHomeConfig: HomeConfig = {
  // Section 1
  bankingLabel: "Nghiệp vụ Cốt lõi",
  bankingTitle: "Dịch vụ Tài chính & Ngân hàng",
  bankingDesc: "Giải pháp tài chính toàn diện, bảo mật và tối ưu hóa dòng vốn cho Cá nhân & Doanh nghiệp.",
  bankingViewAllText: "Xem tất cả dịch vụ",
  bankingViewAllUrl: "/service/bank",
  bankingCards: [
    {
      title: "Tài khoản & Hộ kinh doanh",
      desc: "Mở tài khoản thanh toán số đẹp, tài khoản doanh nghiệp và đăng ký Hộ kinh doanh siêu tốc với thủ tục 100% online.",
      icon: "credit_card",
      url: "/dang-ky",
      tags: [
        { label: "Mở tài khoản Cá nhân", url: "/dang-ky" },
        { label: "Mở HKD", url: "/dang-ky" },
      ],
    },
    {
      title: "Dịch vụ Tiền gửi",
      desc: "Giải pháp tiết kiệm linh hoạt, an toàn với lãi suất cạnh tranh, tối ưu hóa nguồn tiền nhàn rỗi.",
      icon: "savings",
      url: "/service/bank",
    },
    {
      title: "Tín dụng & Cho vay",
      desc: "Hỗ trợ vay tiêu dùng, vay mua nhà, vay vốn kinh doanh với hạn mức cao và thời gian giải ngân nhanh chóng.",
      icon: "payments",
      url: "/service/bank",
    },
    {
      title: "Bảo hiểm & Đầu tư Tài chính",
      desc: "Bảo vệ rủi ro và gia tăng tài sản bền vững thông qua các chứng chỉ quỹ linh hoạt, trái phiếu và gói bảo hiểm nhân thọ/phi nhân thọ từ các đối tác hàng đầu.",
      icon: "trending_up",
      url: "/service/bank",
    },
  ],

  // Section 2
  saasLabel: "Giải pháp Công nghệ",
  saasTitle: "Mở rộng bằng",
  saasTitleHighlight: "Phần mềm (SaaS)",
  saasDesc: "Vượt khỏi giới hạn tài chính truyền thống. Chúng tôi thiết kế và vận hành hệ thống phần mềm chuyên biệt, giúp số hóa hoàn toàn mô hình kinh doanh của bạn.",
  saasCards: [
    { title: "Tạo App SaaS", desc: "Phát triển phần mềm theo mô hình Đăng ký (Subscription) cho startup và SMEs.", icon: "app_promo", url: "/service/saas", linkText: "Khám phá" },
    { title: "Quản lý Nhà trọ", desc: "App cho thuê và quản lý phòng trọ. Tự động thu tiền điện nước, xuất hóa đơn.", icon: "real_estate_agent", url: "/service/rental", linkText: "Khám phá" },
    { title: "Hỗ trợ Bán hàng", desc: "Phần mềm POS bán lẻ đa kênh, đồng bộ kho hàng và tích hợp thanh toán QR CODE.", icon: "storefront", url: "/service/pos", linkText: "Khám phá" },
    { title: "Tổng hợp Kế toán", desc: "Nền tảng báo cáo tài chính AI. Phân loại thu chi tự động nhờ kết nối Open Banking trực tiếp.", icon: "account_balance_wallet", url: "/service/accounting", linkText: "Khám phá" },
  ],

  // Section 3
  dynamicImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuDYaZbu7UmAZa2LD6WTw5O3wtSYNGFYdmBcLdXWDq-S5J7bXCcpnyrMBjV0TWKmUVCBudqh985acGrMu05Qh9HqTuhxePqkXFmMkzynnoCcKAo2bPC8qr9FtXVEL5Tz2qLin5cHAy0_PW0xRNjfMM1KKOph6oALHErQRayLYX8Mgltu_c0DY0k5imGREcVfiLKVm0hv9JQ0rIgkSTi7EiKrTQOtoD78nPHW3C-ckxzXUvaVBIQUy52BZBOKM6_bRpTT4MNbWK-OggU",
  dynamicTitle: "Tính chính xác tuyệt đối của",
  dynamicTitleHighlight: "Kiến trúc Sổ cái",
  dynamicDesc: "Mỗi dòng mã và mỗi giao dịch tại Nguyen Page đều được xây dựng trên nguyên tắc minh bạch. Chúng tôi loại bỏ sự phức tạp không cần thiết để mang lại một giao diện biên tập cao cấp, nơi dữ liệu của bạn thực sự biết nói.",
  dynamicFeatures: [
    { icon: "speed", title: "Tốc độ vượt trội", desc: "Hệ thống xử lý hàng nghìn giao dịch mỗi giây trên hạ tầng đám mây Azure." },
    { icon: "architecture", title: "Cấu trúc vững chãi", desc: "Nền tảng được thiết kế với các lớp bảo mật đa tầng, chống lại mọi rủi ro." },
  ],

  // Section 4
  ctaTitle: "Sẵn sàng để kiến tạo tương lai tài chính?",
  ctaDesc: "Đăng ký tài khoản doanh nghiệp ngay hôm nay và nhận gói SaaS Starter miễn phí trong 12 tháng đầu tiên.",
  ctaButtonText: "Bắt đầu đăng ký ngay",
  ctaButtonUrl: "/dang-ky",
};
