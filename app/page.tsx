import Chatbot from "@/components/Chatbot";
import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* Banker Services Section (Tier 1) - Now serving as the Hero alternative */}
      <section className="bg-surface pt-32 pb-24 border-b border-outline-variant/10">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-4">
                <span className="material-symbols-outlined text-sm">account_balance</span>
                <span className="text-xs font-bold tracking-wider uppercase font-label">Nghiệp vụ Cốt lõi</span>
              </div>
              <h2 className="font-headline font-bold text-3xl md:text-4xl mb-4 text-on-surface">Dịch vụ Tài chính & Ngân hàng</h2>
              <p className="text-on-surface-variant text-lg">Giải pháp tài chính toàn diện, bảo mật và tối ưu hóa dòng vốn cho Cá nhân & Doanh nghiệp.</p>
            </div>
            <Link href="/services/bank" className="group flex items-center gap-2 text-primary font-bold hover:underline">
              Xem tất cả dịch vụ <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </Link>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Core Banker Features - Bento Grid Style */}
            <div className="md:col-span-2 bg-gradient-to-br from-primary to-[#004d45] p-8 md:p-10 rounded-2xl text-on-primary shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 group-hover:bg-white/20 transition-all duration-700"></div>
              <span className="material-symbols-outlined text-4xl mb-6 opacity-80">credit_card</span>
              <h3 className="font-headline font-bold text-2xl mb-3">Tài khoản & Hộ kinh doanh</h3>
              <p className="text-on-primary/80 leading-relaxed max-w-md mb-8">Mở tài khoản thanh toán số đẹp, tài khoản doanh nghiệp và đăng ký Hộ kinh doanh siêu tốc với thủ tục 100% online.</p>
              <div className="flex flex-wrap gap-3">
                <span className="bg-white/20 px-3 py-1 rounded text-xs font-medium backdrop-blur-sm">Tài khoản Thanh toán</span>
                <span className="bg-white/20 px-3 py-1 rounded text-xs font-medium backdrop-blur-sm">Mở Hộ Kinh Doanh</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/20 hover:border-primary/50 transition-colors group">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">savings</span>
              </div>
              <h3 className="font-headline font-bold text-xl mb-3 text-on-surface">Dịch vụ Tiền gửi</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">Giải pháp tiết kiệm linh hoạt, an toàn với lãi suất cạnh tranh, tối ưu hóa nguồn tiền nhàn rỗi.</p>
            </div>

            <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/20 hover:border-primary/50 transition-colors group">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <h3 className="font-headline font-bold text-xl mb-3 text-on-surface">Tín dụng & Cho vay</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">Hỗ trợ vay tiêu dùng, vay mua nhà, vay vốn kinh doanh với hạn mức cao và thời gian giải ngân nhanh chóng.</p>
            </div>

            <div className="md:col-span-2 bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/20 hover:border-primary/50 transition-colors flex flex-col md:flex-row gap-8 items-center">
              <div className="w-16 h-16 bg-secondary/10 shrink-0 rounded-2xl flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-3xl">trending_up</span>
              </div>
              <div>
                <h3 className="font-headline font-bold text-xl mb-2 text-on-surface">Bảo hiểm & Đầu tư Tài chính</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">Bảo vệ rủi ro và gia tăng tài sản bền vững thông qua các chứng chỉ quỹ linh hoạt, trái phiếu và gói bảo hiểm nhân thọ/phi nhân thọ từ các đối tác hàng đầu.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SaaS Services Section (Tier 2) */}
      <section className="bg-surface-container-low py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#e6f6ff] to-transparent pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 text-secondary mb-4">
              <span className="material-symbols-outlined text-sm">code_blocks</span>
              <span className="text-xs font-bold tracking-wider uppercase font-label">Giải pháp Công nghệ</span>
            </div>
            <h2 className="font-headline font-bold text-3xl md:text-4xl mb-6 text-on-surface">Mở rộng bằng <span className="text-secondary">Phần mềm (SaaS)</span></h2>
            <p className="text-on-surface-variant text-lg leading-relaxed">Vượt khỏi giới hạn tài chính truyền thống. Chúng tôi thiết kế và vận hành hệ thống phần mềm chuyên biệt, giúp số hóa hoàn toàn mô hình kinh doanh của bạn.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* SaaS Card 1 */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary mb-5">
                <span className="material-symbols-outlined">app_promo</span>
              </div>
              <h3 className="font-headline font-bold text-lg mb-2 text-on-surface">Tạo App SaaS</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-4">Phát triển phần mềm theo mô hình Đăng ký (Subscription) cho startup và SMEs.</p>
              <Link href="/services/saas" className="text-sm font-bold text-secondary flex items-center gap-1 hover:gap-2 transition-all">
                Khám phá <span className="material-symbols-outlined text-[1rem]">arrow_right_alt</span>
              </Link>
            </div>

            {/* SaaS Card 2 */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary mb-5">
                <span className="material-symbols-outlined">real_estate_agent</span>
              </div>
              <h3 className="font-headline font-bold text-lg mb-2 text-on-surface">Quản lý Nhà trọ</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-4">App cho thuê và quản lý phòng trọ. Tự động thu tiền điện nước, xuất hóa đơn.</p>
              <Link href="/services/rental" className="text-sm font-bold text-secondary flex items-center gap-1 hover:gap-2 transition-all">
                Khám phá <span className="material-symbols-outlined text-[1rem]">arrow_right_alt</span>
              </Link>
            </div>

            {/* SaaS Card 3 */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary mb-5">
                <span className="material-symbols-outlined">storefront</span>
              </div>
              <h3 className="font-headline font-bold text-lg mb-2 text-on-surface">Hỗ trợ Bán hàng</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-4">Phần mềm POS bán lẻ đa kênh, đồng bộ kho hàng và tích hợp thanh toán QR CODE.</p>
              <Link href="/services/pos" className="text-sm font-bold text-secondary flex items-center gap-1 hover:gap-2 transition-all">
                Khám phá <span className="material-symbols-outlined text-[1rem]">arrow_right_alt</span>
              </Link>
            </div>

            {/* SaaS Card 4 */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary mb-5">
                <span className="material-symbols-outlined">account_balance_wallet</span>
              </div>
              <h3 className="font-headline font-bold text-lg mb-2 text-on-surface">Tổng hợp Kế toán</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-4">Nền tảng báo cáo tài chính AI. Phân loại thu chi tự động nhờ kết nối Open Banking trực tiếp.</p>
              <Link href="/services/accounting" className="text-sm font-bold text-secondary flex items-center gap-1 hover:gap-2 transition-all">
                Khám phá <span className="material-symbols-outlined text-[1rem]">arrow_right_alt</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Content Section */}
      <section className="py-24 max-w-7xl mx-auto px-8">
        <div className="flex flex-col md:flex-row gap-16 items-center">
          <div className="md:w-1/2 order-2 md:order-1">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img className="w-full object-cover aspect-video bg-surface-variant" alt="Dashboard" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDYaZbu7UmAZa2LD6WTw5O3wtSYNGFYdmBcLdXWDq-S5J7bXCcpnyrMBjV0TWKmUVCBudqh985acGrMu05Qh9HqTuhxePqkXFmMkzynnoCcKAo2bPC8qr9FtXVEL5Tz2qLin5cHAy0_PW0xRNjfMM1KKOph6oALHErQRayLYX8Mgltu_c0DY0k5imGREcVfiLKVm0hv9JQ0rIgkSTi7EiKrTQOtoD78nPHW3C-ckxzXUvaVBIQUy52BZBOKM6_bRpTT4MNbWK-OggU" />
              <div className="absolute inset-0 bg-primary/10 mix-blend-multiply"></div>
            </div>
          </div>
          <div className="md:w-1/2 order-1 md:order-2">
            <h2 className="font-headline font-extrabold text-4xl mb-6 text-on-surface leading-tight">
              Tính chính xác tuyệt đối của <span className="text-primary">Kiến trúc Sổ cái</span>
            </h2>
            <p className="text-on-surface-variant text-lg leading-relaxed mb-8">
              Mỗi dòng mã và mỗi giao dịch tại Nguyen Page đều được xây dựng trên nguyên tắc minh bạch. Chúng tôi loại bỏ sự phức tạp không cần thiết để mang lại một giao diện biên tập cao cấp, nơi dữ liệu của bạn thực sự biết nói.
            </p>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="text-primary bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">speed</span>
                </div>
                <div>
                  <h4 className="font-bold text-on-surface">Tốc độ vượt trội</h4>
                  <p className="text-sm text-on-surface-variant">Hệ thống xử lý hàng nghìn giao dịch mỗi giây trên hạ tầng đám mây Azure.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-primary bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">architecture</span>
                </div>
                <div>
                  <h4 className="font-bold text-on-surface">Cấu trúc vững chãi</h4>
                  <p className="text-sm text-on-surface-variant">Nền tảng được thiết kế với các lớp bảo mật đa tầng, chống lại mọi rủi ro.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-8 mb-24">
        <div className="bg-primary rounded-3xl p-12 lg:p-20 text-center relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h2 className="font-headline font-extrabold text-3xl lg:text-5xl text-white mb-6">Sẵn sàng để kiến tạo tương lai tài chính?</h2>
            <p className="text-on-primary-container/80 text-lg mb-10 max-w-2xl mx-auto">Đăng ký tài khoản doanh nghiệp ngay hôm nay và nhận gói SaaS Starter miễn phí trong 12 tháng đầu tiên.</p>
            <Link href="/dang-ky" className="bg-white text-primary px-10 py-4 mb-2 rounded-lg font-bold hover:bg-surface-container-lowest transition-all active:scale-95 inline-block">
              Bắt đầu đăng ký ngay
            </Link>
          </div>
          {/* Abstract patterns */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl flex-shrink-0"></div>
          <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-white/10 rounded-full blur-3xl flex-shrink-0"></div>
        </div>
      </section>

      {/* Keep Chatbot */}
      <Chatbot />
    </>
  );
}
