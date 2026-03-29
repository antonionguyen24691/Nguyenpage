import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter, Manrope, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import DynamicNav from "@/components/DynamicNav";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-headline",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Nguyen Page | Financial Systems & SaaS Studio",
  description:
    "He thong tai chinh va SaaS hien dai cho doanh nghiep can su on dinh, van hanh gon, va trai nghiem dep hon.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`light ${inter.variable} ${jakarta.variable} ${manrope.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full bg-background text-on-surface font-body selection:bg-primary/15"
      >
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute left-[-10%] top-[-12rem] h-[28rem] w-[28rem] rounded-full bg-primary/12 blur-[120px]" />
          <div className="absolute right-[-6%] top-[12rem] h-[22rem] w-[22rem] rounded-full bg-secondary/12 blur-[120px]" />
          <div className="absolute bottom-[-10rem] left-[18%] h-[20rem] w-[20rem] rounded-full bg-tertiary/10 blur-[120px]" />
        </div>

        <DynamicNav />

        <main className="relative flex min-h-screen flex-col pt-20">{children}</main>

        <footer className="mt-auto border-t border-outline-variant/50 bg-white/75 backdrop-blur-xl">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-[1.4fr_0.8fr_0.8fr_1fr] md:px-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 rounded-full border border-outline-variant/70 bg-white/70 px-4 py-2 text-sm font-semibold text-on-surface shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white">
                  NP
                </span>
                Nguyen Page
              </div>
              <p className="max-w-sm text-sm leading-7 text-on-surface-variant">
                Nen tang tai chinh va SaaS duoc lam moi theo huong gon, sang, de van
                hanh va de mo rong hon.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-on-surface-variant">
                He thong
              </p>
              <Link className="block text-sm text-on-surface hover:text-primary" href="/">
                Trang chu
              </Link>
              <Link className="block text-sm text-on-surface hover:text-primary" href="/dang-ky">
                Dang ky
              </Link>
              <Link className="block text-sm text-on-surface hover:text-primary" href="/fund-intelligence">
                Fund Intelligence
              </Link>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-on-surface-variant">
                Dieu huong nhanh
              </p>
              <Link className="block text-sm text-on-surface hover:text-primary" href="/admin">
                CMS Admin
              </Link>
              <Link className="block text-sm text-on-surface hover:text-primary" href="/service/bank">
                Tu van tai chinh
              </Link>
              <Link className="block text-sm text-on-surface hover:text-primary" href="/service/saas">
                Giai phap SaaS
              </Link>
            </div>

            <div className="space-y-4 rounded-3xl border border-outline-variant/60 bg-gradient-to-br from-primary/10 via-white to-secondary/10 p-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary">
                Van hanh moi
              </p>
              <h3 className="font-headline text-xl font-bold text-on-surface">
                Truy cap nhanh vao luong dang ky va dashboard.
              </h3>
              <Link
                href="/dang-ky"
                className="inline-flex items-center gap-2 rounded-full bg-on-surface px-4 py-2 text-sm font-semibold text-white hover:bg-primary"
              >
                Bat dau ngay
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          <div className="border-t border-outline-variant/40 px-6 py-4 text-center text-xs text-on-surface-variant md:px-8">
            © 2026 Nguyen Page. Refined for smoother daily operations.
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
