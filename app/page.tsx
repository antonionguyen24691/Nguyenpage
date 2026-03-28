import Link from "next/link";
import Chatbot from "@/components/Chatbot";
import PageBlocksRenderer from "@/components/PageBlocksRenderer";
import { defaultHomeConfig, type HomeConfig } from "@/lib/homeConfig";
import { getConfiguredPage } from "@/lib/sitePages";
import { db } from "@/packages/db";

export const dynamic = "force-dynamic";

async function getHomeConfig(): Promise<HomeConfig> {
  try {
    const { data, error } = await db
      .from("site_config")
      .select("config_value")
      .eq("config_key", "home")
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Failed to load home config:", error.message);
    }

    if (data?.config_value) {
      return { ...defaultHomeConfig, ...data.config_value };
    }
  } catch (error) {
    console.error("Failed to load home config:", error);
  }

  return defaultHomeConfig;
}

const trustStats = [
  { value: "24h", label: "thoi gian phan hoi uu tien" },
  { value: "99.9%", label: "muc tieu van hanh on dinh" },
  { value: "1 workspace", label: "quan ly tai chinh va SaaS dong nhat" },
];

export default async function Home() {
  const [config, page] = await Promise.all([getHomeConfig(), getConfiguredPage("/")]);

  if (page?.blocks?.length) {
    return (
      <>
        <section className="px-6 pb-24 pt-10 md:px-8 md:pt-16">
          <div className="mx-auto max-w-7xl">
            <PageBlocksRenderer blocks={page.blocks} />
          </div>
        </section>
        <Chatbot />
      </>
    );
  }

  return (
    <>
      <section className="mesh-background relative overflow-hidden px-6 pb-20 pt-10 md:px-8 md:pb-28 md:pt-16">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="space-y-8">
            <div className="section-kicker">
              <span className="material-symbols-outlined text-base">verified</span>
              {config.bankingLabel}
            </div>

            <div className="space-y-5">
              <h1 className="section-title max-w-4xl">
                {config.bankingTitle}{" "}
                <span className="gradient-text">
                  {config.saasTitle} {config.saasTitleHighlight}
                </span>
              </h1>
              <p className="section-copy max-w-2xl">
                {config.bankingDesc}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={config.ctaButtonUrl}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-on-surface px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-on-surface/10 hover:bg-primary"
              >
                {config.ctaButtonText}
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
              <Link
                href={config.bankingViewAllUrl}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-outline-variant/80 bg-white/70 px-6 py-3.5 text-sm font-semibold text-on-surface hover:border-primary/35 hover:text-primary"
              >
                {config.bankingViewAllText}
                <span className="material-symbols-outlined text-[18px]">north_east</span>
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {trustStats.map((stat) => (
                <div key={stat.label} className="panel-card rounded-[1.75rem] px-5 py-4">
                  <p className="font-headline text-2xl font-extrabold text-on-surface">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-card rounded-[2rem] p-5 md:p-7">
            <div className="rounded-[1.75rem] bg-gradient-to-br from-primary via-[#0d8c78] to-secondary p-6 text-white md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/70">
                    Homepage fallback
                  </p>
                  <h2 className="mt-3 max-w-sm font-headline text-3xl font-extrabold leading-tight">
                    Landing page nay dang dung `homeConfig`.
                  </h2>
                </div>
                <div className="rounded-full bg-white/15 px-3 py-2 text-xs font-semibold">
                  Config
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {config.bankingCards.slice(0, 2).map((card) => (
                  <Link
                    key={card.title}
                    href={card.url || "#"}
                    className="rounded-[1.5rem] bg-white/12 p-4 backdrop-blur-sm hover:bg-white/18"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/14">
                      <span className="material-symbols-outlined">{card.icon}</span>
                    </div>
                    <h3 className="mt-4 font-headline text-lg font-bold">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/78">{card.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="space-y-5">
            <div className="section-kicker">
              <span className="material-symbols-outlined text-base">deployed_code</span>
              {config.saasLabel}
            </div>
            <h2 className="section-title">
              {config.saasTitle} <span className="gradient-text">{config.saasTitleHighlight}</span>
            </h2>
            <p className="section-copy">{config.saasDesc}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {config.saasCards.map((card, index) => (
              <Link
                key={card.title}
                href={card.url || "#"}
                className={`group rounded-[1.8rem] border p-6 ${
                  index % 2 === 0
                    ? "border-outline-variant/60 bg-white"
                    : "border-secondary/15 bg-gradient-to-br from-secondary/8 to-white"
                } shadow-[0_14px_28px_rgba(16,32,51,0.05)] hover:-translate-y-1 hover:shadow-[0_22px_44px_rgba(16,32,51,0.09)]`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                  <span className="material-symbols-outlined">{card.icon}</span>
                </div>
                <h3 className="mt-5 font-headline text-xl font-bold text-on-surface">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-on-surface-variant">{card.desc}</p>
                <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-secondary">
                  {card.linkText || "Kham pha"}
                  <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Chatbot />
    </>
  );
}
