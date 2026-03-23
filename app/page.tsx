"use client";

import { useState, useEffect } from "react";
import Chatbot from "@/components/Chatbot";
import Link from "next/link";
import { defaultHomeConfig, type HomeConfig } from "@/lib/homeConfig";

export default function Home() {
  const [config, setConfig] = useState<HomeConfig>(defaultHomeConfig);

  useEffect(() => {
    const stored = localStorage.getItem("banker_home");
    if (stored) {
      try {
        setConfig({ ...defaultHomeConfig, ...JSON.parse(stored) });
      } catch {
        // fallback to defaults
      }
    }
  }, []);

  const c = config;

  return (
    <>
      {/* ─── Section 1: Banking Services ─── */}
      <section className="bg-surface pt-32 pb-24 border-b border-outline-variant/10">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-4">
                <span className="material-symbols-outlined text-sm">account_balance</span>
                <span className="text-xs font-bold tracking-wider uppercase font-label">{c.bankingLabel}</span>
              </div>
              <h2 className="font-headline font-bold text-3xl md:text-4xl mb-4 text-on-surface">{c.bankingTitle}</h2>
              <p className="text-on-surface-variant text-lg">{c.bankingDesc}</p>
            </div>
            <Link href={c.bankingViewAllUrl} className="group flex items-center gap-2 text-primary font-bold hover:underline">
              {c.bankingViewAllText} <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </Link>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Hero Card (first banking card) */}
            {c.bankingCards[0] && (
              <Link href={c.bankingCards[0].url || "#"} className="md:col-span-2 bg-gradient-to-br from-primary to-[#004d45] p-8 md:p-10 rounded-2xl text-on-primary shadow-xl relative overflow-hidden group cursor-pointer block">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 group-hover:bg-white/20 transition-all duration-700"></div>
                <span className="material-symbols-outlined text-4xl mb-6 opacity-80">{c.bankingCards[0].icon}</span>
                <h3 className="font-headline font-bold text-2xl mb-3">{c.bankingCards[0].title}</h3>
                <p className="text-on-primary/80 leading-relaxed max-w-md mb-8">{c.bankingCards[0].desc}</p>
                <div className="flex flex-wrap gap-3">
                  {c.bankingCards[0].tags?.map((tag, ti) => (
                    <span key={ti} className="bg-white/20 px-3 py-1 rounded text-xs font-medium backdrop-blur-sm hover:bg-white/30 transition-colors">
                      {tag.label}
                    </span>
                  ))}
                </div>
              </Link>
            )}

            {/* Remaining banking cards */}
            {c.bankingCards.slice(1, 3).map((card, i) => (
              <Link key={i} href={card.url || "#"} className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/20 hover:border-primary/50 transition-colors group cursor-pointer block">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">{card.icon}</span>
                </div>
                <h3 className="font-headline font-bold text-xl mb-3 text-on-surface">{card.title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{card.desc}</p>
              </Link>
            ))}

            {/* Last banking card (wide) */}
            {c.bankingCards[3] && (
              <Link href={c.bankingCards[3].url || "#"} className="md:col-span-2 bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/20 hover:border-primary/50 transition-colors flex flex-col md:flex-row gap-8 items-center cursor-pointer block">
                <div className="w-16 h-16 bg-secondary/10 shrink-0 rounded-2xl flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-3xl">{c.bankingCards[3].icon}</span>
                </div>
                <div>
                  <h3 className="font-headline font-bold text-xl mb-2 text-on-surface">{c.bankingCards[3].title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{c.bankingCards[3].desc}</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ─── Section 2: SaaS Services ─── */}
      <section className="bg-surface-container-low py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#e6f6ff] to-transparent pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 text-secondary mb-4">
              <span className="material-symbols-outlined text-sm">code_blocks</span>
              <span className="text-xs font-bold tracking-wider uppercase font-label">{c.saasLabel}</span>
            </div>
            <h2 className="font-headline font-bold text-3xl md:text-4xl mb-6 text-on-surface">{c.saasTitle} <span className="text-secondary">{c.saasTitleHighlight}</span></h2>
            <p className="text-on-surface-variant text-lg leading-relaxed">{c.saasDesc}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {c.saasCards.map((card, i) => (
              <div key={i} className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary mb-5">
                  <span className="material-symbols-outlined">{card.icon}</span>
                </div>
                <h3 className="font-headline font-bold text-lg mb-2 text-on-surface">{card.title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed mb-4">{card.desc}</p>
                <Link href={card.url || "#"} className="text-sm font-bold text-secondary flex items-center gap-1 hover:gap-2 transition-all">
                  {card.linkText || "Khám phá"} <span className="material-symbols-outlined text-[1rem]">arrow_right_alt</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 3: Dynamic Content ─── */}
      <section className="py-24 max-w-7xl mx-auto px-8">
        <div className="flex flex-col md:flex-row gap-16 items-center">
          <div className="md:w-1/2 order-2 md:order-1">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img className="w-full object-cover aspect-video bg-surface-variant" alt="Dashboard" src={c.dynamicImage} />
              <div className="absolute inset-0 bg-primary/10 mix-blend-multiply"></div>
            </div>
          </div>
          <div className="md:w-1/2 order-1 md:order-2">
            <h2 className="font-headline font-extrabold text-4xl mb-6 text-on-surface leading-tight">
              {c.dynamicTitle} <span className="text-primary">{c.dynamicTitleHighlight}</span>
            </h2>
            <p className="text-on-surface-variant text-lg leading-relaxed mb-8">{c.dynamicDesc}</p>
            <div className="space-y-6">
              {c.dynamicFeatures.map((feat, i) => (
                <div key={i} className="flex gap-4">
                  <div className="text-primary bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined">{feat.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">{feat.title}</h4>
                    <p className="text-sm text-on-surface-variant">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 4: CTA ─── */}
      <section className="max-w-7xl mx-auto px-8 mb-24">
        <div className="bg-primary rounded-3xl p-12 lg:p-20 text-center relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h2 className="font-headline font-extrabold text-3xl lg:text-5xl text-white mb-6">{c.ctaTitle}</h2>
            <p className="text-on-primary-container/80 text-lg mb-10 max-w-2xl mx-auto">{c.ctaDesc}</p>
            <Link href={c.ctaButtonUrl} className="bg-white text-primary px-10 py-4 mb-2 rounded-lg font-bold hover:bg-surface-container-lowest transition-all active:scale-95 inline-block">
              {c.ctaButtonText}
            </Link>
          </div>
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl flex-shrink-0"></div>
          <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-white/10 rounded-full blur-3xl flex-shrink-0"></div>
        </div>
      </section>

      <Chatbot />
    </>
  );
}
