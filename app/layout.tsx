import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
});

const manrope = Manrope({
  variable: "--font-headline",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Nguyen Page - Giải pháp Tài chính & SaaS Hiện đại",
  description: "Giải pháp tài chính số và phần mềm dịch vụ đám mây từ Nguyen Page.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`light ${inter.variable} ${manrope.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning className="bg-surface text-on-surface font-body selection:bg-primary/20 min-h-full flex flex-col pt-16">
        {/* Global Navigation */}
        <nav className="bg-[#f3faff]/80 backdrop-blur-md fixed top-0 left-0 z-50 w-full transition-all">
          <div className="flex justify-between items-center px-8 h-16 w-full max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="font-headline font-extrabold text-xl text-[#00685d]">Nguyen Page</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a className="font-headline font-semibold text-sm tracking-wide text-[#00685d] font-bold border-b-2 border-[#00685d] pb-1" href="/">Trang chủ</a>
              <a className="font-headline font-semibold text-sm tracking-wide text-[#071e27] opacity-70 hover:text-[#00685d] transition-colors duration-200" href="/services">Dịch vụ</a>
              <a className="font-headline font-semibold text-sm tracking-wide text-[#071e27] opacity-70 hover:text-[#00685d] transition-colors duration-200" href="/support">Hỗ trợ</a>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 text-[#00685d] hover:bg-[#dbf1fe]/30 rounded-full transition-all flex items-center justify-center">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="p-2 text-[#00685d] hover:bg-[#dbf1fe]/30 rounded-full transition-all flex items-center justify-center">
                <span className="material-symbols-outlined">account_circle</span>
              </button>
            </div>
          </div>
        </nav>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        
        {/* Footer */}
        <footer className="bg-[#f3faff] border-t border-[#bcc9c5]/20 mt-auto">
          <div className="flex flex-col md:flex-row justify-between items-center px-8 py-12 w-full max-w-7xl mx-auto">
            <div className="mb-8 md:mb-0">
              <span className="font-headline text-sm font-bold text-[#071e27] block mb-2">Nguyen Page</span>
              <p className="text-[#071e27]/50 font-body text-xs leading-relaxed max-w-xs">
                Nền tảng tài chính thế hệ mới kết hợp sức mạnh đám mây và sự tin cậy tuyệt đối.
              </p>
            </div>
            <div className="flex gap-8 mb-8 md:mb-0">
              <a className="font-body text-xs leading-relaxed text-[#071e27]/50 hover:underline hover:text-[#00685d]" href="#">Chính sách bảo mật</a>
              <a className="font-body text-xs leading-relaxed text-[#071e27]/50 hover:underline hover:text-[#00685d]" href="#">Điều khoản dịch vụ</a>
              <a className="font-body text-xs leading-relaxed text-[#071e27]/50 hover:underline hover:text-[#00685d]" href="#">Liên hệ</a>
            </div>
            <div className="text-[#071e27]/50 font-body text-xs leading-relaxed">
              © 2026 Nguyen Page. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
