import Link from "next/link";
import { type SitePageBlock } from "@/lib/sitePages";

type HeroContent = {
  title?: string;
  subtitle?: string;
  cta?: string;
  ctaUrl?: string;
  bgImage?: string;
};

type FeatureItem = {
  title?: string;
  desc?: string;
  ctaText?: string;
  url?: string;
};

type ColumnsContent = {
  left?: string;
  right?: string;
};

type ImageContent = {
  src?: string;
  url?: string;
};

type ButtonContent = {
  text?: string;
  url?: string;
};

function renderTextLines(value?: string) {
  return value?.split("\n").map((line, index) => (
    <p key={`${line}-${index}`}>{line || "\u00A0"}</p>
  ));
}

export default function PageBlocksRenderer({
  title,
  blocks,
}: {
  title?: string;
  blocks: SitePageBlock[];
}) {
  return (
    <div className="space-y-10">
      {title ? (
        <div className="space-y-3 text-center">
          <div className="section-kicker mx-auto">
            <span className="material-symbols-outlined text-base">view_compact</span>
            Page Builder
          </div>
          <h1 className="font-headline text-4xl font-extrabold text-on-surface md:text-5xl">
            {title}
          </h1>
        </div>
      ) : null}

      {blocks.map((block) => {
        if (block.type === "hero") {
          const content = (block.content || {}) as HeroContent;
          return (
            <section
              key={block.id}
              className="overflow-hidden rounded-[2rem] border border-outline-variant/60 bg-white shadow-[0_20px_44px_rgba(16,32,51,0.08)]"
            >
              <div
                className="grid gap-8 p-8 md:p-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center"
                style={
                  content.bgImage
                    ? {
                        backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.96), rgba(247,249,254,0.92)), url(${content.bgImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                <div className="space-y-5">
                  <div className="section-kicker">
                    <span className="material-symbols-outlined text-base">rocket_launch</span>
                    Featured section
                  </div>
                  <h2 className="font-headline text-4xl font-extrabold leading-tight text-on-surface md:text-5xl">
                    {content.title || "Hero section"}
                  </h2>
                  <p className="text-base leading-8 text-on-surface-variant md:text-lg">
                    {content.subtitle || "Bo sung mo ta cho section nay trong admin."}
                  </p>
                  {content.cta ? (
                    <Link
                      href={content.ctaUrl || "#"}
                      className="inline-flex items-center gap-2 rounded-full bg-on-surface px-5 py-3 text-sm font-semibold text-white hover:bg-primary"
                    >
                      {content.cta}
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </Link>
                  ) : null}
                </div>

                <div className="rounded-[1.6rem] border border-outline-variant/50 bg-gradient-to-br from-primary/12 to-secondary/12 p-6">
                  <div className="rounded-[1.3rem] bg-white/90 p-5 shadow-sm">
                    <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-primary">
                      Live preview
                    </p>
                    <p className="mt-3 font-headline text-2xl font-bold text-on-surface">
                      {content.title || "Hero section"}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                      {content.subtitle || "Noi dung preview duoc cap nhat truc tiep tu admin."}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        if (block.type === "features") {
          const items = Array.isArray(block.content)
            ? (block.content as FeatureItem[])
            : [];

          return (
            <section key={block.id} className="grid gap-4 md:grid-cols-3">
              {items.map((item, index) => (
                <div
                  key={`${block.id}-${index}`}
                  className="rounded-[1.6rem] border border-outline-variant/60 bg-white p-6 shadow-[0_14px_32px_rgba(16,32,51,0.05)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                    <span className="material-symbols-outlined">auto_awesome</span>
                  </div>
                  <h3 className="mt-5 font-headline text-2xl font-bold text-on-surface">
                    {item.title || `Feature ${index + 1}`}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                    {item.desc || "Bo sung mo ta tai admin builder."}
                  </p>
                  {item.ctaText ? (
                    <Link
                      href={item.url || "#"}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:text-primary"
                    >
                      {item.ctaText}
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </Link>
                  ) : null}
                </div>
              ))}
            </section>
          );
        }

        if (block.type === "columns") {
          const content = (block.content || {}) as ColumnsContent;
          return (
            <section
              key={block.id}
              className="grid gap-6 rounded-[1.8rem] border border-outline-variant/60 bg-white p-6 shadow-[0_16px_32px_rgba(16,32,51,0.05)] md:grid-cols-2"
            >
              <div className="rounded-[1.4rem] bg-surface-container-low p-5 text-sm leading-8 text-on-surface-variant">
                {renderTextLines(content.left || "Cot trai chua co noi dung.")}
              </div>
              <div className="rounded-[1.4rem] bg-surface-container-low p-5 text-sm leading-8 text-on-surface-variant">
                {renderTextLines(content.right || "Cot phai chua co noi dung.")}
              </div>
            </section>
          );
        }

        if (block.type === "header") {
          return (
            <section key={block.id} className="space-y-3 text-center">
              <h2 className="font-headline text-3xl font-extrabold text-on-surface md:text-4xl">
                {String(block.content || "")}
              </h2>
            </section>
          );
        }

        if (block.type === "text") {
          return (
            <section
              key={block.id}
              className="rounded-[1.8rem] border border-outline-variant/60 bg-white p-6 text-base leading-8 text-on-surface-variant shadow-[0_16px_30px_rgba(16,32,51,0.05)]"
            >
              {renderTextLines(String(block.content || ""))}
            </section>
          );
        }

        if (block.type === "image") {
          const content =
            typeof block.content === "object" && block.content !== null
              ? (block.content as ImageContent)
              : ({ src: String(block.content || "") } as ImageContent);

          const image = (
            <img
              src={content.src || ""}
              alt="Page block visual"
              className="h-full w-full rounded-[1.6rem] object-cover"
            />
          );

          return (
            <section key={block.id} className="overflow-hidden rounded-[1.8rem] border border-outline-variant/60 bg-white p-3 shadow-[0_16px_30px_rgba(16,32,51,0.05)]">
              {content.url ? <Link href={content.url}>{image}</Link> : image}
            </section>
          );
        }

        if (block.type === "button") {
          const content =
            typeof block.content === "object" && block.content !== null
              ? (block.content as ButtonContent)
              : ({ text: String(block.content || ""), url: "#" } as ButtonContent);

          return (
            <section key={block.id} className="flex justify-center">
              <Link
                href={content.url || "#"}
                className="inline-flex items-center gap-2 rounded-full bg-on-surface px-6 py-3 text-sm font-semibold text-white hover:bg-primary"
              >
                {content.text || "Learn more"}
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </section>
          );
        }

        return null;
      })}
    </div>
  );
}
