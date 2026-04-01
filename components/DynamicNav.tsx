"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface NavLink {
  id: number | string;
  label: string;
  url: string;
  order: number;
  visible: boolean;
}

const defaultLinks: NavLink[] = [
  { id: 1, label: "Trang chu", url: "/", order: 1, visible: true },
  { id: 2, label: "Dich vu", url: "/service/bank", order: 2, visible: true },
  { id: 3, label: "Advisor", url: "/advisor", order: 3, visible: true },
  { id: 4, label: "Ho tro", url: "/dang-ky", order: 4, visible: true },
  { id: 5, label: "Thong tin quy", url: "/fund-intelligence", order: 5, visible: true },
];

const advisorLink = defaultLinks.find((link) => link.url === "/advisor")!;

function normalizeUrl(url: string) {
  if (!url) return "/";
  if (url === "/") return "/";
  return url.replace(/\/+$/, "");
}

export default function DynamicNav() {
  const [links, setLinks] = useState<NavLink[]>(defaultLinks);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const loadLinks = async () => {
      try {
        const res = await fetch("/api/config?key=links");
        const data = await res.json();

        if (data.value && Array.isArray(data.value)) {
          const parsed = data.value as NavLink[];
          const merged = [...parsed];
          const hasAdvisor = merged.some((link) => normalizeUrl(link.url) === "/advisor");

          if (!hasAdvisor) {
            merged.push(advisorLink);
          }

          setLinks(merged.filter((link) => link.visible).sort((a, b) => a.order - b.order));
          return;
        }
      } catch {
        // fall back to default links
      }

      setLinks(defaultLinks);
    };

    loadLinks();
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 top-0 z-50 px-4 py-4 md:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-[1.75rem] border border-white/70 bg-white/75 px-4 py-3 shadow-[0_18px_50px_rgba(16,32,51,0.08)] backdrop-blur-xl md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-sm font-extrabold text-white shadow-lg shadow-primary/20">
              NP
            </span>
            <div>
              <p className="font-headline text-base font-extrabold text-on-surface md:text-lg">
                Nguyen Page
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
                Financial Systems
              </p>
            </div>
          </Link>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {links.map((link) => {
            const active = pathname === link.url;
            return (
              <Link
                key={link.id}
                href={link.url}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  active
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="rounded-full border border-outline-variant/70 bg-surface-container px-3 py-2 text-xs font-semibold text-on-surface-variant">
            Khong gian truc tuyen
          </div>
          <Link
            href="/advisor"
            className="inline-flex items-center gap-2 rounded-full bg-on-surface px-4 py-2 text-sm font-semibold text-white hover:bg-primary"
          >
            Tu van ngay
            <span className="material-symbols-outlined text-[18px]">north_east</span>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-outline-variant/70 bg-white text-on-surface lg:hidden"
          aria-label="Bat tat dieu huong"
        >
          <span className="material-symbols-outlined">{open ? "close" : "menu"}</span>
        </button>
      </div>

      {open && (
        <div className="mx-auto mt-3 max-w-7xl rounded-[1.75rem] border border-white/70 bg-white/90 p-4 shadow-[0_20px_55px_rgba(16,32,51,0.1)] backdrop-blur-xl lg:hidden">
          <div className="space-y-2">
            {links.map((link) => {
              const active = pathname === link.url;
              return (
                <Link
                  key={link.id}
                  href={link.url}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold ${
                    active
                      ? "bg-primary text-white"
                      : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                  }`}
                >
                  {link.label}
                  <span className="material-symbols-outlined text-[18px]">arrow_outward</span>
                </Link>
              );
            })}
          </div>
          <Link
            href="/advisor"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-on-surface px-4 py-3 text-sm font-semibold text-white hover:bg-primary"
          >
            Bat dau tu van
            <span className="material-symbols-outlined text-[18px]">bolt</span>
          </Link>
        </div>
      )}
    </nav>
  );
}
