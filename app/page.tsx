import Link from "next/link";
import Chatbot from "@/components/Chatbot";
import { defaultHomeConfig, type HomeConfig } from "@/lib/homeConfig";
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
  const config = await getHomeConfig();
  const featureCards = config.dynamicFeatures.slice(0, 3);

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
                Nen tang tai chinh va SaaS duoc lam moi de{" "}
                <span className="gradient-text">van hanh dep, nhanh, ro rang hon</span>.
              </h1>
              <p className="section-copy max-w-2xl">
                {config.bankingDesc} Chung toi gom tu van tai chinh, quy trinh dang ky
                va dashboard van hanh vao mot trai nghiem gon, sang va de mo rong.
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
                <div
                  key={stat.label}
                  className="panel-card rounded-[1.75rem] px-5 py-4"
                >
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

          <div className="relative">
            <div className="absolute -left-8 top-10 h-32 w-32 rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-secondary/15 blur-3xl" />
            <div className="panel-card relative overflow-hidden rounded-[2rem] p-5 md:p-7">
              <div className="rounded-[1.75rem] bg-gradient-to-br from-primary via-[#0d8c78] to-secondary p-6 text-white md:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/70">
                      Control tower
                    </p>
                    <h2 className="mt-3 max-w-sm font-headline text-3xl font-extrabold leading-tight">
                      Mot giao dien dep hon cho quy trinh tai chinh va system delivery.
                    </h2>
                  </div>
                  <div className="rounded-2xl bg-white/15 px-3 py-2 text-xs font-semibold">
                    Live
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

              <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[1.6rem] border border-outline-variant/70 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-on-surface-variant">
                        Service stack
                      </p>
                      <p className="mt-2 font-headline text-xl font-bold text-on-surface">
                        {config.saasTitle} {config.saasTitleHighlight}
                      </p>
                    </div>
                    <span className="material-symbols-outlined rounded-full bg-secondary/10 p-2 text-secondary">
                      hub
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {config.saasCards.slice(0, 3).map((card) => (
                      <div
                        key={card.title}
                        className="rounded-2xl border border-outline-variant/50 bg-surface-container-low px-4 py-3"
                      >
                        <div className="flex items-start gap-3">
                          <span className="material-symbols-outlined mt-0.5 text-secondary">
                            {card.icon}
                          </span>
                          <div>
                            <p className="font-semibold text-on-surface">{card.title}</p>
                            <p className="text-sm leading-6 text-on-surface-variant">
                              {card.desc}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.6rem] border border-outline-variant/70 bg-surface-container-low p-5">
                  <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-primary">
                    Van hanh nhanh
                  </p>
                  <div className="mt-4 space-y-4">
                    {featureCards.map((feature) => (
                      <div key={feature.title} className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <span className="material-symbols-outlined">{feature.icon}</span>
                        </div>
                        <p className="mt-3 font-semibold text-on-surface">{feature.title}</p>
                        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                          {feature.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-8 md:px-8 md:py-12">
        <div className="mx-auto grid max-w-7xl gap-4 rounded-[2rem] border border-outline-variant/60 bg-white/72 p-5 shadow-[0_18px_36px_rgba(16,32,51,0.06)] backdrop-blur-xl md:grid-cols-4 md:p-6">
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
              <h3 className="mt-6 font-headline text-xl font-bold">{card.title}</h3>
              <p
                className={`mt-2 text-sm leading-6 ${
                  index === 0 ? "text-white/80" : "text-on-surface-variant"
                }`}
              >
                {card.desc}
              </p>
            </Link>
          ))}
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

      <section className="px-6 py-8 md:px-8 md:py-12">
        <div className="mx-auto grid max-w-7xl gap-10 rounded-[2rem] border border-outline-variant/60 bg-white/78 p-6 shadow-[0_18px_36px_rgba(16,32,51,0.06)] backdrop-blur-xl lg:grid-cols-[1fr_0.96fr] lg:items-center lg:p-8">
          <div className="overflow-hidden rounded-[1.8rem] bg-surface-container-low">
            <img
              src={config.dynamicImage}
              alt="Dashboard preview"
              className="h-full min-h-[300px] w-full object-cover"
            />
          </div>
          <div className="space-y-6">
            <div className="section-kicker">
              <span className="material-symbols-outlined text-base">dashboard_customize</span>
              Digital clarity
            </div>
            <h2 className="section-title text-[clamp(2rem,3.2vw,3.3rem)]">
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
                  Mo CMS Admin
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                </Link>
              </div>
              <div className="mt-5 rounded-[1.5rem] bg-black/12 p-4 text-sm leading-7 text-white/74">
                UI duoc lam gon hon, dieu huong ro hon, va thanh phan van hanh duoc
                dong nhat de he thong truong thanh hon trong qua trinh demo va deploy.
              </div>
            </div>
          </div>
        </div>
      </section>

      <Chatbot />
    </>
  );
}
