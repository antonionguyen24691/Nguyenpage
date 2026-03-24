"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLink {
  id: number | string;
  label: string;
  url: string;
  order: number;
  visible: boolean;
}

const defaultLinks: NavLink[] = [
  { id: 1, label: "Trang chủ", url: "/", order: 1, visible: true },
  { id: 2, label: "Dịch vụ", url: "/services", order: 2, visible: true },
  { id: 3, label: "Hỗ trợ", url: "/support", order: 3, visible: true },
];

export default function DynamicNav() {
  const [links, setLinks] = useState<NavLink[]>(defaultLinks);
  const pathname = usePathname();

  const loadLinks = () => {
    try {
      const stored = localStorage.getItem("banker_links");
      if (stored) {
        const parsed = JSON.parse(stored) as NavLink[];
        setLinks(parsed.filter((l) => l.visible).sort((a, b) => a.order - b.order));
      }
    } catch {
      /* fallback to defaults */
    }
  };

  useEffect(() => {
    loadLinks();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "banker_links") loadLinks();
    };
    const onCustom = () => loadLinks();

    window.addEventListener("storage", onStorage);
    window.addEventListener("banker_links_updated", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("banker_links_updated", onCustom);
    };
  }, []);

  if (pathname?.startsWith("/admin")) return null;

  return (
    <nav className="bg-[#f3faff]/80 backdrop-blur-md fixed top-0 left-0 z-50 w-full transition-all">
      <div className="flex justify-between items-center px-8 h-16 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Link href="/" className="font-headline font-extrabold text-xl text-[#00685d]">
            Nguyen Page
          </Link>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.id}
              href={link.url}
              className={`font-headline font-semibold text-sm tracking-wide transition-colors duration-200 ${
                pathname === link.url
                  ? "text-[#00685d] font-bold border-b-2 border-[#00685d] pb-1"
                  : "text-[#071e27] opacity-70 hover:text-[#00685d]"
              }`}
            >
              {link.label}
            </Link>
          ))}
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
  );
}
