import Link from "next/link";
import Chatbot from "@/components/Chatbot";
import { defaultHomeConfig, type HomeConfig } from "@/lib/homeConfig";
import { getConfigValue } from "@/lib/siteConfigStore";

export const dynamic = "force-dynamic";

async function getHomeConfig(): Promise<HomeConfig> {
  const value = await getConfigValue("home", defaultHomeConfig);
  return { ...defaultHomeConfig, ...value };
}

export default async function Home() {
  const config = await getHomeConfig();

  return (
    <>
      <section className="bg-surface pt-10 md:pt-16">
        <div className="mx-auto max-w-7xl px-6 md:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-8">
              <div className="section-kicker">
                <span className="material-symbols-outlined text-base">verified</span>
                {config.bankingLabel}
              </div>

              <div className="space-y-5">
                <h1 className="section-title max-w-4xl">{config.bankingTitle}</h1>
                <p className="section-copy max-w-2xl">{config.bankingDesc}</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={config.ctaButtonUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-on-surface px-6 py-3.5 text-sm font-semibold text-white hover:bg-primary"
                >
                  {config.ctaButtonText}
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
                <Link
                  href={config.bankingViewAllUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-outline-variant/80 bg-white px-6 py-3.5 text-sm font-semibold text-on-surface hover:border-primary/35 hover:text-primary"
                >
                  {config.bankingViewAllText}
                  <span className="material-symbols-outlined text-[18px]">north_east</span>
                </Link>
              </div>
            </div>

            <div className="panel-card rounded-[2rem] p-4 md:p-5">
              <div className="grid gap-4 md:grid-cols-2">
                {config.bankingCards.slice(0, 4).map((card, index) => (
                  <Link
                    key={card.title}
                    href={card.url || "#"}
                    className={`rounded-[1.6rem] p-5 ${
                      index === 0
                        ? "bg-gradient-to-br from-primary to-secondary text-white"
                        : "bg-surface-container-low hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                          index === 0 ? "bg-white/18" : "bg-primary/10 text-primary"
                        }`}
                      >
                        <span className="material-symbols-outlined">{card.icon}</span>
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] opacity-75">
                        0{index + 1}
                      </span>
                    </div>
                    <h2 className="mt-6 font-headline text-2xl font-bold">{card.title}</h2>
                    <p
                      className={`mt-3 text-sm leading-7 ${
                        index === 0 ? "text-white/82" : "text-on-surface-variant"
                      }`}
                    >
                      {card.desc}
                    </p>

                    {card.tags?.length ? (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {card.tags.map((tag) => (
                          <Link
                            key={`${card.title}-${tag.label}`}
                            href={tag.url || card.url || "#"}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                              index === 0
                                ? "bg-white/15 text-white hover:bg-white/25"
                                : "bg-primary/10 text-primary hover:bg-primary/15"
                            }`}
                          >
                            {tag.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-outline-variant/60 bg-white/76 p-5 shadow-[0_18px_36px_rgba(16,32,51,0.06)] backdrop-blur-xl md:p-6">
          <div className="grid gap-6 md:grid-cols-4">
            {config.bankingCards.map((card, index) => (
              <Link
                key={card.title}
                href={card.url || "#"}
                className={`rounded-[1.5rem] p-5 ${
                  index === 0
                    ? "bg-gradient-to-br from-primary to-secondary text-white"
                    : "bg-surface-container-low hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                      index === 0 ? "bg-white/18" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{card.icon}</span>
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] opacity-75">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-5 font-headline text-xl font-bold">{card.title}</h3>
                <p
                  className={`mt-3 text-sm leading-7 ${
                    index === 0 ? "text-white/82" : "text-on-surface-variant"
                  }`}
                >
                  {card.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-8 md:px-8 md:py-12">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
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
                  {card.linkText || "Khám phá"}
                  <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 rounded-[2rem] border border-outline-variant/60 bg-white/78 p-6 shadow-[0_18px_36px_rgba(16,32,51,0.06)] backdrop-blur-xl lg:grid-cols-[1fr_0.96fr] lg:items-center lg:p-8">
          <div className="overflow-hidden rounded-[1.8rem] bg-surface-container-low">
            <img
              src={config.dynamicImage}
              alt="Dashboard preview"
              className="h-full min-h-[320px] w-full object-cover"
            />
          </div>
          <div className="space-y-6">
            <div className="section-kicker">
              <span className="material-symbols-outlined text-base">dashboard_customize</span>
              Digital clarity
            </div>
            <h2 className="section-title text-[clamp(2rem,3.2vw,3.4rem)]">
              {config.dynamicTitle}{" "}
              <span className="gradient-text">{config.dynamicTitleHighlight}</span>
            </h2>
            <p className="section-copy">{config.dynamicDesc}</p>
            <div className="grid gap-4">
              {config.dynamicFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-[1.4rem] border border-outline-variant/60 bg-surface-container-low px-5 py-4"
                >
                  <div className="flex gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <span className="material-symbols-outlined">{feature.icon}</span>
                    </span>
                    <div>
                      <h3 className="font-semibold text-on-surface">{feature.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 pt-16 md:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-on-surface via-[#17324f] to-secondary px-6 py-10 text-white shadow-[0_28px_70px_rgba(16,32,51,0.2)] md:px-10 md:py-14">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.74fr] lg:items-center">
            <div className="space-y-5">
              <div className="section-kicker border-white/15 bg-white/10 text-white">
                <span className="material-symbols-outlined text-base">rocket_launch</span>
                Launch support
              </div>
              <h2 className="font-headline text-4xl font-extrabold leading-tight md:text-5xl">
                {config.ctaTitle}
              </h2>
              <p className="max-w-2xl text-base leading-8 text-white/76">{config.ctaDesc}</p>
            </div>

            <div className="rounded-[2rem] bg-white/10 p-5 backdrop-blur-md">
              <div className="grid gap-3">
                <Link
                  href={config.ctaButtonUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-on-surface hover:bg-primary-container"
                >
                  {config.ctaButtonText}
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/18 px-5 py-3.5 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Mở CMS Admin
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Chatbot />
    </>
  );
}
